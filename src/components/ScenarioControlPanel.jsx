import React, { useState } from 'react';
import { 
  Sliders, 
  Zap, 
  Cpu, 
  Flame, 
  CloudSnow, 
  Clock, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  PlayCircle,
  RotateCcw
} from 'lucide-react';

/**
 * Environmental conditions available for simulation
 */
const ENVIRONMENTAL_OPTIONS = [
  { label: 'Normal', value: 'normal', description: 'Standard Antarctic summer conditions (-10°C to -15°C)' },
  { label: 'Cold Conditions', value: 'cold_conditions', description: 'Drop to -25°C with moderate winds' },
  { label: 'Severe Cold', value: 'severe_cold', description: 'Deep freeze (-35°C) with elevated station heating demand' },
  { label: 'Extreme Cold', value: 'extreme_cold', description: 'Polar blizzard (-45°C), maximum insulation stress' }
];

/**
 * Simulation duration horizons
 */
const DURATION_OPTIONS = [
  { label: '6 Hours', hours: 6 },
  { label: '12 Hours', hours: 12 },
  { label: '24 Hours', hours: 24 },
  { label: '48 Hours', hours: 48 },
  { label: '72 Hours', hours: 72 }
];

/**
 * ScenarioControlPanel Component
 * 
 * Frontend control interface for generating hypothetical "What-if" scenarios
 * for Bharati Antarctic Research Station. Emits a normalized scenario object
 * to be consumed by an ML simulation engine.
 * 
 * @param {Object} props
 * @param {Function} [props.onSimulate] - Callback invoked with normalized scenario object.
 * @param {string} [props.className] - Additional wrapper styling classes.
 */
