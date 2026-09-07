/**
 * Device Bridge - WebSocket relay between web UI and ESP32 devices.
 *
 * Client roles:
 *   - "device": ESP32 connects to /ws/device, registers, receives commands,
 *               sends acks + telemetry
 *   - "panel":  browser connects to /ws/panel, receives live device state,
 *               telemetry and command log updates
 *
 * Supports MULTIPLE devices registered under distinct deviceIds (e.g. a real
 * ESP32 and a test simulator at the same time). Command/telemetry focus is on
 * the preferred device: real hardware (kind !== simulator) always wins.
 */

import crypto from 'crypto';
import { WebSocketServer } from 'ws';

// ---------------------------------------------------------------------------
// Auth token: must be provided in production; auto-generated in development
// so no secret is ever hardcoded/committed.
// ---------------------------------------------------------------------------
function resolveDeviceToken() {
  const token = process.env.DEVICE_AUTH_TOKEN;
  if (typeof token === 'string' && token.length > 0) return token;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[Bridge] DEVICE_AUTH_TOKEN is not set. Refusing to start in production with a default/generated token. ' +
      'Set DEVICE_AUTH_TOKEN in your environment (see .env.example).'
    );
  }

  const generated = crypto.randomBytes(24).toString('hex');
  console.warn('[Bridge] DEVICE_AUTH_TOKEN not set - generated a random development token.');
  console.warn(`[Bridge] Dev token (pass to devices/simulator): ${generated}`);
  return generated;
}

const TOKEN = resolveDeviceToken();

// Constant-time token comparison (lengths normalized via sha256 digest).
function tokenMatches(candidate) {
  if (typeof candidate !== 'string') return false;
  const expected = crypto.createHash('sha256').update(TOKEN).digest();
  const provided = crypto.createHash('sha256').update(candidate).digest();
  return crypto.timingSafeEqual(expected, provided);
}

const CMD_TIMEOUT_MS = 5000;
const MAX_LOG_ENTRIES = 100;
const REGISTRATION_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// State: deviceId -> { ws, meta, lastSeen, lastTelemetry }
// ---------------------------------------------------------------------------
const devices = new Map();
const panels = new Set();
const pendingCommands = new Map(); // cmd_id -> { deviceId, timer, resolve }
const commandLog = [];

function broadcastToPanels(message) {
  const data = JSON.stringify(message);
  for (const ws of panels) {
    if (ws.readyState === 1) ws.send(data);
  }
}

function pushLog(entry) {
  commandLog.unshift(entry);
  if (commandLog.length > MAX_LOG_ENTRIES) commandLog.pop();
  broadcastToPanels({ type: 'command_log', entry });
}

