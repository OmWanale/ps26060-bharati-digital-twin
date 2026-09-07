/**
 * Command Service - talks to the device bridge server.
 *
 * - REST for sending commands and initial status
 * - WebSocket (/ws/panel) for live device state + telemetry + command log
 *
 * Bridge URL resolution:
 *   - VITE_BRIDGE_URL env var when set (production, e.g. Railway on Vercel)
 *   - Defaults to http://localhost:3001 for local development
 *   (The browser connects to the bridge directly - no dev proxy needed.)
 */

const BRIDGE_URL = (import.meta.env.VITE_BRIDGE_URL || 'http://localhost:3001').replace(/\/$/, '');

export function bridgeHttpUrl(path) {
  return `${BRIDGE_URL}${path}`;
}

export function bridgeWsUrl(path) {
  return `${BRIDGE_URL.replace(/^http/, 'ws')}${path}`;
}

/**
 * Send a command to the ESP32 via the bridge REST endpoint.
 * @param {string} action - e.g. 'LED_START_BLINK'
 * @param {Object} [params]
 * @returns {Promise<{acked: boolean, latencyMs?: number, reason?: string}>}
 */
export async function sendCommand(action, params = {}) {
  const res = await fetch(bridgeHttpUrl('/api/device/command'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });
  const data = await res.json();
  return { httpStatus: res.status, ...data };
}

/**
 * Fetch current device snapshot (one-shot; prefer the WS for live updates).
 */
export async function getDeviceStatus() {
  const res = await fetch(bridgeHttpUrl('/api/device/status'));
  return res.json();
}

/**
 * Subscribe to live device updates over WebSocket.
 * @param {Object} handlers - { onState, onTelemetry, onLog }
 * @returns {Function} unsubscribe
 */
export function subscribeDeviceEvents({ onState, onTelemetry, onLog }) {
  let ws = null;
  let closedByUser = false;
  let retryTimer = null;
  let retryDelay = 2000;

  const connect = () => {
    try {
      ws = new WebSocket(bridgeWsUrl('/ws/panel'));
    } catch {
      scheduleRetry();
      return;
    }

    ws.onopen = () => {
      retryDelay = 2000;
      ws.send(JSON.stringify({ type: 'get_state' }));
    };

    ws.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === 'device_state' && onState) onState(msg);
      if (msg.type === 'telemetry' && onTelemetry) onTelemetry(msg);
      if (msg.type === 'command_log' && onLog) {
        if (msg.entries) msg.entries.forEach(onLog);
        else if (msg.entry) onLog(msg.entry);
      }
    };

    ws.onclose = () => {
      if (!closedByUser) scheduleRetry();
    };

    ws.onerror = () => {
      try { ws.close(); } catch { /* noop */ }
    };
  };

  const scheduleRetry = () => {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      retryDelay = Math.min(retryDelay * 1.5, 15000);
      connect();
    }, retryDelay);
  };

  connect();

  return () => {
    closedByUser = true;
    clearTimeout(retryTimer);
    if (ws) {
      ws.onclose = null;
      try { ws.close(); } catch { /* noop */ }
    }
  };
}
