/**
 * Fake ESP32 for local testing - simulates the real device without hardware.
 *
 * Usage:  node server/deviceSimulator.js [bridgeUrl]
 *   e.g.  node server/deviceSimulator.js ws://localhost:3001/ws/device
 *
 * Behaves exactly like the firmware: registers, responds to commands with
 * acks, streams telemetry at 1 Hz, prints received commands.
 */

import WebSocket from 'ws';

const URL = process.argv[2] || 'ws://localhost:3001/ws/device';
const TOKEN = process.env.DEVICE_AUTH_TOKEN || 'bharati-dev-token';
const DEVICE_ID = 'esp32_led_sim';

let led = false;
let blinking = false;
let commands = 0;
let activeWs = null;

function connect() {
  const ws = new WebSocket(URL);
  activeWs = ws;

  ws.on('open', () => {
    console.log(`[Sim] Connected to ${URL}`);
    ws.send(JSON.stringify({
      type: 'register',
      role: 'device',
      deviceId: DEVICE_ID,
      token: TOKEN,
      kind: 'esp32_led_sim',
    }));
  });

  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'error') {
      console.error('[Sim] Server error:', msg.message);
      process.exit(1);
    }

    if (msg.type === 'command') {
      commands++;
      console.log(`[Sim] Command received: ${msg.action} (${msg.cmd_id})`);

      if (msg.action === 'LED_START_BLINK') {
        blinking = true;
        console.log('[Sim] LED blinking...');
      } else if (msg.action === 'LED_STOP_BLINK') {
        blinking = false;
        led = false;
        console.log('[Sim] LED stopped');
      }

      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'ack',
          cmd_id: msg.cmd_id,
          action: msg.action,
          status: 'ok',
          led,
          blinking,
        }));
      }, 120); // simulated processing delay
    }
  });

  ws.on('close', () => {
    console.log('[Sim] Disconnected. Reconnecting in 3s...');
    setTimeout(connect, 3000);
  });

  ws.on('error', (err) => {
    console.error('[Sim] Connection error:', err.message);
  });
}

connect();

setInterval(() => {
  if (blinking) led = !led; // simulate physical blink
  const socket = activeWs;
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({
    type: 'telemetry',
    deviceId: DEVICE_ID,
    led,
    blinking,
    rssi: -55 - Math.floor(Math.random() * 10),
    uptime_s: Math.floor(process.uptime()),
    heap: 220000,
    commands,
  }));
}, 1000);
