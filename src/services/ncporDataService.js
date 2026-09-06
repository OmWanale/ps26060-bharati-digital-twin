/**
 * NCPOR Live Data Service
 * 
 * Frontend data service layer for Bharati Antarctic Station real-time environmental observations.
 * Communicates with our backend API endpoint: GET /api/bharati/live
 * 
 * Strict rule: NEVER invent or silently inject fake/mock values if the request fails.
 */

export const NCPOR_SOURCE_URL = 'https://data.ncpor.res.in/bharati/live';
export const NCPOR_SOURCE_DISPLAY_NAME = 'NCPOR • Bharati Live Data';
export const BACKEND_API_ENDPOINT = '/api/bharati/live';

/**
 * Fetch live data from backend endpoint: GET /api/bharati/live
 * 
 * @param {boolean} forceRefresh - Force scraping bypass of backend cache
 * @returns {Promise<{ success: boolean, data: Object|null, error: string|null, timestamp: string|null }>}
 */
export async function fetchLiveNCPORData(forceRefresh = false) {
  const url = `${BACKEND_API_ENDPOINT}${forceRefresh ? '?refresh=true' : ''}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      let errorDetail = `HTTP ${res.status}`;
      try {
        const errorJson = await res.json();
        if (errorJson.error) errorDetail = errorJson.error;
      } catch {
        // use status text if JSON parse fails
      }
      return {
        success: false,
        data: null,
        error: `NCPOR connection unavailable (${errorDetail})`,
        timestamp: null,
      };
    }

    const payload = await res.json();

    // Verify minimum expected structure from backend
    if (!payload || !payload.current) {
      return {
        success: false,
        data: null,
        error: 'NCPOR connection unavailable (Invalid response structure)',
        timestamp: null,
      };
    }

    return {
      success: true,
      data: payload,
      error: null,
      timestamp: payload.timestamp || null,
      retrievedAt: payload.retrievedAt || new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      data: null,
      error: `NCPOR connection unavailable (${err.message || 'Network error'})`,
      timestamp: null,
    };
  }
}
