/**
 * Server-Side NCPOR Bharati Live Telemetry Scraper & Normalizer
 * 
 * Fetches and parses the official NCPOR public live observation page:
 * https://data.ncpor.res.in/bharati/live
 * 
 * Extracts live parameters, statistical records (avg/min/max), and time series.
 * Returns normalized JSON. Does not invent data.
 */

const NCPOR_LIVE_URL = 'https://data.ncpor.res.in/bharati/live';
const FETCH_TIMEOUT_MS = 10000;

// In-memory cache to prevent excessive requests to NCPOR servers (5-minute controlled interval)
let cache = {
  data: null,
  timestamp: 0,
  ttlMs: 5 * 60 * 1000, // 5-minute controlled interval (300,000 ms)
  minThrottleMs: 60 * 1000, // Minimum 60-second cooldown between upstream network fetches
};

/**
 * Clean and parse numeric value + unit from raw text string
 */
export function parseValueAndUnit(str, defaultUnit = '') {
  if (!str) return { value: null, unit: defaultUnit };
  
  // Replace HTML entities and normalize degrees
  const clean = str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&deg;/gi, '°')
    .replace(/\s+/g, ' ')
    .trim();

  // Match signed floating point number
  const numMatch = clean.match(/([-+]?[0-9]+(?:\.[0-9]+)?)/);
  const value = numMatch ? parseFloat(numMatch[1]) : null;

  // Extract remaining unit
  let unit = clean.replace(/[-+]?[0-9]+(?:\.[0-9]+)?/, '').trim();
  if (!unit) unit = defaultUnit;
  // Normalize ° C to °C
  if (unit === '° C') unit = '°C';

  return { value, unit };
}

/**
 * Parse statistical <table> by matching section header (Average, Minimum, Maximum)
 */
export function parseTableSection(html, sectionHeaderPattern) {
  const regex = new RegExp(
    `<th>\\s*${sectionHeaderPattern}\\s*<\\/th>[\\s\\S]*?<\\/tr>([\\s\\S]*?)<\\/table>`,
    'i'
  );
  const match = html.match(regex);
  if (!match) return null;

  const rowsHtml = match[1];
  const rowRegex = /<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<\/tr>/gi;
  const rawPairs = {};
  let rMatch;
  while ((rMatch = rowRegex.exec(rowsHtml)) !== null) {
    const rawLabel = rMatch[1].trim();
    const rawVal = rMatch[2].replace(/&nbsp;/g, ' ').replace(/&deg;/g, '°').trim();
    rawPairs[rawLabel] = rawVal;
  }

  // Normalize into standard keys
  return {
    temperature: parseValueAndUnit(rawPairs['Temperature'], '°C'),
    windSpeed: parseValueAndUnit(rawPairs['Wind Speed'], 'm/s'),
    pressure: parseValueAndUnit(rawPairs['Air Pressure'], 'hPa'),
    humidity: parseValueAndUnit(rawPairs['Rel. Humidity'] || rawPairs['Relative Humidity'], '%'),
    raw: rawPairs,
  };
}

/**
 * Extract time series dataPoints from CanvasJS charts in the webpage script
 */
export function parseTimeSeries(html) {
  const series = {
    temperature: [],
    windSpeed: [],
    pressure: [],
    humidity: [],
  };

  try {
    const dataPointsBlockMatch = html.match(/dataPoints\s*:\s*\[([\s\S]*?)\]/gi);
    if (!dataPointsBlockMatch) return series;

    const names = ['temperature', 'windSpeed', 'pressure', 'humidity'];
    dataPointsBlockMatch.forEach((block, idx) => {
      const targetKey = names[idx];
      if (!targetKey) return;

      const pointRegex = /\{\s*x\s*:\s*([0-9]+)\s*,\s*y\s*:\s*([-+]?[0-9]*\.?[0-9]+)\s*\}/gi;
      let pMatch;
      while ((pMatch = pointRegex.exec(block)) !== null) {
        series[targetKey].push({
          timestamp: parseInt(pMatch[1], 10),
          value: parseFloat(pMatch[2]),
        });
      }
    });
  } catch (err) {
    console.error('CanvasJS time-series parse warning:', err);
  }

  return series;
}

/**
 * Core scraping function: fetches official NCPOR Bharati live page and normalizes response
 */
