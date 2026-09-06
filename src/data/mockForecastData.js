/**
 * Mock Forecast Data Service for Bharati Antarctic Research Station
 * 
 * Defines the contract/interface for ML model outputs.
 * An ML or backend teammate can replace this mock data service with real API/WebSocket
 * feeds without changing any component logic in ForecastPanel.
 * 
 * Schema:
 * forecastData = {
 *   horizon: 'Next 6 Hours' | 'Next 12 Hours' | 'Next 24 Hours',
 *   generatedAt: string (ISO timestamp),
 *   modelVersion: string,
 *   parameters: [
 *     {
 *       id: string,
 *       name: string,
 *       currentValue: number,
 *       forecastValue: number,
 *       unit: string,
 *       trend: 'Increasing' | 'Decreasing' | 'Stable',
 *       status: 'normal' | 'warning' | 'critical',
 *       chartData: Array<{ time: string, current: number | null, predicted: number }>
 *     }
 *   ]
 * }
 */

export const FORECAST_HORIZONS = [
  'Next 6 Hours',
  'Next 12 Hours',
  'Next 24 Hours'
];

export const MOCK_FORECAST_DATA = {
  'Next 6 Hours': {
    horizon: 'Next 6 Hours',
    generatedAt: '2026-09-06T14:10:00Z',
    modelVersion: 'Bharati-LSTM-Forecaster-v2.3',
    parameters: [
      {
        id: 'power_demand',
        name: 'Power Demand',
        currentValue: 72,
        forecastValue: 81,
        unit: 'kW',
        trend: 'Increasing',
        status: 'warning',
        chartData: [
          { time: 'T-2h', current: 70, predicted: 70 },
          { time: 'T-1h', current: 71, predicted: 71 },
          { time: 'Now', current: 72, predicted: 72 },
          { time: '+1h', current: null, predicted: 74 },
          { time: '+2h', current: null, predicted: 76 },
          { time: '+3h', current: null, predicted: 78 },
          { time: '+4h', current: null, predicted: 79 },
          { time: '+5h', current: null, predicted: 80 },
          { time: '+6h', current: null, predicted: 81 }
        ]
      },
      {
        id: 'temperature',
        name: 'Temperature',
        currentValue: -13.76,
        forecastValue: -15.20,
        unit: '°C',
        trend: 'Decreasing',
        status: 'normal',
        chartData: [
          { time: 'T-2h', current: -13.20, predicted: -13.20 },
          { time: 'T-1h', current: -13.50, predicted: -13.50 },
          { time: 'Now', current: -13.76, predicted: -13.76 },
          { time: '+1h', current: null, predicted: -14.10 },
          { time: '+2h', current: null, predicted: -14.35 },
          { time: '+3h', current: null, predicted: -14.60 },
          { time: '+4h', current: null, predicted: -14.85 },
          { time: '+5h', current: null, predicted: -15.05 },
          { time: '+6h', current: null, predicted: -15.20 }
        ]
      },
      {
        id: 'fuel_consumption',
        name: 'Fuel Consumption',
        currentValue: 26.4,
        forecastValue: 28.1,
        unit: 'L/hr',
        trend: 'Increasing',
        status: 'warning',
        chartData: [
          { time: 'T-2h', current: 25.8, predicted: 25.8 },
          { time: 'T-1h', current: 26.1, predicted: 26.1 },
          { time: 'Now', current: 26.4, predicted: 26.4 },
          { time: '+1h', current: null, predicted: 26.7 },
          { time: '+2h', current: null, predicted: 27.1 },
          { time: '+3h', current: null, predicted: 27.4 },
          { time: '+4h', current: null, predicted: 27.7 },
          { time: '+5h', current: null, predicted: 27.9 },
          { time: '+6h', current: null, predicted: 28.1 }
        ]
      },
      {
        id: 'energy_load',
        name: 'Energy Load',
        currentValue: 72,
        forecastValue: 79,
        unit: '%',
        trend: 'Increasing',
        status: 'warning',
        chartData: [
          { time: 'T-2h', current: 69, predicted: 69 },
          { time: 'T-1h', current: 71, predicted: 71 },
          { time: 'Now', current: 72, predicted: 72 },
          { time: '+1h', current: null, predicted: 74 },
          { time: '+2h', current: null, predicted: 75 },
          { time: '+3h', current: null, predicted: 76 },
          { time: '+4h', current: null, predicted: 77 },
          { time: '+5h', current: null, predicted: 78 },
          { time: '+6h', current: null, predicted: 79 }
        ]
      }
    ]
  },
  'Next 12 Hours': {
    horizon: 'Next 12 Hours',
    generatedAt: '2026-09-06T14:10:00Z',
    modelVersion: 'Bharati-LSTM-Forecaster-v2.3',
    parameters: [
      {
        id: 'power_demand',
        name: 'Power Demand',
        currentValue: 72,
        forecastValue: 86,
        unit: 'kW',
        trend: 'Increasing',
        status: 'warning',
        chartData: [
          { time: 'Now', current: 72, predicted: 72 },
          { time: '+2h', current: null, predicted: 76 },
          { time: '+4h', current: null, predicted: 79 },
          { time: '+6h', current: null, predicted: 81 },
          { time: '+8h', current: null, predicted: 83 },
          { time: '+10h', current: null, predicted: 85 },
          { time: '+12h', current: null, predicted: 86 }
        ]
      },
      {
        id: 'temperature',
        name: 'Temperature',
        currentValue: -13.76,
        forecastValue: -17.40,
        unit: '°C',
        trend: 'Decreasing',
        status: 'warning',
        chartData: [
          { time: 'Now', current: -13.76, predicted: -13.76 },
          { time: '+2h', current: null, predicted: -14.40 },
          { time: '+4h', current: null, predicted: -15.00 },
          { time: '+6h', current: null, predicted: -15.60 },
          { time: '+8h', current: null, predicted: -16.30 },
          { time: '+10h', current: null, predicted: -16.90 },
          { time: '+12h', current: null, predicted: -17.40 }
        ]
      },
      {
        id: 'fuel_consumption',
        name: 'Fuel Consumption',
        currentValue: 26.4,
        forecastValue: 30.2,
        unit: 'L/hr',
        trend: 'Increasing',
        status: 'warning',
        chartData: [
          { time: 'Now', current: 26.4, predicted: 26.4 },
          { time: '+2h', current: null, predicted: 27.2 },
          { time: '+4h', current: null, predicted: 27.8 },
          { time: '+6h', current: null, predicted: 28.5 },
          { time: '+8h', current: null, predicted: 29.2 },
          { time: '+10h', current: null, predicted: 29.8 },
          { time: '+12h', current: null, predicted: 30.2 }
        ]
      },
      {
        id: 'energy_load',
        name: 'Energy Load',
        currentValue: 72,
        forecastValue: 84,
        unit: '%',
        trend: 'Increasing',
        status: 'warning',
        chartData: [
          { time: 'Now', current: 72, predicted: 72 },
          { time: '+2h', current: null, predicted: 75 },
          { time: '+4h', current: null, predicted: 78 },
          { time: '+6h', current: null, predicted: 80 },
          { time: '+8h', current: null, predicted: 82 },
          { time: '+10h', current: null, predicted: 83 },
          { time: '+12h', current: null, predicted: 84 }
        ]
      }
    ]
  },
  'Next 24 Hours': {
    horizon: 'Next 24 Hours',
    generatedAt: '2026-09-06T14:10:00Z',
    modelVersion: 'Bharati-LSTM-Forecaster-v2.3',
    parameters: [
      {
        id: 'power_demand',
        name: 'Power Demand',
        currentValue: 72,
        forecastValue: 75,
        unit: 'kW',
        trend: 'Increasing',
        status: 'normal',
        chartData: [
          { time: 'Now', current: 72, predicted: 72 },
          { time: '+4h', current: null, predicted: 78 },
          { time: '+8h', current: null, predicted: 84 },
          { time: '+12h', current: null, predicted: 86 },
          { time: '+16h', current: null, predicted: 80 },
          { time: '+20h', current: null, predicted: 76 },
          { time: '+24h', current: null, predicted: 75 }
        ]
      },
      {
        id: 'temperature',
        name: 'Temperature',
        currentValue: -13.76,
        forecastValue: -14.10,
        unit: '°C',
        trend: 'Decreasing',
        status: 'normal',
        chartData: [
          { time: 'Now', current: -13.76, predicted: -13.76 },
          { time: '+4h', current: null, predicted: -15.20 },
          { time: '+8h', current: null, predicted: -16.80 },
          { time: '+12h', current: null, predicted: -17.40 },
          { time: '+16h', current: null, predicted: -16.10 },
          { time: '+20h', current: null, predicted: -14.80 },
          { time: '+24h', current: null, predicted: -14.10 }
        ]
      },
      {
        id: 'fuel_consumption',
        name: 'Fuel Consumption',
        currentValue: 26.4,
        forecastValue: 27.0,
        unit: 'L/hr',
        trend: 'Increasing',
        status: 'normal',
        chartData: [
          { time: 'Now', current: 26.4, predicted: 26.4 },
          { time: '+4h', current: null, predicted: 27.6 },
          { time: '+8h', current: null, predicted: 29.5 },
          { time: '+12h', current: null, predicted: 30.2 },
          { time: '+16h', current: null, predicted: 28.8 },
          { time: '+20h', current: null, predicted: 27.5 },
          { time: '+24h', current: null, predicted: 27.0 }
        ]
      },
      {
        id: 'energy_load',
        name: 'Energy Load',
        currentValue: 72,
        forecastValue: 74,
        unit: '%',
        trend: 'Increasing',
        status: 'normal',
        chartData: [
          { time: 'Now', current: 72, predicted: 72 },
          { time: '+4h', current: null, predicted: 77 },
          { time: '+8h', current: null, predicted: 82 },
          { time: '+12h', current: null, predicted: 84 },
          { time: '+16h', current: null, predicted: 79 },
          { time: '+20h', current: null, predicted: 75 },
          { time: '+24h', current: null, predicted: 74 }
        ]
      }
    ]
  }
};

/**
 * Helper to retrieve forecast data by horizon
 * @param {string} horizon - 'Next 6 Hours' | 'Next 12 Hours' | 'Next 24 Hours'
 * @returns {object|null}
 */
export function getMockForecastData(horizon = 'Next 6 Hours') {
  return MOCK_FORECAST_DATA[horizon] || null;
}
