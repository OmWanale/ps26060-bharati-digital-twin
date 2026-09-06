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
  CloudSnow,
  Clock
} from 'lucide-react';
import { DEFAULT_MOCK_SIMULATION_RESULT } from '../data/mockSimulationResult';

/**
 * Generate smooth cubic Catmull-Rom/Bézier spline path across points
 */
function getSmoothSplinePath(pts) {
  if (!pts || pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

  let path = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return path;
}

/**
 * Evaluate cubic Catmull-Rom/Bézier curve at fractional parameter u [0, 1] on segment i
 */
function getSplineValueAtU(values, i, u) {
  if (!values || values.length === 0) return 0;
  if (values.length === 1) return values[0];
  const N = values.length - 1;
  const seg = Math.max(0, Math.min(N - 1, i));

  const v0 = seg > 0 ? values[seg - 1] : values[seg];
  const v1 = values[seg];
  const v2 = values[seg + 1];
  const v3 = seg < N - 1 ? values[seg + 2] : v2;

  const cp1 = v1 + (v2 - v0) / 6;
  const cp2 = v2 - (v3 - v1) / 6;

  const oneMinusU = 1 - u;
  return (
    Math.pow(oneMinusU, 3) * v1 +
    3 * Math.pow(oneMinusU, 2) * u * cp1 +
    3 * oneMinusU * Math.pow(u, 2) * cp2 +
    Math.pow(u, 3) * v2
  );
}

/**
 * Robustly parse timeline time strings (e.g. "10:00", "0h", "6h", "12.5h") to total minutes
 */
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const str = String(timeStr).trim();
  const colonMatch = str.match(/(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
  }
  const hourMatch = str.match(/([0-9.]+)\s*h/i);
  if (hourMatch) {
    return parseFloat(hourMatch[1]) * 60;
  }
  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num * 60;
}

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
  // Active metric displayed in the Forecast Trend line chart: 'power' | 'fuel'
  const [activeChartMetric, setActiveChartMetric] = useState('power');

  // Continuous hover tracking state (exact position & interpolated values)
  const [cursorPos, setCursorPos] = useState(null);
  const [cursorData, setCursorData] = useState(null);
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

  // Build plotted coordinates array for smooth spline curve
  const pts = points.map((pt, i) => ({
    x: getX(i),
    y: getY(activeChartMetric === 'fuel' ? pt.fuel : pt.power),
    power: pt.power,
    fuel: pt.fuel,
    time: pt.time,
    index: i
  }));

  const smoothCurveD = getSmoothSplinePath(pts);
  const areaGradientD = pts.length > 1
    ? `${smoothCurveD} L ${pts[pts.length - 1].x.toFixed(2)} ${(padding.top + graphHeight).toFixed(2)} L ${pts[0].x.toFixed(2)} ${(padding.top + graphHeight).toFixed(2)} Z`
    : '';

  // Baseline data values for reference line
  const baselinePower = parseFloat(summary?.predictedPowerDemand?.baseline) || 72.0;
  const baselineFuel = parseFloat(summary?.predictedFuelConsumption?.baseline) || 26.4;
  const baselineVal = activeChartMetric === 'fuel' ? baselineFuel : baselinePower;
  const baselineY = getY(baselineVal);

  // Handle continuous cursor hover & interpolation across the graph
  const handleChartMouseMove = (e) => {
    if (!chartContainerRef.current || points.length < 2) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const normX = (mouseX / rect.width) * svgWidth;

    // Clamp within chart drawable bounds
    const minX = padding.left;
    const maxX = padding.left + graphWidth;
    const clampedX = Math.max(minX, Math.min(maxX, normX));
    const ratio = (clampedX - minX) / graphWidth; // 0.0 to 1.0

    // Continuous timeline segment interpolation
    const N = points.length - 1;
    const idxFloat = ratio * N;
    const i = Math.min(Math.floor(idxFloat), N - 1);
    const u = idxFloat - i; // fractional position between point i and i+1

    const p0 = points[i];
    const p1 = points[i + 1];

    // Smooth spline values interpolation
    const powerValues = points.map((p) => p.power);
    const fuelValues = points.map((p) => p.fuel);
    const interpPower = Number(getSplineValueAtU(powerValues, i, u).toFixed(1));
    const interpFuel = Number(getSplineValueAtU(fuelValues, i, u).toFixed(1));

    // Continuous exact time calculation
    const m0 = parseTimeToMinutes(p0.time);
    const m1 = parseTimeToMinutes(p1.time);
    const totalMinutes = m0 + u * (m1 - m0);

    const hrs = Math.floor(totalMinutes / 60);
    let mins = Math.round(totalMinutes % 60);
    let adjHrs = hrs;
    if (mins >= 60) {
      adjHrs += 1;
      mins = 0;
    }
    const timeFormatted = `${String(adjHrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    // Active metric exact Y coordinate on the smooth curve
    const activeVal = activeChartMetric === 'fuel' ? interpFuel : interpPower;
    const activeY = getY(activeVal);

    setCursorPos({
      x: clampedX,
      y: activeY,
      xPercent: (clampedX / svgWidth) * 100,
      yPercent: (activeY / svgHeight) * 100
    });

    setCursorData({
      time: timeFormatted,
      power: interpPower,
      fuel: interpFuel,
      temperature: (p0.temperature !== undefined && p1.temperature !== undefined)
        ? Number((p0.temperature + u * (p1.temperature - p0.temperature)).toFixed(1))
        : undefined,
      activeVal
    });
  };

  const handleChartMouseLeave = () => {
    setCursorPos(null);
    setCursorData(null);
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

        {/* Responsive SVG Line Chart with Smooth Curve & Continuous Crosshair */}
        <div 
          ref={chartContainerRef}
          className="w-full relative overflow-visible cursor-crosshair rounded-xl"
          onMouseMove={handleChartMouseMove}
          onMouseLeave={handleChartMouseLeave}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto select-none overflow-visible"
          >
            <defs>
              <linearGradient id="sim-power-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="sim-fuel-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d97706" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.01" />
              </linearGradient>
            </defs>

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
                    stroke="#f1f5f9"
                    strokeWidth="1"
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

            {/* Baseline Reference Line: BASELINE -> SIMULATED RESULT */}
            {baselineY >= padding.top && baselineY <= padding.top + graphHeight && (
              <g className="pointer-events-none">
                <line
                  x1={padding.left}
                  y1={baselineY}
                  x2={svgWidth - padding.right}
                  y2={baselineY}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity="0.65"
                />
                <text
                  x={svgWidth - padding.right}
                  y={baselineY - 4}
                  textAnchor="end"
                  className="text-[8.5px] font-mono fill-slate-500 font-semibold"
                >
                  Baseline: {baselineVal.toFixed(1)} {activeChartMetric === 'power' ? 'kW' : 'L/hr'}
                </text>
              </g>
            )}

            {/* X-axis labels */}
            {points.map((pt, i) => (
              <text
                key={i}
                x={getX(i)}
                y={svgHeight - 8}
                textAnchor="middle"
                className="text-[9px] font-mono fill-gray-500 font-medium"
              >
                {pt.time}
              </text>
            ))}

            {/* Subtle Gradient Area Fill under Curve */}
            {areaGradientD && (
              <path
                d={areaGradientD}
                fill={`url(#${activeChartMetric === 'power' ? 'sim-power-gradient' : 'sim-fuel-gradient'})`}
                className="transition-all duration-300 pointer-events-none"
              />
            )}

            {/* Smooth Spline Curve (Visually interpolates between existing points) */}
            <path
              d={smoothCurveD}
              fill="none"
              stroke={activeChartMetric === 'power' ? '#2563eb' : '#d97706'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-300 ease-out"
            />

            {/* Clean Terminal Data Points (No dozens of permanent dots) */}
            {pts.map((pt, i) => {
              const isTerminal = i === 0 || i === pts.length - 1;
              return (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={isTerminal ? "3.5" : "1.75"}
                  fill="#ffffff"
                  stroke={activeChartMetric === 'power' ? '#2563eb' : '#d97706'}
                  strokeWidth={isTerminal ? "2" : "1"}
                  opacity={isTerminal ? 0.95 : 0.3}
                  className="transition-all duration-300 pointer-events-none"
                />
              );
            })}

            {/* Continuous Precise Crosshair & Active Point */}
            {cursorPos && (
              <g className="pointer-events-none transition-opacity duration-100">
                {/* Thin, slightly transparent vertical guide line */}
                <line
                  x1={cursorPos.x}
                  y1={padding.top}
                  x2={cursorPos.x}
                  y2={svgHeight - padding.bottom}
                  stroke={activeChartMetric === 'power' ? '#60a5fa' : '#f59e0b'}
                  strokeWidth="1.25"
                  strokeDasharray="3 3"
                  opacity="0.8"
                />
                {/* Subtle active glow halo */}
                <circle
                  cx={cursorPos.x}
                  cy={cursorPos.y}
                  r="9"
                  fill={activeChartMetric === 'power' ? 'rgba(37, 99, 235, 0.18)' : 'rgba(217, 119, 6, 0.18)'}
                />
                {/* Active Highlighted Point following cursor on the curve */}
                <circle
                  cx={cursorPos.x}
                  cy={cursorPos.y}
                  r="4.5"
                  fill={activeChartMetric === 'power' ? '#2563eb' : '#d97706'}
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  className="drop-shadow-sm"
                />
              </g>
            )}
          </svg>

          {/* Continuous Hover Tooltip */}
          {cursorPos && cursorData && (() => {
            const flipLeft = cursorPos.xPercent > 55;
            const clampedYPercent = Math.max(22, Math.min(78, cursorPos.yPercent));

            return (
              <div
                className="absolute z-30 pointer-events-none transition-transform duration-75 ease-out rounded-xl border border-slate-700/80 bg-slate-900/95 text-white shadow-xl p-3 min-w-[175px] backdrop-blur-md ring-1 ring-white/10 text-left"
                style={{
                  left: flipLeft ? undefined : `${cursorPos.xPercent}%`,
                  right: flipLeft ? `${100 - cursorPos.xPercent}%` : undefined,
                  top: `${clampedYPercent}%`,
                  transform: `translate(${flipLeft ? '-14px' : '14px'}, -50%)`,
                }}
              >
                {/* Time Header */}
                <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    <Clock className="w-3 h-3 text-blue-400 shrink-0" />
                    <span>Time</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-white tracking-wide">
                    {cursorData.time}
                  </span>
                </div>

                {/* Parameters (Only show parameters that actually exist) */}
                <div className="space-y-1.5 text-xs">
                  {cursorData.power !== undefined && !isNaN(cursorData.power) && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-slate-300 font-medium text-[11px]">Power Demand</span>
                      </div>
                      <span className="font-mono font-bold text-white text-xs whitespace-nowrap">
                        {cursorData.power.toFixed(1)} kW
                      </span>
                    </div>
                  )}

                  {cursorData.temperature !== undefined && !isNaN(cursorData.temperature) && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-slate-300 font-medium text-[11px]">Temperature</span>
                      </div>
                      <span className="font-mono font-bold text-white text-xs whitespace-nowrap">
                        {cursorData.temperature.toFixed(1)} °C
                      </span>
                    </div>
                  )}

                  {cursorData.fuel !== undefined && !isNaN(cursorData.fuel) && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-slate-300 font-medium text-[11px]">Fuel Consumption</span>
                      </div>
                      <span className="font-mono font-bold text-white text-xs whitespace-nowrap">
                        {cursorData.fuel.toFixed(1)} L/hr
                      </span>
                    </div>
                  )}
                </div>

                {/* Delta vs Baseline */}
                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span className="text-slate-500">SIMULATED</span>
                  <span className={activeChartMetric === 'power' ? 'text-blue-400 font-semibold' : 'text-amber-400 font-semibold'}>
                    {activeChartMetric === 'power'
                      ? `${cursorData.power >= baselinePower ? '+' : ''}${(cursorData.power - baselinePower).toFixed(1)} kW`
                      : `${cursorData.fuel >= baselineFuel ? '+' : ''}${(cursorData.fuel - baselineFuel).toFixed(1)} L/hr`}
                  </span>
                </div>
              </div>
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
