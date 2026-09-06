import React, { useState, useRef } from 'react';
import { 
  Zap, 
  Flame, 
  Hourglass, 
  Cpu, 
  AlertTriangle, 
  ShieldAlert, 
  Loader2, 
  AlertCircle, 
  Sliders, 
  Lightbulb, 
  Info,
  Calendar,
  CloudSnow
} from 'lucide-react';
import { DEFAULT_MOCK_SIMULATION_RESULT } from '../data/mockSimulationResult';
import ChartTooltip from './ChartTooltip';

/**
 * SimulationResultPanel Component
 * 
 * Displays the predicted outcome of a hypothetical operational scenario
 * for Bharati Antarctic Research Station.
 * 
 * @param {Object} props
 * @param {Object} [props.simulationResult] - Normalized simulation payload. If omitted, uses default mock result.
 * @param {boolean} [props.loading=false] - Whether simulation computation is in progress.
 * @param {boolean} [props.empty=false] - Whether no simulation has been run yet.
 * @param {string|null} [props.error=null] - Error message if simulation failed.
 * @param {Function} [props.onRunNewScenario] - Optional callback to return to scenario editor.
 * @param {string} [props.className] - Additional wrapper classes.
 */
export default function SimulationResultPanel({
  simulationResult: externalResult,
  loading = false,
  empty = false,
  error = null,
  onRunNewScenario,
  className = ''
}) {
  // Active metric displayed in the Forecast Trend line chart: 'power' | 'fuel' | 'both'
  const [activeChartMetric, setActiveChartMetric] = useState('power');

  // Interactive chart hover state
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const chartContainerRef = useRef(null);

  // Fallback to default mock result if no external result passed and not empty/loading
  const result = externalResult || (empty ? null : DEFAULT_MOCK_SIMULATION_RESULT);

  // Status visual helper (Green = Normal, Amber = Warning, Red = Critical)
  const getStatusBadge = (status) => {
    switch (status) {
      case 'critical':
        return {
          label: 'Critical',
          badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
          dotClass: 'bg-rose-500'
        };
      case 'warning':
        return {
          label: 'Warning',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          dotClass: 'bg-amber-500'
        };
      case 'normal':
      default:
        return {
          label: 'Normal',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dotClass: 'bg-emerald-500'
        };
    }
  };

  // ---------------------------------------------------------------------------
  // 1. LOADING STATE: "Simulation in progress..."
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-gray-200 min-h-[400px] space-y-4 ${className}`}>
        <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 tracking-tight">
            Simulation in progress...
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-[260px] leading-relaxed">
            Running ML forward simulation across station power, thermal, and fuel models.
          </p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
          SIMULATED / PREDICTED
        </span>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. ERROR STATE: "Unable to generate simulation results."
  // ---------------------------------------------------------------------------
  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-gray-200 min-h-[400px] space-y-3 ${className}`}>
        <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500">
          <AlertCircle className="w-6 h-6 stroke-[1.5]" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 tracking-tight">
            Unable to generate simulation results.
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-[260px] leading-relaxed">
            {typeof error === 'string' ? error : 'The simulation engine encountered an unexpected convergence error.'}
          </p>
        </div>
        {onRunNewScenario && (
          <button
            type="button"
            onClick={onRunNewScenario}
            className="mt-2 px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            Adjust Scenario Parameters
          </button>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. EMPTY STATE: "Run a scenario to view predicted results."
  // ---------------------------------------------------------------------------
  if (!result || !result.summary) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-gray-200 min-h-[400px] space-y-3 ${className}`}>
        <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400">
          <Sliders className="w-6 h-6 stroke-[1.5]" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900 tracking-tight">
            Run a scenario to view predicted results.
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-[260px] leading-relaxed">
            Configure What-If parameters in Scenario Control to predict station impact.
          </p>
        </div>
        {onRunNewScenario && (
          <button
            type="button"
            onClick={onRunNewScenario}
            className="mt-2 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            Open Scenario Control
          </button>
        )}
      </div>
    );
  }

  const { scenario, summary, risks, timeline, recommendation } = result;

  // Chart configuration
  const svgWidth = 440;
  const svgHeight = 150;
  const padding = { top: 20, right: 25, bottom: 28, left: 45 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  // Determine chart values based on active metric
  const points = timeline || [];
  const currentMetricValues = points.map((p) => (activeChartMetric === 'fuel' ? p.fuel : p.power));
  const rawMin = Math.min(...currentMetricValues);
  const rawMax = Math.max(...currentMetricValues);
  const marginRange = (rawMax - rawMin) * 0.15 || 5;
  const yMin = rawMin - marginRange;
  const yMax = rawMax + marginRange;

  const getX = (index) => {
    if (points.length <= 1) return padding.left + graphWidth / 2;
    return padding.left + (index / (points.length - 1)) * graphWidth;
  };

  const getY = (val) => {
    if (yMax === yMin) return padding.top + graphHeight / 2;
    return padding.top + graphHeight - ((val - yMin) / (yMax - yMin)) * graphHeight;
  };

  const pathD = points.reduce((acc, pt, i) => {
    const val = activeChartMetric === 'fuel' ? pt.fuel : pt.power;
    const x = getX(i);
    const y = getY(val);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Handle chart mouse move for snapping to nearest data point
  const handleChartMouseMove = (e) => {
    if (!chartContainerRef.current || points.length === 0) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const normX = (mouseX / rect.width) * svgWidth;

    let nearestIdx = 0;
    let minDiff = Infinity;
    points.forEach((_, i) => {
      const px = getX(i);
      const diff = Math.abs(normX - px);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = i;
      }
    });
    setHoveredIdx(nearestIdx);
  };

  const handleChartMouseLeave = () => {
    setHoveredIdx(null);
  };

  return (
    <div className={`bg-white rounded-xl flex flex-col space-y-4 ${className}`}>
      {/* -------------------------------------------------------------------- */}
      {/* HEADER, BADGE & SUBTITLE                                             */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 tracking-tight">
              Simulation Results
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              SIMULATED
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Based on selected scenario
          </p>
        </div>

        {/* Disclaimer indicator */}
        <div className="flex items-center gap-1 text-[10px] font-mono text-gray-400">
          <Info className="w-3 h-3 text-gray-400" />
          <span>Not live NCPOR data</span>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* SCENARIO THAT WAS SIMULATED CARD                                     */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-gray-50/90 border border-gray-200 rounded-xl p-3 text-xs space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 border-b border-gray-200/70 pb-1.5">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            Simulated Scenario Parameters
          </span>
          <span className="text-[10px] font-mono text-gray-400">INPUTS</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5 text-[11px]">
          <div>
            <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Power Demand</span>
            <span className="font-mono font-bold text-gray-800">{scenario.powerDemandChange || '100%'}</span>
          </div>

          <div>
            <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Generator Load</span>
            <span className="font-mono font-bold text-gray-800">{scenario.generatorLoadChange || '100%'}</span>
          </div>

          <div>
            <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Fuel Consumption</span>
            <span className="font-mono font-bold text-gray-800">{scenario.fuelConsumptionChange || '100%'}</span>
          </div>

          <div>
            <span className="text-gray-400 text-[10px] uppercase tracking-wider block flex items-center gap-1">
              <CloudSnow className="w-2.5 h-2.5" /> Environment
            </span>
            <span className="font-semibold text-gray-800">{scenario.environment || 'Normal'}</span>
          </div>

          <div>
            <span className="text-gray-400 text-[10px] uppercase tracking-wider block flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> Duration
            </span>
            <span className="font-mono font-semibold text-blue-700">{scenario.duration || '24 Hours'}</span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* IMPACT SUMMARY SECTION (6 CARDS)                                     */}
      {/* -------------------------------------------------------------------- */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-900 tracking-tight uppercase tracking-wider">
            Impact Summary
          </h3>
          <span className="text-[10px] font-mono text-gray-400">
            SIMULATED PREDICTIONS
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {/* 1. Predicted Power Demand */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-blue-600" />
                Power Demand
              </span>
              {(() => {
                const s = getStatusBadge(summary.predictedPowerDemand?.status);
                return (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${s.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dotClass}`}></span>
                    {s.label}
                  </span>
                );
              })()}
            </div>
            <div>
              <div className="text-base font-bold font-mono text-gray-900">
                {summary.predictedPowerDemand?.value} {summary.predictedPowerDemand?.unit}
              </div>
              <span className="text-[10px] text-gray-400">
                Baseline: {summary.predictedPowerDemand?.baseline || '72.0 kW'}
              </span>
            </div>
          </div>

          {/* 2. Predicted Fuel Consumption */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                Fuel Consumption
              </span>
              {(() => {
                const s = getStatusBadge(summary.predictedFuelConsumption?.status);
                return (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${s.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dotClass}`}></span>
                    {s.label}
                  </span>
                );
              })()}
            </div>
            <div>
              <div className="text-base font-bold font-mono text-gray-900">
                {summary.predictedFuelConsumption?.value} {summary.predictedFuelConsumption?.unit}
              </div>
              <span className="text-[10px] text-gray-400">
                Baseline: {summary.predictedFuelConsumption?.baseline || '26.4 L/hr'}
              </span>
            </div>
          </div>

          {/* 3. Estimated Fuel Remaining */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                <Hourglass className="w-3.5 h-3.5 text-teal-600" />
                Fuel Remaining
              </span>
              {(() => {
                const s = getStatusBadge(summary.estimatedFuelRemaining?.status);
                return (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${s.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dotClass}`}></span>
                    {s.label}
                  </span>
                );
              })()}
            </div>
            <div>
              <div className="text-base font-bold font-mono text-gray-900">
                {summary.estimatedFuelRemaining?.value} {summary.estimatedFuelRemaining?.unit}
              </div>
              <span className="text-[10px] text-gray-400">
                At predicted burn rate
              </span>
            </div>
          </div>

          {/* 4. Generator Status */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                Generator Status
              </span>
              {(() => {
                const s = getStatusBadge(summary.generatorStatus?.status);
                return (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${s.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dotClass}`}></span>
                    {s.label}
                  </span>
                );
              })()}
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">
                {summary.generatorStatus?.value}
              </div>
              <span className="text-[10px] text-gray-400 font-mono">
                Load factor: {summary.generatorStatus?.loadPercent || '85%'}
              </span>
            </div>
          </div>

          {/* 5. Energy Risk */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Energy Risk
              </span>
              {(() => {
                const s = getStatusBadge(risks.energyRisk?.status);
                return (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${s.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dotClass}`}></span>
                    {s.label}
                  </span>
                );
              })()}
            </div>
            <div>
              <div className="text-sm font-bold text-amber-900">
                {risks.energyRisk?.level}
              </div>
              <span className="text-[10px] text-gray-400 truncate block">
                Thermal & bus margins
              </span>
            </div>
          </div>

          {/* 6. Operational Risk */}
          <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-1.5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                Operational Risk
              </span>
              {(() => {
                const s = getStatusBadge(risks.operationalRisk?.status);
                return (
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${s.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dotClass}`}></span>
                    {s.label}
                  </span>
                );
              })()}
            </div>
            <div>
              <div className="text-sm font-bold text-rose-900">
                {risks.operationalRisk?.level}
              </div>
              <span className="text-[10px] text-gray-400 truncate block">
                Environmental severity impact
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* FORECAST TREND SECTION (SIMPLE LINE CHART)                          */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-gray-900 tracking-tight">
              Forecast Trend
            </h3>
            <span className="text-[11px] text-gray-500 font-medium">
              Simulated {activeChartMetric === 'power' ? 'Power Demand (kW)' : 'Fuel Consumption (L/hr)'} over {scenario.duration}
            </span>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center p-0.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setActiveChartMetric('power')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                activeChartMetric === 'power'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Power (kW)
            </button>
            <button
              type="button"
              onClick={() => setActiveChartMetric('fuel')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                activeChartMetric === 'fuel'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Fuel (L/hr)
            </button>
          </div>
        </div>

        {/* Responsive SVG Line Chart with Interactive Hover */}
        <div 
          ref={chartContainerRef}
          className="w-full relative overflow-visible cursor-crosshair"
          onMouseMove={handleChartMouseMove}
          onMouseLeave={handleChartMouseLeave}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none overflow-visible"
          >
            {/* Horizontal Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const y = padding.top + ratio * graphHeight;
              const val = yMax - ratio * (yMax - yMin);
              return (
                <g key={idx}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={svgWidth - padding.right}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="0.75"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[9px] font-mono fill-gray-400"
                  >
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels */}
            {points.map((pt, i) => (
              <text
                key={i}
                x={getX(i)}
                y={svgHeight - 8}
                textAnchor="middle"
                className={`text-[9px] font-mono font-medium transition-colors ${
                  hoveredIdx === i ? 'fill-blue-600 font-bold' : 'fill-gray-500'
                }`}
              >
                {pt.time}
              </text>
            ))}

            {/* Trend Polyline */}
            <path
              d={pathD}
              fill="none"
              stroke={activeChartMetric === 'power' ? '#2563eb' : '#d97706'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data point dots & values */}
            {points.map((pt, i) => {
              const val = activeChartMetric === 'fuel' ? pt.fuel : pt.power;
              const x = getX(i);
              const y = getY(val);
              const isHovered = hoveredIdx === i;
              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? "5.5" : "3.5"}
                    className="fill-white transition-all"
                    stroke={activeChartMetric === 'power' ? '#2563eb' : '#d97706'}
                    strokeWidth={isHovered ? "2.5" : "2"}
                  />
                  <text
                    x={x}
                    y={y - 8}
                    textAnchor="middle"
                    className={`text-[8.5px] font-mono font-bold transition-all ${
                      isHovered ? 'fill-blue-700' : 'fill-gray-700'
                    }`}
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Interactive Vertical Crosshair Guide */}
            {hoveredIdx !== null && points[hoveredIdx] && (
              <g className="pointer-events-none transition-all duration-150">
                <line
                  x1={getX(hoveredIdx)}
                  y1={padding.top}
                  x2={getX(hoveredIdx)}
                  y2={svgHeight - padding.bottom}
                  stroke={activeChartMetric === 'power' ? '#3b82f6' : '#f59e0b'}
                  strokeWidth="1.25"
                  strokeDasharray="3,2"
                  opacity="0.8"
                />
                {(() => {
                  const val = activeChartMetric === 'fuel' ? points[hoveredIdx].fuel : points[hoveredIdx].power;
                  return (
                    <circle
                      cx={getX(hoveredIdx)}
                      cy={getY(val)}
                      r="6"
                      fill={activeChartMetric === 'power' ? '#2563eb' : '#d97706'}
                      stroke="#fff"
                      strokeWidth="2.5"
                    />
                  );
                })()}
              </g>
            )}
          </svg>

          {/* Interactive Floating Hover Tooltip */}
          {hoveredIdx !== null && points[hoveredIdx] && (() => {
            const pt = points[hoveredIdx];
            const ptX = getX(hoveredIdx);
            const xPercent = (ptX / svgWidth) * 100;
            const timeLabel = pt.time.endsWith('h') 
              ? `+${pt.time.replace('h', '')} hours` 
              : pt.time;

            return (
              <ChartTooltip
                timestamp={timeLabel}
                subtitle="Simulated"
                items={[
                  {
                    label: 'Predicted Power Demand',
                    value: pt.power,
                    unit: 'kW',
                    color: '#2563eb',
                    isForecast: true
                  },
                  {
                    label: 'Fuel Consumption',
                    value: pt.fuel,
                    unit: 'L/hr',
                    color: '#d97706',
                    isForecast: true
                  }
                ]}
                xPercent={xPercent}
                yPercent={40}
                flipLeft={xPercent > 55}
              />
            );
          })()}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* OPERATOR RECOMMENDATION SECTION                                      */}
      {/* -------------------------------------------------------------------- */}
      <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-3.5 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
          <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Operator Recommendation</span>
          <span className="text-[9px] font-mono font-normal text-amber-700 ml-auto bg-amber-100/70 px-1.5 py-0.2 rounded">
            Hypothetical Mitigation
          </span>
        </div>
        <p className="text-xs text-amber-900/90 leading-relaxed font-medium pl-5.5">
          {recommendation}
        </p>
      </div>
    </div>
  );
}
