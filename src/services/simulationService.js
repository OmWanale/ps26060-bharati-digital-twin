/**
 * Simulation Service for Bharati Antarctic Research Station Digital Twin
 * 
 * DECOUPLING LAYER:
 * Keeps UI components strictly separated from ML and backend simulation calculations.
 * 
 * Future ML / Backend Integration:
 * Replace the mock implementation in `simulateScenario` with:
 * 
 *   const response = await fetch('/api/simulate', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(scenario)
 *   });
 *   if (!response.ok) throw new Error('Simulation engine failed');
 *   return await response.json();
 */

import { generateMockSimulationResult } from '../data/mockSimulationResult';

/**
 * @typedef {Object} ScenarioInput
 * @property {number} power_demand_multiplier - e.g. 1.30 (+30% demand)
 * @property {number} generator_load_multiplier - e.g. 1.10 (+10% load)
 * @property {number} fuel_consumption_multiplier - e.g. 1.20 (+20% burn rate)
 * @property {'normal'|'cold_conditions'|'severe_cold'|'extreme_cold'} environmental_condition
 * @property {number} duration_hours - e.g. 6, 12, 24, 48, 72
 * @property {string} [timestamp] - ISO timestamp when scenario was created
 */

/**
 * @typedef {Object} SimulationResult
 * @property {Object} scenario - Echoed scenario parameters
 * @property {Object} summary - 4 core predictions (Power, Fuel, Fuel Days Remaining, Generator Status)
 * @property {Object} risks - Energy and Operational risk levels
 * @property {Array<{time: string, power: number, fuel: number}>} timeline - Time series points
 * @property {string} recommendation - Operational advisory text
 * @property {string} generatedAt - ISO timestamp
 */

/**
 * Execute a hypothetical What-if scenario simulation
 * 
 * @param {ScenarioInput} scenario - Structured scenario parameters
 * @returns {Promise<SimulationResult>} - Predicted station outcomes
 */
export async function simulateScenario(scenario) {
  // Validate input contract
  if (!scenario || typeof scenario !== 'object') {
    throw new Error('Invalid scenario input: payload must be a valid object');
  }

  // ---------------------------------------------------------------------------
  // [ML TEAM INTEGRATION POINT]:
  // Uncomment the following block when the backend simulation API is available:
  //
  // try {
  //   const res = await fetch('/api/simulate', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify(scenario)
  //   });
  //   if (!res.ok) {
  //     throw new Error(`Simulation engine error: HTTP ${res.status}`);
  //   }
  //   return await res.json();
  // } catch (err) {
  //   console.error('Failed to communicate with simulation engine:', err);
  //   throw err;
  // }
  // ---------------------------------------------------------------------------

  // Mock simulation latency to demonstrate async UI state transitions
  await new Promise((resolve) => setTimeout(resolve, 1100));

  // Generate standardized mock outcome based on the provided scenario multipliers
  return generateMockSimulationResult(scenario);
}