export async function scrapeNCPORBharatiLive(forceRefresh = false) {
  const now = Date.now();
  const timeSinceLastFetch = now - cache.timestamp;

  // Return cached result if still within 5-minute TTL and not forcing refresh
  if (!forceRefresh && cache.data && timeSinceLastFetch < cache.ttlMs) {
    return {
      ...cache.data,
      cached: true,
      cacheAgeMs: timeSinceLastFetch,
    };
  }

  // If forceRefresh requested within minimum cooldown window (60s), protect upstream and return cache
  if (forceRefresh && cache.data && timeSinceLastFetch < cache.minThrottleMs) {
    return {
      ...cache.data,
      cached: true,
      throttled: true,
      cacheAgeMs: timeSinceLastFetch,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(NCPOR_LIVE_URL, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr.name === 'AbortError') {
      const error = new Error('NCPOR live portal gateway timeout (10s limit exceeded)');
      error.statusCode = 504;
      throw error;
    }
    const error = new Error(`Failed to connect to NCPOR server: ${fetchErr.message}`);
    error.statusCode = 502;
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const error = new Error(`NCPOR portal returned upstream error: HTTP ${response.status}`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    throw error;
  }

  const html = await response.text();

  // 1. Extract Date / Timestamp from table header
  const dateMatch = html.match(/<td[^>]*rowspan=["']2["'][^>]*>([^<]+)<\/td>/i);
  const sourceTimestamp = dateMatch ? dateMatch[1].replace(/&nbsp;/g, ' ').trim() : null;

  // 2. Extract Current Values from KPI table element IDs
  const tempMatch = html.match(/id\s*=\s*["']divtemp["'][^>]*>([^<]+)<\/td>/i);
  const rhMatch = html.match(/id\s*=\s*["']divrh["'][^>]*>([^<]+)<\/td>/i);
  const apMatch = html.match(/id\s*=\s*["']divap["'][^>]*>([^<]+)<\/td>/i);
  const windMatch = html.match(/id\s*=\s*["']divw["'][^>]*>([^<]+)<\/td>/i);

  if (!tempMatch && !rhMatch && !apMatch && !windMatch) {
    const error = new Error('Failed to parse telemetry structure from NCPOR webpage');
    error.statusCode = 502;
    throw error;
  }

  const currentTemp = parseValueAndUnit(tempMatch ? tempMatch[1] : null, '°C');
  const currentHumidity = parseValueAndUnit(rhMatch ? rhMatch[1] : null, '%');
  const currentPressure = parseValueAndUnit(apMatch ? apMatch[1] : null, 'mBar');
  const currentWind = parseValueAndUnit(windMatch ? windMatch[1] : null, 'knots');

  // 3. Extract Statistical Tables (Average, Minimum, Maximum)
  const averageStats = parseTableSection(html, 'Average');
  const minimumStats = parseTableSection(html, 'Minimum');
  // Handles 'Maxmimum' typo present on official NCPOR page
  const maximumStats = parseTableSection(html, 'Maxm?imum');

  // 4. Extract 24-hour observation time-series data
  const timeSeries = parseTimeSeries(html);

  // 5. Construct normalized response matching user specification
  const normalizedData = {
    station: 'Bharati',
    source: 'NCPOR',
    stationLocation: 'Larsemann Hills, Antarctica',
    coordinates: '69°24′28″S 76°11′14″E',
    sourceUrl: NCPOR_LIVE_URL,
    timestamp: sourceTimestamp || new Date().toISOString(),
    retrievedAt: new Date().toISOString(),
    cached: false,
    current: {
      temperature: {
        value: currentTemp.value,
        unit: currentTemp.unit,
      },
      humidity: {
        value: currentHumidity.value,
        unit: currentHumidity.unit,
      },
      pressure: {
        value: currentPressure.value,
        unit: currentPressure.unit,
      },
      windSpeed: {
        value: currentWind.value,
        unit: currentWind.unit,
      },
    },
    statistics: {
      average: {
        temperature: averageStats?.temperature || { value: null, unit: '°C' },
        windSpeed: averageStats?.windSpeed || { value: null, unit: 'm/s' },
        pressure: averageStats?.pressure || { value: null, unit: 'hPa' },
        humidity: averageStats?.humidity || { value: null, unit: '%' },
      },
      minimum: {
        temperature: minimumStats?.temperature || { value: null, unit: '°C' },
        windSpeed: minimumStats?.windSpeed || { value: null, unit: 'm/s' },
        pressure: minimumStats?.pressure || { value: null, unit: 'hPa' },
        humidity: minimumStats?.humidity || { value: null, unit: '%' },
      },
      maximum: {
        temperature: maximumStats?.temperature || { value: null, unit: '°C' },
        windSpeed: maximumStats?.windSpeed || { value: null, unit: 'm/s' },
        pressure: maximumStats?.pressure || { value: null, unit: 'hPa' },
        humidity: maximumStats?.humidity || { value: null, unit: '%' },
      },
    },
    timeSeries,
  };

  // Update in-memory cache with 5-minute controlled TTL
  cache = {
    ...cache,
    data: normalizedData,
    timestamp: now,
  };

  return normalizedData;
}