// The device commands are routed to: prefer real hardware over simulators,
// then the most recently seen device.
function preferredDeviceId() {
  let best = null;
  let bestScore = -Infinity;
  for (const [id, dev] of devices) {
    if (dev.ws.readyState !== 1) continue;
    const isSim = (dev.meta?.kind || '').includes('sim');
    const score = (isSim ? 0 : 100) + dev.lastSeenTs / 1e12;
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

function snapshot() {
  const preferred = preferredDeviceId();
  const list = [];
  // Preferred device first so back-compat consumers use it
  if (preferred && devices.has(preferred)) {
    const dev = devices.get(preferred);
    list.push({
      deviceId: preferred,
      meta: dev.meta,
      lastSeen: new Date(dev.lastSeenTs).toISOString(),
      telemetry: dev.lastTelemetry ? { ...dev.lastTelemetry, deviceId: preferred } : null,
    });
  }
  for (const [id, dev] of devices) {
    if (id === preferred || dev.ws.readyState !== 1) continue;
    list.push({
      deviceId: id,
      meta: dev.meta,
      lastSeen: new Date(dev.lastSeenTs).toISOString(),
      telemetry: dev.lastTelemetry ? { ...dev.lastTelemetry, deviceId: id } : null,
    });
  }
  return {
    type: 'device_state',
    online: list.length > 0,
    preferred,
    devices: list,
    // Back-compat fields for older panels
    deviceId: list[0]?.deviceId || null,
    telemetry: list[0]?.telemetry || null,
  };
}

// ---------------------------------------------------------------------------
// Device connection handling
// ---------------------------------------------------------------------------
function handleDeviceMessage(deviceId, ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }

  const dev = devices.get(deviceId);
  if (!dev) return;

  switch (msg.type) {
    case 'telemetry': {
      dev.lastSeenTs = Date.now();
      dev.lastTelemetry = {
        led: !!msg.led,
        blinking: !!msg.blinking,
        rssi: msg.rssi ?? null,
        uptime_s: msg.uptime_s ?? null,
        heap: msg.heap ?? null,
        commands: msg.commands ?? 0,
        receivedAt: new Date(dev.lastSeenTs).toISOString(),
      };
      broadcastToPanels({
        type: 'telemetry',
        deviceId,
        telemetry: { ...dev.lastTelemetry, deviceId },
      });
      break;
    }

    case 'ack': {
      const pending = pendingCommands.get(msg.cmd_id);
      if (pending) {
        clearTimeout(pending.timer);
        pendingCommands.delete(msg.cmd_id);
        pending.resolve({
          delivered: true,
          acked: true,
          latencyMs: Date.now() - pending.sentAt,
          led: msg.led,
          blinking: msg.blinking,
        });
      }
      pushLog({
        ts: new Date().toISOString(),
        event: 'ack',
        deviceId,
        cmdId: msg.cmd_id,
        action: msg.action,
        status: msg.status || 'ok',
        led: msg.led,
        blinking: msg.blinking,
      });
      break;
    }

    default:
      break;
  }
}

function deviceDisconnected(deviceId) {
  const dev = devices.get(deviceId);
  if (!dev) return;
  console.log(`[Bridge] Device disconnected: ${deviceId}`);
  devices.delete(deviceId);

  // Fail that device's pending commands
  for (const [cmdId, pending] of pendingCommands) {
    if (pending.deviceId !== deviceId) continue;
    clearTimeout(pending.timer);
    pending.resolve({ delivered: false, acked: false, reason: 'device_disconnected' });
    pendingCommands.delete(cmdId);
  }

  pushLog({ ts: new Date().toISOString(), event: 'device_offline', deviceId });
  broadcastToPanels(snapshot());
}

// ---------------------------------------------------------------------------
// Command execution (called from REST)
// ---------------------------------------------------------------------------
// Per-action allowlist for client-supplied params. Any key outside the
// allowlist is rejected, so reserved protocol fields (type, cmd_id, action)
// can never be smuggled through. `speed` range mirrors the firmware guard
// (esp32_led.ino accepts 50..5000 ms). `deviceId` is routing-only and is
// stripped before this check.
const COMMAND_PARAM_ALLOWLIST = {
  LED_START_BLINK: ['speed'],
  LED_STOP_BLINK: [],
  GET_STATUS: [],
};

function sanitizeCommandParams(action, params) {
  const allowed = COMMAND_PARAM_ALLOWLIST[action];
  if (!allowed) return { error: 'unknown_action' };

  for (const key of Object.keys(params)) {
    if (!allowed.includes(key)) return { error: 'invalid_params' };
  }

  const clean = {};
  if (allowed.includes('speed') && 'speed' in params) {
    const speed = Number(params.speed);
    if (!Number.isInteger(speed) || speed < 50 || speed > 5000) return { error: 'invalid_params' };
    clean.speed = speed;
  }
  return { params: clean };
}

export function sendDeviceCommand(action, params = {}) {
  const cmdId = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    pushLog({ ts: new Date().toISOString(), event: 'rejected', cmdId, action, reason: 'invalid_params' });
    return Promise.resolve({ delivered: false, acked: false, reason: 'invalid_params', cmdId });
  }

  // deviceId is a routing hint only - never forwarded to the device payload.
  const { deviceId: routingDeviceId, ...sanitizableParams } = params;
  const requestedDeviceId = typeof routingDeviceId === 'string' ? routingDeviceId : null;
  const deviceId = requestedDeviceId || preferredDeviceId();
  const dev = deviceId ? devices.get(deviceId) : null;

  const sanitized = sanitizeCommandParams(action, sanitizableParams);
  if (sanitized.error) {
    pushLog({ ts: new Date().toISOString(), event: 'rejected', cmdId, action, reason: sanitized.error });
    return Promise.resolve({ delivered: false, acked: false, reason: sanitized.error, cmdId });
  }
  const cleanParams = sanitized.params;

  if (!dev || dev.ws.readyState !== 1) {
    pushLog({ ts: new Date().toISOString(), event: 'rejected', cmdId, action, reason: 'device_offline' });
    return Promise.resolve({ delivered: false, acked: false, reason: 'device_offline', cmdId });
  }

  // Reserved protocol fields are constructed explicitly AFTER the sanitized
  // params spread, so they cannot be overridden.
  const payload = JSON.stringify({ ...cleanParams, type: 'command', cmd_id: cmdId, action });

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingCommands.delete(cmdId);
      pushLog({ ts: new Date().toISOString(), event: 'timeout', cmdId, action, deviceId });
      resolve({ delivered: true, acked: false, reason: 'ack_timeout', cmdId, latencyMs: CMD_TIMEOUT_MS });
    }, CMD_TIMEOUT_MS);

    pendingCommands.set(cmdId, { deviceId, timer, resolve, sentAt: Date.now() });
    dev.ws.send(payload);
    pushLog({ ts: new Date().toISOString(), event: 'sent', cmdId, action, params: cleanParams, deviceId });
    console.log(`[Bridge] Command ${action} -> ${deviceId} (${cmdId})`);
  });
}

