import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import liveApiHandler from './api/bharati/live.js';

/**
 * Custom Vite plugin to mount the backend API endpoint (/api/bharati/live)
 * directly into the Vite development and preview servers.
 */
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
});
