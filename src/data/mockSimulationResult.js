/**
 * Mock Simulation Result Data Contract for Bharati Antarctic Research Station
 * 
 * Defines the contract/interface for ML simulation outcomes.
 * The ML teammate will replace this mock structure with real simulation engine outputs.
 * 
 * Schema:
 * simulationResult = {
 *   scenario: {
 *     powerDemandChange: string,
 *     generatorLoadChange: string,
 *     fuelConsumptionChange: string,
 *     environment: string,
 *     duration: string
 *   },
 *   summary: {
 *     predictedPowerDemand: { value: number, unit: string, status: 'normal'|'warning'|'critical' },
 *     predictedFuelConsumption: { value: number, unit: string, status: 'normal'|'warning'|'critical' },
 *     estimatedFuelRemaining: { value: number, unit: string, status: 'normal'|'warning'|'critical' },
 *     generatorStatus: { value: string, status: 'normal'|'warning'|'critical' }
 *   },
 *   risks: {
 *     energyRisk: { level: string, status: 'normal'|'warning'|'critical' },
 *     operationalRisk: { level: string, status: 'normal'|'warning'|'critical' }
 *   },
 *   timeline: Array<{ time: string, power: number, fuel: number }>,
 *   recommendation: string,
 *   generatedAt: string
 * }
 */

export const DEFAULT_MOCK_SIMULATION_RESULT = {
  scenario: {
    powerDemandChange: '+30%',
    generatorLoadChange: '+10%',
    fuelConsumptionChange: '+20%',
    environment: 'Severe Cold',
    duration: '24 Hours'
  },
  summary: {
    predictedPowerDemand: {
      value: 93.6,
      unit: 'kW',
      baseline: '72.0 kW',
      status: 'warning'
    },
    predictedFuelConsumption: {
      value: 31.7,
      unit: 'L/hr',
      baseline: '26.4 L/hr',
      status: 'warning'
    },
    estimatedFuelRemaining: {
      value: 18.4,
      unit: 'days',
      baseline: '22.1 days',
      status: 'normal'
    },
    generatorStatus: {
      value: 'High Load',
      loadPercent: '91%',
      status: 'warning'
    }
  },
  risks: {
    energyRisk: {
      level: 'Moderate',
      status: 'warning',
      description: 'Demand approaches single-generator threshold of 95 kW'
    },
    operationalRisk: {
      level: 'Elevated',
      status: 'warning',
      description: 'Severe cold increases thermal loss across habitat modules'
    }
  },
  timeline: [
    { time: '0h', power: 72.0, fuel: 26.4 },
    { time: '6h', power: 78.0, fuel: 27.5 },
    { time: '12h', power: 84.0, fuel: 29.0 },
    { time: '18h', power: 89.0, fuel: 30.2 },
    { time: '24h', power: 93.6, fuel: 31.7 }
  ],
  recommendation: 'Consider reducing non-essential loads if generator load exceeds the safe operating threshold.',
  generatedAt: '2026-09-06T14:20:00Z'
};

/**
 * Generate a dynamic mock simulation result from scenario inputs
 * @param {Object} scenario
 * @returns {Object}
 */
export function generateMockSimulationResult(scenario = {}) {
  const pMult = scenario.power_demand_multiplier || 1.3;
  const gMult = scenario.generator_load_multiplier || 1.1;
  const fMult = scenario.fuel_consumption_multiplier || 1.2;
  const env = scenario.environmental_condition || 'severe_cold';
  const durHours = scenario.duration_hours || 24;

  const basePower = 72.0;
  const baseFuel = 26.4;

  const finalPower = Number((basePower * pMult).toFixed(1));
  const finalFuel = Number((baseFuel * fMult).toFixed(1));

  // Determine risk levels based on power demand and environment
  let energyRiskLevel = 'Low';
  let energyStatus = 'normal';
  if (finalPower > 90) {
    energyRiskLevel = 'Moderate';
    energyStatus = 'warning';
  }
  if (finalPower > 105) {
    energyRiskLevel = 'Critical';
    energyStatus = 'critical';
  }

  let opRiskLevel = 'Normal';
  let opStatus = 'normal';
  if (env === 'severe_cold' || env === 'extreme_cold' || gMult > 1.05) {
    opRiskLevel = 'Elevated';
    opStatus = 'warning';
  }
  if (env === 'extreme_cold' && finalPower > 95) {
    opRiskLevel = 'Severe';
    opStatus = 'critical';
  }

  const steps = 5;
  const stepHours = Math.round(durHours / (steps - 1));
  const timeline = Array.from({ length: steps }).map((_, i) => {
    const progress = i / (steps - 1);
    return {
      time: `${i * stepHours}h`,
      power: Number((basePower + (finalPower - basePower) * progress).toFixed(1)),
      fuel: Number((baseFuel + (finalFuel - baseFuel) * progress).toFixed(1))
    };
  });

  const envLabels = {
    normal: 'Normal',
    cold_conditions: 'Cold Conditions',
    severe_cold: 'Severe Cold',
    extreme_cold: 'Extreme Cold'
  };

  return {
    scenario: {
      powerDemandChange: `${pMult >= 1 ? '+' : ''}${Math.round((pMult - 1) * 100)}%`,
      generatorLoadChange: `${gMult >= 1 ? '+' : ''}${Math.round((gMult - 1) * 100)}%`,
      fuelConsumptionChange: `${fMult >= 1 ? '+' : ''}${Math.round((fMult - 1) * 100)}%`,
      environment: envLabels[env] || 'Severe Cold',
      duration: `${durHours} Hours`
    },
    summary: {
      predictedPowerDemand: {
        value: finalPower,
        unit: 'kW',
        baseline: `${basePower} kW`,
        status: energyStatus
      },
      predictedFuelConsumption: {
        value: finalFuel,
        unit: 'L/hr',
        baseline: `${baseFuel} L/hr`,
        status: finalFuel > 30 ? 'warning' : 'normal'
      },
      estimatedFuelRemaining: {
        value: Number((18.4 * (1.2 / fMult)).toFixed(1)),
        unit: 'days',
        baseline: '22.1 days',
        status: fMult > 1.3 ? 'warning' : 'normal'
      },
      generatorStatus: {
        value: gMult > 1.15 ? 'Critical Load' : gMult > 1.05 ? 'High Load' : 'Nominal Load',
        loadPercent: `${Math.round(gMult * 82)}%`,
        status: gMult > 1.15 ? 'critical' : gMult > 1.05 ? 'warning' : 'normal'
      }
    },
    risks: {
      energyRisk: {
        level: energyRiskLevel,
        status: energyStatus
      },
      operationalRisk: {
        level: opRiskLevel,
        status: opStatus
      }
    },
    timeline,
    recommendation: finalPower > 90
      ? 'Consider reducing non-essential loads if generator load exceeds the safe operating threshold.'
      : 'Station operating envelope is within safety parameters under this simulated scenario.',
    generatedAt: new Date().toISOString()
  };
}