export default function ScenarioControlPanel({
  onSimulate,
  className = ''
}) {
  // Input states
  const [powerDemand, setPowerDemand] = useState(100);       // 50% — 150% (Default 100%)
  const [generatorLoad, setGeneratorLoad] = useState(100);   // 50% — 120% (Default 100%)
  const [fuelConsumption, setFuelConsumption] = useState(100); // 50% — 150% (Default 100%)
  const [environment, setEnvironment] = useState('Normal');  // 'Normal' | 'Cold Conditions' | 'Severe Cold' | 'Extreme Cold'
  const [duration, setDuration] = useState('24 Hours');      // '6 Hours' | '12 Hours' | '24 Hours' | '48 Hours' | '72 Hours'

  // UI status state: 'idle' | 'running' | 'success' | 'error'
  const [status, setStatus] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('Ready to simulate');

  // Reset to default baseline values
  const handleResetToBaseline = () => {
    setPowerDemand(100);
    setGeneratorLoad(100);
    setFuelConsumption(100);
    setEnvironment('Normal');
    setDuration('24 Hours');
    setStatus('idle');
    setStatusMessage('Ready to simulate');
  };

  // Convert current form values into the structured scenario contract
  const buildScenarioPayload = () => {
    const selectedEnv = ENVIRONMENTAL_OPTIONS.find((e) => e.label === environment) || ENVIRONMENTAL_OPTIONS[0];
    const selectedDur = DURATION_OPTIONS.find((d) => d.label === duration) || DURATION_OPTIONS[2];

    return {
      power_demand_multiplier: Number((powerDemand / 100).toFixed(2)),
      generator_load_multiplier: Number((generatorLoad / 100).toFixed(2)),
      fuel_consumption_multiplier: Number((fuelConsumption / 100).toFixed(2)),
      environmental_condition: selectedEnv.value,
      duration_hours: selectedDur.hours,
      timestamp: new Date().toISOString()
    };
  };

  // Handle simulation trigger
  const handleSimulateClick = async () => {
    if (status === 'running') return;

    setStatus('running');
    setStatusMessage('Running simulation...');

    const scenarioPayload = buildScenarioPayload();

    try {
      if (onSimulate) {
        // Support either async or sync callback from parent
        const result = onSimulate(scenarioPayload);
        if (result instanceof Promise) {
          await result;
        } else {
          // Mock timeout to demonstrate UI flow smoothly
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      } else {
        // Default mock demonstration timeout
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      setStatus('success');
      setStatusMessage('Simulation completed');
    } catch (err) {
      console.error('Scenario simulation failed:', err);
      setStatus('error');
      setStatusMessage('Simulation failed');
    }
  };

  return (
    <div className={`bg-white rounded-xl flex flex-col space-y-5 ${className}`}>
      {/* -------------------------------------------------------------------- */}
      {/* HEADER, SUBTITLE & BADGE                                             */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 tracking-tight">
              Scenario Control
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              WHAT-IF SIMULATION
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Simulate operational changes
          </p>
        </div>

        {/* Reset to baseline button */}
        {(powerDemand !== 100 || generatorLoad !== 100 || fuelConsumption !== 100 || environment !== 'Normal' || duration !== '24 Hours') && (
          <button
            type="button"
            onClick={handleResetToBaseline}
            disabled={status === 'running'}
            className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors cursor-pointer"
            title="Reset to 100% Baseline"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* INPUT CONTROLS SECTION                                               */}
      {/* -------------------------------------------------------------------- */}
      <div className="space-y-4">
        {/* 1. Power Demand Slider (50% — 150%) */}
        <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Power Demand</span>
            </label>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs">
                {powerDemand}%
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                of baseline
              </span>
            </div>
          </div>

          <input
            type="range"
            min="50"
            max="150"
            step="1"
            value={powerDemand}
            onChange={(e) => {
              setPowerDemand(Number(e.target.value));
              if (status !== 'idle') setStatus('idle');
            }}
            disabled={status === 'running'}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="flex justify-between text-[10px] font-mono text-gray-400">
            <span>50%</span>
            <span className="font-semibold text-gray-500">100% (Baseline)</span>
            <span>150%</span>
          </div>
        </div>

        {/* 2. Generator Load Slider (50% — 120%) */}
        <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>Generator Load</span>
            </label>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs">
                {generatorLoad}%
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                rated capacity
              </span>
            </div>
          </div>

          <input
            type="range"
            min="50"
            max="120"
            step="1"
            value={generatorLoad}
            onChange={(e) => {
              setGeneratorLoad(Number(e.target.value));
              if (status !== 'idle') setStatus('idle');
            }}
            disabled={status === 'running'}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />

          <div className="flex justify-between text-[10px] font-mono text-gray-400">
            <span>50%</span>
            <span className="font-semibold text-gray-500">100%</span>
            <span>120% (Peak)</span>
          </div>
        </div>

        {/* 3. Fuel Consumption Slider (50% — 150%) */}
        <div className="bg-gray-50/70 border border-gray-200/80 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              <span>Fuel Consumption</span>
            </label>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200 shadow-2xs">
                {fuelConsumption}%
              </span>
              <span className="text-[11px] text-gray-500 font-medium">
                flow rate
              </span>
            </div>
          </div>

          <input
            type="range"
            min="50"
            max="150"
            step="1"
            value={fuelConsumption}
            onChange={(e) => {
              setFuelConsumption(Number(e.target.value));
              if (status !== 'idle') setStatus('idle');
            }}
            disabled={status === 'running'}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
          />

          <div className="flex justify-between text-[10px] font-mono text-gray-400">
            <span>50%</span>
            <span className="font-semibold text-gray-500">100%</span>
            <span>150%</span>
          </div>
        </div>

        {/* 4 & 5: Environmental Severity & Simulation Duration Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Environmental Severity */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <CloudSnow className="w-3.5 h-3.5 text-cyan-600" />
              <span>Environmental Severity</span>
            </label>
            <select
              value={environment}
              onChange={(e) => {
                setEnvironment(e.target.value);
                if (status !== 'idle') setStatus('idle');
              }}
              disabled={status === 'running'}
              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              {ENVIRONMENTAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Simulation Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Simulation Duration</span>
            </label>
            <select
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value);
                if (status !== 'idle') setStatus('idle');
              }}
              disabled={status === 'running'}
              className="w-full px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-2xs"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.hours} value={opt.label}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* SCENARIO SUMMARY COMPACT CARD                                        */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
          <h3 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-gray-600" />
            <span>Scenario Summary</span>
          </h3>
          <span className="text-[10px] font-mono text-gray-500">
            Multiplier Matrix
          </span>
        </div>

        <div className="grid grid-cols-2 gap-y-2 text-xs">
          <div className="flex items-center justify-between pr-3 border-r border-gray-200/60">
            <span className="text-gray-500 font-medium">Power Demand:</span>
            <span className="font-mono font-bold text-gray-900">{powerDemand}%</span>
          </div>

          <div className="flex items-center justify-between pl-3">
            <span className="text-gray-500 font-medium">Generator Load:</span>
            <span className="font-mono font-bold text-gray-900">{generatorLoad}%</span>
          </div>

          <div className="flex items-center justify-between pr-3 border-r border-gray-200/60">
            <span className="text-gray-500 font-medium">Fuel Consumption:</span>
            <span className="font-mono font-bold text-gray-900">{fuelConsumption}%</span>
          </div>

          <div className="flex items-center justify-between pl-3">
            <span className="text-gray-500 font-medium">Environment:</span>
            <span className="font-semibold text-gray-900 truncate max-w-[100px]" title={environment}>
              {environment}
            </span>
          </div>

          <div className="flex items-center justify-between pr-3 border-r border-gray-200/60 col-span-2 pt-1 border-t border-gray-100">
            <span className="text-gray-500 font-medium">Duration:</span>
            <span className="font-mono font-bold text-blue-700">{duration}</span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* SIMULATION ACTION & STATUS                                           */}
      {/* -------------------------------------------------------------------- */}
      <div className="space-y-2 pt-1">
        {/* Status Indicator Banner */}
        <div className="flex items-center justify-between text-xs px-1">
          <span className="text-gray-500 font-medium">Engine Status:</span>
          <div className="flex items-center gap-1.5">
            {status === 'running' && (
              <span className="inline-flex items-center gap-1.5 font-bold text-blue-700">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {statusMessage}
              </span>
            )}
            {status === 'success' && (
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                {statusMessage}
              </span>
            )}
            {status === 'error' && (
              <span className="inline-flex items-center gap-1.5 font-bold text-rose-700">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                {statusMessage}
              </span>
            )}
            {status === 'idle' && (
              <span className="inline-flex items-center gap-1.5 font-medium text-gray-500">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                {statusMessage}
              </span>
            )}
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleSimulateClick}
          disabled={status === 'running'}
          className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-75 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          {status === 'running' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>TRANSMITTING PARAMETERS...</span>
            </>
          ) : (
            <>
              <PlayCircle className="w-4 h-4 text-white" />
              <span>SIMULATE SCENARIO</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
