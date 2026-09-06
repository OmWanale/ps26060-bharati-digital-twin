import http from 'http';
import liveApiHandler from './api/bharati/live.js';

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  if (req.url && req.url.startsWith('/api/bharati/live')) {
    return liveApiHandler(req, res);
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

server.listen(PORT, () => {
  console.log(`[NCPOR Backend] Bharati live data API listening on port ${PORT}`);
  console.log(`[NCPOR Backend] Endpoint: http://localhost:${PORT}/api/bharati/live`);
});
