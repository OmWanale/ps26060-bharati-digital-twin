import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import liveApiHandler from './api/bharati/live.js';

/**
 * Custom Vite plugin to mount the backend API endpoint (/api/bharati/live)
 * directly into the Vite development and preview servers, plus proxy the
 * device bridge REST + WebSocket endpoints to the bridge server.
 */
const BRIDGE_TARGET = process.env.BRIDGE_URL || 'http://localhost:3001';

/**
 * Friendly proxy error handler - silences EPIPE/ECONNRESET noise that happens
 * when the bridge restarts, a browser tab refreshes mid-write, or the bridge
 * is simply not running yet.
 */
function onProxyError(err, req, res) {
  const code = err.code || '';
  if (code === 'ECONNREFUSED') {
    console.warn(`[vite] Bridge not reachable at ${BRIDGE_TARGET} - start it with: npm run start:bridge`);
  } else if (code === 'EPIPE' || code === 'ECONNRESET') {
    // Socket closed mid-write (tab refresh / device reconnect). Harmless, ignore.
  } else {
    console.warn(`[vite] proxy error: ${err.message}`);
  }
  if (res && !res.headersSent && typeof res.writeHead === 'function') {
    try {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bridge server unreachable' }));
    } catch {
      /* socket already gone */
    }
  }
}

function ncporApiPlugin() {
  return {
    name: 'ncpor-live-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/bharati/live')) {
          return liveApiHandler(req, res);
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/bharati/live')) {
          return liveApiHandler(req, res);
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ncporApiPlugin()],
  server: {
    proxy: {
      // REST fallback requests to the bridge server (device panel talks to
      // the bridge DIRECTLY for WebSocket + REST, so this is just backup)
      '/api/device': {
        target: BRIDGE_TARGET,
        changeOrigin: true,
        configure: (proxy) => proxy.on('error', onProxyError),
      },
    },
  },
});