// ---------------------------------------------------------------------------
// Panel (browser) connection handling
// ---------------------------------------------------------------------------
function handlePanelMessage(ws, raw) {
  let msg;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }
  if (msg.type === 'get_state') {
    ws.send(JSON.stringify(snapshot()));
  }
}

// ---------------------------------------------------------------------------
// Attach to an existing http server
// ---------------------------------------------------------------------------
export function attachDeviceBridge(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (pathname === '/ws/device') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.isDevice = true;
        wss.emit('connection', ws, req);
      });
    } else if (pathname === '/ws/panel') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.isPanel = true;
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    if (ws.isDevice) {
      console.log('[Bridge] Device socket opened');

      let registeredId = null;
      // Unregistered sockets get one window to present a valid register frame.
      const registrationTimer = setTimeout(() => {
        if (!registeredId) {
          console.log('[Bridge] Device socket closed: never registered');
          try { ws.close(); } catch { /* noop */ }
        }
      }, REGISTRATION_TIMEOUT_MS);

      ws.on('message', (raw) => {
        // Registration must come first
        if (!registeredId) {
          let msg;
          try {
            msg = JSON.parse(raw.toString());
          } catch {
            return;
          }
          if (msg.type !== 'register') return;
          if (!tokenMatches(msg.token)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
            console.log('[Bridge] Device rejected: bad token');
            clearTimeout(registrationTimer);
            ws.close();
            return;
          }
          clearTimeout(registrationTimer);
          const requestedId =
            typeof msg.deviceId === 'string' ? msg.deviceId.trim().slice(0, 64) : '';
          registeredId = requestedId || `device_${Date.now()}`;
          // If this deviceId re-registers, drop the stale socket
          const existing = devices.get(registeredId);
          if (existing && existing.ws.readyState === 1) existing.ws.close();

          devices.set(registeredId, {
            ws,
            meta: { kind: msg.kind || 'esp32', connectedAt: new Date().toISOString() },
            lastSeenTs: Date.now(),
            lastPongTs: Date.now(),
            lastTelemetry: null,
          });
          ws.on('pong', () => {
            const dev = devices.get(registeredId);
            if (dev) dev.lastPongTs = Date.now();
          });
          console.log(`[Bridge] Device registered: ${registeredId} (${msg.kind || 'esp32'})`);
          pushLog({ ts: new Date().toISOString(), event: 'device_online', deviceId: registeredId });
          broadcastToPanels(snapshot());
          return;
        }

        handleDeviceMessage(registeredId, ws, raw);
      });

      ws.on('close', () => {
        clearTimeout(registrationTimer);
        if (registeredId) deviceDisconnected(registeredId);
      });
      ws.on('error', () => {
        clearTimeout(registrationTimer);
        if (registeredId) deviceDisconnected(registeredId);
      });
    } else if (ws.isPanel) {
      console.log('[Bridge] Panel socket opened');
      panels.add(ws);
      ws.send(JSON.stringify(snapshot()));
      ws.send(JSON.stringify({ type: 'command_log', entries: commandLog.slice(0, 25) }));
      ws.on('message', (raw) => handlePanelMessage(ws, raw));
      ws.on('close', () => panels.delete(ws));
      ws.on('error', () => panels.delete(ws));
    }
  });

  console.log('[Bridge] WebSocket paths: /ws/device (ESP32), /ws/panel (browser)');

  // Heartbeat: detect silently-dead TCP connections (e.g. WiFi drops)
  const heartbeat = setInterval(() => {
    const now = Date.now();
    for (const [id, dev] of devices) {
      if (dev.ws.readyState !== 1) continue;
      if (now - (dev.lastPongTs || dev.lastSeenTs) > 45000) {
        console.log(`[Bridge] Device timed out (no pong): ${id}`);
        dev.ws.terminate();
        continue;
      }
      dev.ws.ping();
    }
  }, 15000);
  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}

export function getBridgeSnapshot() {
  return snapshot();
}

export function getCommandLog(limit = 25) {
  return commandLog.slice(0, limit);
}
