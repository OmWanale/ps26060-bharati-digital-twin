import React, { useState } from 'react';
import { 
  X, 
  TrendingUp, 
  Sliders, 
  ArrowRight, 
  ArrowLeft,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import ForecastPanel from './ForecastPanel';
import ScenarioControlPanel from './ScenarioControlPanel';
import SimulationResultPanel from './SimulationResultPanel';
import { simulateScenario } from '../services/simulationService';
import { SIMULATION_SCENARIOS } from '../data/bharatiFloorData';

/**
 * WhatIfSimulationModal Component
 * 
 * Orchestrates the full 3-step operational simulation workflow:
 * 
 *   Step 1: ForecastPanel (Review Current & Baseline Forecast)
 *                 ↓
 *   Step 2: ScenarioControlPanel (Tune What-if Multipliers)
 *                 ↓
 *          SIMULATE SCENARIO
 *                 ↓
 *   Step 3: SimulationResultPanel (Inspect Predicted Outcomes)
 * 
 * Strictly decoupled from ML calculations via simulationService.js.
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is displayed.
 * @param {Function} props.onClose - Callback to close modal.
 * @param {Function} [props.onSelectPresetScenario] - Callback to apply pre-canned anomaly to station.
 * @param {Function} [props.onResetStationNominal] - Callback to reset station states.
 */
export default function WhatIfSimulationModal({
  isOpen,
  onClose,
  onSelectPresetScenario,
  onResetStationNominal
}) {
  // Active workflow step: 'forecast' | 'control' | 'results' | 'presets'
  const [activeStep, setActiveStep] = useState('forecast');

  // Simulation execution states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulationError, setSimulationError] = useState(null);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // STEP 2 -> STEP 3: Handle scenario simulation dispatch
  // ---------------------------------------------------------------------------
  const handleSimulate = async (scenarioObject) => {
    setIsSimulating(true);
    setSimulationError(null);

    try {
      // Step 2 & 3: Delegate execution to decoupled simulationService
      const result = await simulateScenario(scenarioObject);
      
      // Step 4: Store result
      setSimulationResult(result);
      
      // Step 5: Advance to SimulationResultPanel
      setActiveStep('results');
    } catch (err) {
      console.error('Simulation execution failed:', err);
      setSimulationError('The simulation engine was unable to compute results for the provided scenario.');
      setActiveStep('results');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* ================================================================ */}
        {/* MODAL HEADER WITH WORKFLOW STEPPER & PRESETS TOGGLE              */}
        {/* ================================================================ */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                What-If Simulation Engine
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                OPERATIONAL DIGITAL TWIN
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Model station operational changes and predict impact before taking action.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================ */}
        {/* NAVIGATION STEPPER TABS: 1. FORECAST -> 2. CONTROL -> 3. RESULTS */}
        {/* ================================================================ */}
        <div className="px-5 py-2.5 bg-gray-50 border-b border-gray-200/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5">
            {/* Step 1: Baseline Forecast */}
            <button
              type="button"
              onClick={() => setActiveStep('forecast')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeStep === 'forecast'
                  ? 'bg-white text-blue-700 shadow-2xs border border-gray-200'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>1. Baseline Forecast</span>
            </button>

            <span className="text-gray-300">→</span>

            {/* Step 2: Scenario Control */}
            <button
              type="button"
              onClick={() => setActiveStep('control')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeStep === 'control'
                  ? 'bg-white text-blue-700 shadow-2xs border border-gray-200'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>2. Scenario Control</span>
            </button>

            <span className="text-gray-300">→</span>

            {/* Step 3: Simulation Results */}
            <button
              type="button"
              onClick={() => setActiveStep('results')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeStep === 'results'
                  ? 'bg-white text-blue-700 shadow-2xs border border-gray-200'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>3. Simulation Results</span>
              {simulationResult && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              )}
            </button>
          </div>

          {/* Presets tab */}
          <button
            type="button"
            onClick={() => setActiveStep('presets')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeStep === 'presets'
                ? 'bg-amber-100 text-amber-800 font-bold'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Incident Presets
          </button>
        </div>

        {/* ================================================================ */}
        {/* MODAL BODY (SCROLLABLE CONTAINER)                                */}
        {/* ================================================================ */}
        <div className="flex-1 p-6 overflow-y-auto bg-white space-y-4">
          {/* -------------------------------------------------------------- */}
          {/* STEP 1: FORECAST PANEL                                         */}
          {/* -------------------------------------------------------------- */}
          {activeStep === 'forecast' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                <div>
                  <span className="font-bold">Step 1: Baseline Review.</span>
                  <p className="text-gray-600 mt-0.5">
                    Inspect current station baseline observations and unconstrained ML predictions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStep('control')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>Configure What-If</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* ForecastPanel Component */}
              <ForecastPanel />

              {/* Bottom Next Step Bar */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Ready to test hypothetical load or weather conditions?
                </span>
                <button
                  type="button"
                  onClick={() => setActiveStep('control')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Proceed to Scenario Control</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* STEP 2: SCENARIO CONTROL PANEL                                 */}
          {/* -------------------------------------------------------------- */}
          {activeStep === 'control' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-center justify-between">
                <div>
                  <span className="font-bold">Step 2: Operational Parameters.</span>
                  <p className="text-gray-600 mt-0.5">
                    Adjust multipliers for demand, generator load, and polar weather severity.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStep('forecast')}
                  className="px-2.5 py-1 bg-white hover:bg-gray-100 text-gray-700 rounded-md font-semibold text-xs border border-gray-200 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back to Baseline</span>
                </button>
              </div>

              {/* ScenarioControlPanel Component */}
              <ScenarioControlPanel 
                onSimulate={handleSimulate} 
              />
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* STEP 3: SIMULATION RESULT PANEL                                */}
          {/* -------------------------------------------------------------- */}
          {activeStep === 'results' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Navigation Action Bar */}
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={() => setActiveStep('control')}
                  className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Modify Scenario Parameters</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveStep('forecast')}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  View Baseline Forecast
                </button>
              </div>

              {/* SimulationResultPanel Component */}
              <SimulationResultPanel
                simulationResult={simulationResult}
                loading={isSimulating}
                error={simulationError}
                empty={!simulationResult && !isSimulating}
                onRunNewScenario={() => setActiveStep('control')}
              />
            </div>
          )}

          {/* -------------------------------------------------------------- */}
          {/* OPTIONAL TAB: PRESET INCIDENT ANOMALIES                        */}
          {/* -------------------------------------------------------------- */}
          {activeStep === 'presets' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="text-xs text-gray-600 font-medium">
                Test pre-programmed station emergency cases to verify automated fault detection and AI mitigation:
              </div>

              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {SIMULATION_SCENARIOS.map((scen) => (
                  <div
                    key={scen.id}
                    onClick={() => {
                      if (onSelectPresetScenario) onSelectPresetScenario(scen);
                      onClose();
                    }}
                    className="p-3.5 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-gray-900 group-hover:text-blue-600">
                        {scen.title}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        {scen.targetLevel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {scen.description}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                {onResetStationNominal && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetStationNominal();
                      onClose();
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Station to Nominal</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
