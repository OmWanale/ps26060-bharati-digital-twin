import http from 'http';
import liveApiHandler from './api/bharati/live.js';
import { attachDeviceBridge, sendDeviceCommand, getBridgeSnapshot, getCommandLog } from './server/deviceBridge.js';

const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const server = http.createServer((req, res) => {
  // CORS for browser clients
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url && req.url.startsWith('/api/bharati/live')) {
    return liveApiHandler(req, res);
  }

  // ------------------------------------------------------------------
  // Device command endpoint: POST /api/device/command
  // Body: { action: "LED_START_BLINK" | "LED_STOP_BLINK", params?: {} }
  // ------------------------------------------------------------------
  if (req.url === '/api/device/command' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10_000) req.destroy(); // basic size guard
    });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const { action, params } = parsed;

        const allowedActions = ['LED_START_BLINK', 'LED_STOP_BLINK', 'GET_STATUS'];
        if (!action || !allowedActions.includes(action)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid action', allowedActions }));
          return;
        }

        const result = await sendDeviceCommand(action, params || {});
        const statusCode = result.acked ? 200 : result.delivered ? 504 : 409;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Bad request', detail: err.message }));
      }
    });
    return;
  }

  // ------------------------------------------------------------------
  // Device status: GET /api/device/status
  // ------------------------------------------------------------------
  if (req.url === '/api/device/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getBridgeSnapshot()));
    return;
  }

  // ------------------------------------------------------------------
  // Command log: GET /api/device/log
  // ------------------------------------------------------------------
  if (req.url === '/api/device/log' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ entries: getCommandLog(25) }));
    return;
  }

  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'Bharati NCPOR Backend API', endpoint: '/api/bharati/live' }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found', statusCode: 404 }));
});

// Attach WebSocket bridge for ESP32 + browser panels
attachDeviceBridge(server);

server.listen(PORT, () => {
  console.log(`[NCPOR Backend] Bharati live data API listening on port ${PORT}`);
  console.log(`[NCPOR Backend] Endpoint: http://localhost:${PORT}/api/bharati/live`);
  console.log(`[Bridge] Device WS: ws://localhost:${PORT}/ws/device`);
  console.log(`[Bridge] Panel  WS: ws://localhost:${PORT}/ws/panel`);
  console.log(`[Bridge] Command REST: POST http://localhost:${PORT}/api/device/command`);
});
