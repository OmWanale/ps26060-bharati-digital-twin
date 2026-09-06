import { scrapeNCPORBharatiLive } from '../../server/ncporScraper.js';

/**
 * Backend API Endpoint Handler: GET /api/bharati/live
 * 
 * Complies with standard Node http/connect middleware and Vercel serverless functions.
 * Protects scraping logic from the client and returns clean normalized JSON.
 */
export default async function handler(req, res) {
  // Enable CORS and define JSON response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ 
      error: 'Method Not Allowed. Only GET requests are accepted.', 
      statusCode: 405 
    }));
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const normalizedData = await scrapeNCPORBharatiLive(forceRefresh);
    
    res.statusCode = 200;
    res.end(JSON.stringify(normalizedData));
  } catch (error) {
    const statusCode = error.statusCode || 500;
    res.statusCode = statusCode;
    res.end(JSON.stringify({
      station: 'Bharati',
      error: error.message || 'Upstream NCPOR data source unavailable',
      statusCode,
      timestamp: new Date().toISOString(),
    }));
  }
}
