import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Cpu, 
  Flame, 
  Droplets, 
  Package, 
  Wind, 
  Ship, 
  Layers,
  ChevronDown,
  Database,
  RefreshCw
} from 'lucide-react';
import equipmentSnapshot from '../../ML models/equipment_snapshot.json';
import waterForecastSnapshot from '../../ML models/water_forecast.json';
import hvacForecastSnapshot from '../../ML models/hvac_forecast.json';
import inventorySnapshot from '../../ML models/inventory_snapshot.json';
import fuelForecastSnapshot from '../../ML models/fuel_forecast.json';
import resupplySnapshot from '../../ML models/resupply_snapshot.json';

const ML_MODELS = [
  {
    id: 'equipment_health',
    name: 'Equipment Health',
    category: 'Predictive Maintenance',
    icon: Cpu,
    tag: 'RandomForest Classifier & Regressor',
    target: 'Health Score (0-100), Anomaly Detection, Failure Risk %',
    fileRef: 'ML models/equipment_snapshot.json',
    description: 'Predictive health scoring and anomaly detection across critical station machinery, generators, pumps, and compressors.'
  },
  {
    id: 'water_forecast',
    name: 'Water Forecast',
    category: 'Life Support & Hydrology',
    icon: Droplets,
    tag: 'Demand & Storage Regression',
    target: 'timestamp, tank_level_pct',
    fileRef: 'ML models/water_forecast.json',
    description: 'Hourly predicted fresh water tank level percentages over a 72-hour operational trajectory.'
  },
  {
    id: 'hvac',
    name: 'HVAC',
    category: 'Thermal Habitat Control',
    icon: Wind,
    tag: 'Heating Load Multi-Step Model',
    target: 'timestamp, heating_load_kw',
    fileRef: 'ML models/hvac_forecast.json',
    description: 'Hourly heating load demand predictions (kW) across the station thermal envelope over a 72-hour forecast horizon.'
  },
  {
    id: 'inventory',
    name: 'Inventory',
    category: 'Logistics & Stock Control',
    icon: Package,
    tag: 'Inventory Depletion Classifier',
    target: 'item_id, closing_stock, days_remaining, predicted_reorder_needed',
    fileRef: 'ML models/inventory_snapshot.json',
    description: 'Predictive closing stock, days of autonomous supply remaining, and reorder alerts across station inventory items.'
  },
  {
    id: 'fuel_forecast',
    name: 'Fuel Forecast',
    category: 'Energy & Power Security',
    icon: Flame,
    tag: 'Recursive Time-Series Forecast',
    target: 'timestamp, fuel_level_l, burn_rate_lph, days_remaining',
    fileRef: 'ML models/fuel_forecast.json',
    description: 'Hourly predicted fuel tank reserves, burn rates (L/hr), and autonomous run-days remaining over a 72-hour forecast horizon.'
  },
  {
    id: 'resupply',
    name: 'Resupply',
    category: 'Expedition Logistics',
    icon: Ship,
    tag: 'Multi-Risk Voyage Heuristic Classifier',
    target: 'shipment_id, planned_date, estimated_arrival, weather_risk, inventory_urgency, route_status, delay_risk, predicted_risk_score',
    fileRef: 'ML models/resupply_snapshot.json',
    description: 'Voyage window risk assessment, sea-ice navigational delay predictions, and expedition cargo manifest prioritization.'
  }
];

// ============================================================================
// 1. EQUIPMENT HEALTH PREDICTION VIEW
// ============================================================================
function EquipmentHealthPredictionView({ data, onRefresh, isRefreshing, lastUpdated }) {
  const avgHealth = (data.reduce((sum, item) => sum + item.predicted_health_score, 0) / (data.length || 1)).toFixed(1);
  const anomalyCount = data.filter((item) => item.predicted_anomaly).length;
  const highRiskCount = data.filter((item) => item.failure_risk_pct >= 80).length;

  return (
    <div className="space-y-6">
      {/* 4 Summary Stat KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Monitored Units
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-gray-900">{data.length}</span>
            <span className="text-[10px] font-mono text-gray-400">Total</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Average Health Score
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-indigo-700">{avgHealth}</span>
            <span className="text-[10px] font-mono text-gray-400">/ 100</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Anomalies Detected
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-rose-600">{anomalyCount}</span>
            <span className="text-[10px] font-mono text-rose-500">Flagged</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            High Failure Risk
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-amber-600">{highRiskCount}</span>
            <span className="text-[10px] font-mono text-amber-500">Risk ≥ 80%</span>
          </div>
        </div>
      </div>

      {/* Equipment Prediction Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Equipment Predictions Matrix
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
                Synced: {lastUpdated}
              </span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-700 border border-gray-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-purple-600' : 'text-gray-500'}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync JSON'}</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px] tracking-wider font-mono">
              <tr>
                <th className="py-3 px-5">Equipment ID</th>
                <th className="py-3 px-5">Predicted Health Score</th>
                <th className="py-3 px-5">Anomaly Status</th>
                <th className="py-3 px-5">Failure Risk %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((eq) => {
                const healthColor = eq.predicted_health_score >= 70 
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : eq.predicted_health_score >= 40
                  ? 'text-amber-700 bg-amber-50 border-amber-200'
                  : 'text-rose-700 bg-rose-50 border-rose-200';

                const healthBarBg = eq.predicted_health_score >= 70
                  ? 'bg-emerald-500'
                  : eq.predicted_health_score >= 40
                  ? 'bg-amber-500'
                  : 'bg-rose-500';

                return (
                  <tr key={eq.equipment_id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3.5 px-5 font-mono font-bold text-gray-900">
                      {eq.equipment_id}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${healthBarBg}`}
                            style={{ width: `${Math.min(Math.max(eq.predicted_health_score, 0), 100)}%` }}
                          />
                        </div>
                        <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border ${healthColor}`}>
                          {eq.predicted_health_score}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                          eq.predicted_anomaly
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${eq.predicted_anomaly ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        {eq.predicted_anomaly ? 'Anomaly Detected' : 'Nominal'}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-xs ${
                            eq.failure_risk_pct >= 80
                              ? 'text-rose-600 font-extrabold'
                              : eq.failure_risk_pct >= 50
                              ? 'text-amber-600'
                              : 'text-gray-700'
                          }`}
                        >
                          {eq.failure_risk_pct}%
                        </span>
                        {eq.failure_risk_pct >= 80 && (
                          <span className="text-[10px] font-mono text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded font-medium">
                            CRITICAL
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. WATER FORECAST PREDICTION VIEW (timestamp, tank_level_pct)
// ============================================================================
function WaterForecastPredictionView({ data, onRefresh, isRefreshing, lastUpdated }) {
  const initialLevel = data[0]?.tank_level_pct ?? 0;
  const finalLevel = data[data.length - 1]?.tank_level_pct ?? 0;
  const minLevel = data.length > 0 ? Math.min(...data.map((d) => d.tank_level_pct)) : 0;
  const netDelta = (finalLevel - initialLevel).toFixed(1);

  // SVG Trendline computation for 72 points
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    const minVal = Math.min(...data.map((d) => d.tank_level_pct)) - 0.5;
    const maxVal = Math.max(...data.map((d) => d.tank_level_pct)) + 0.5;
    const range = maxVal - minVal || 1;
    const width = 600;
    const height = 100;
    return data.map((d, idx) => {
      const x = (idx / (data.length - 1 || 1)) * width;
      const y = height - ((d.tank_level_pct - minVal) / range) * (height - 20) - 10;
      return { x, y, ...d };
    });
  }, [data]);

  const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');

  return (
    <div className="space-y-6">
      {/* 4 Summary Stat KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Start Projected Level
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-cyan-700">{initialLevel}%</span>
            <span className="text-[10px] font-mono text-gray-400">Step 1</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            72h Projected Level
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-blue-700">{finalLevel}%</span>
            <span className="text-[10px] font-mono text-gray-400">Horizon End</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Projected Level Change
          </span>
          <div className="flex items-baseline justify-between">
            <span className={`text-xl font-bold font-mono ${Number(netDelta) < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {Number(netDelta) > 0 ? `+${netDelta}` : netDelta}%
            </span>
            <span className="text-[10px] font-mono text-gray-400">72-Hour Delta</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Minimum Projected Level
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-gray-900">{minLevel}%</span>
            <span className="text-[10px] font-mono text-gray-400">Reserve Floor</span>
          </div>
        </div>
      </div>

      {/* Trajectory Sparkline Graph */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-cyan-600" />
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              72-Hour Water Tank Level Trajectory (ML Model Output)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded">
            {data.length} Timesteps (Hourly)
          </span>
        </div>

        <div className="w-full bg-cyan-50/40 border border-cyan-100 rounded-lg p-3">
          <svg viewBox="0 0 600 100" className="w-full h-24 overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {pathD && (
              <>
                <path d={`${pathD} L 600 100 L 0 100 Z`} fill="url(#waterGrad)" />
                <path d={pathD} fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
          </svg>
          <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mt-2 pt-2 border-t border-cyan-100/60">
            <span>T+0h ({data[0]?.timestamp ? new Date(data[0].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }) : 'Start'})</span>
            <span>T+24h</span>
            <span>T+48h</span>
            <span>T+72h ({data[data.length - 1]?.timestamp ? new Date(data[data.length - 1].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }) : 'End'})</span>
          </div>
        </div>
      </div>

      {/* Hourly Data Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Water Forecast Trajectory Data
          </span>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
                Synced: {lastUpdated}
              </span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-white hover:bg-cyan-50 text-gray-700 hover:text-cyan-700 border border-gray-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-cyan-600' : 'text-gray-500'}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync JSON'}</span>
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px] tracking-wider font-mono sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-5">Step</th>
                <th className="py-2.5 px-5">Timestamp</th>
                <th className="py-2.5 px-5">Predicted Tank Level</th>
                <th className="py-2.5 px-5">Level Visualization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={row.timestamp + idx} className="hover:bg-gray-50/80 transition-colors font-mono">
                  <td className="py-2.5 px-5 text-gray-400">
                    +{idx + 1}h
                  </td>
                  <td className="py-2.5 px-5 text-gray-800 font-medium">
                    {row.timestamp}
                  </td>
                  <td className="py-2.5 px-5 font-bold text-cyan-700">
                    {row.tank_level_pct}%
                  </td>
                  <td className="py-2.5 px-5">
                    <div className="w-32 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-600 h-1.5 rounded-full"
                        style={{ width: `${Math.min(Math.max(row.tank_level_pct, 0), 100)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. HVAC PREDICTION VIEW (timestamp, heating_load_kw)
// ============================================================================
function HvacForecastPredictionView({ data, onRefresh, isRefreshing, lastUpdated }) {
  const initialLoad = data[0]?.heating_load_kw ?? 0;
  const finalLoad = data[data.length - 1]?.heating_load_kw ?? 0;
  const loads = data.map((d) => d.heating_load_kw);
  const avgLoad = (loads.reduce((acc, val) => acc + val, 0) / (loads.length || 1)).toFixed(1);
  const maxLoad = loads.length > 0 ? Math.max(...loads) : 0;

  return (
    <div className="space-y-6">
      {/* 4 Summary Stat KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Initial Projected Load
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-indigo-700">{initialLoad}</span>
            <span className="text-[10px] font-mono text-gray-400">kW</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            72h Projected Load
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-purple-700">{finalLoad}</span>
            <span className="text-[10px] font-mono text-gray-400">kW</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Average Projected Load
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-gray-900">{avgLoad}</span>
            <span className="text-[10px] font-mono text-gray-400">kW (Mean)</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Peak Projected Load
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-amber-600">{maxLoad}</span>
            <span className="text-[10px] font-mono text-gray-400">kW Max</span>
          </div>
        </div>
      </div>

      {/* Model Output Disclaimer Banner */}
      <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-purple-900">
        <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">ML / Model Output:</span>
          <span className="text-purple-800 ml-1">
            Displaying heating load demand values (kW) directly predicted by the recursive HVAC model. Only the exact fields provided in the model snapshot (<span className="font-mono">timestamp</span> and <span className="font-mono">heating_load_kw</span>) are rendered.
          </span>
        </div>
      </div>

      {/* Hourly Data Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            HVAC Heating Load Prediction Table
          </span>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
                Synced: {lastUpdated}
              </span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-700 border border-gray-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-purple-600' : 'text-gray-500'}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync JSON'}</span>
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px] tracking-wider font-mono sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-5">Step</th>
                <th className="py-2.5 px-5">Timestamp</th>
                <th className="py-2.5 px-5">Predicted Heating Load (kW)</th>
                <th className="py-2.5 px-5">Status Indicator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={row.timestamp + idx} className="hover:bg-gray-50/80 transition-colors font-mono">
                  <td className="py-2.5 px-5 text-gray-400">
                    +{idx + 1}h
                  </td>
                  <td className="py-2.5 px-5 text-gray-800 font-medium">
                    {row.timestamp}
                  </td>
                  <td className="py-2.5 px-5 font-bold text-purple-700">
                    {row.heating_load_kw} kW
                  </td>
                  <td className="py-2.5 px-5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Predicted Stable
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. INVENTORY SNAPSHOT PREDICTION VIEW (item_id, closing_stock, days_remaining, predicted_reorder_needed)
// ============================================================================
function InventorySnapshotPredictionView({ data, onRefresh, isRefreshing, lastUpdated }) {
  const reorderCount = data.filter((d) => d.predicted_reorder_needed).length;
  const safeCount = data.filter((d) => !d.predicted_reorder_needed).length;
  const lowestDays = data.length > 0 ? Math.min(...data.map((d) => d.days_remaining)).toFixed(1) : 0;
  const totalItems = data.length;

  return (
    <div className="space-y-6">
      {/* 4 Summary Stat KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Tracked Items
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-gray-900">{totalItems}</span>
            <span className="text-[10px] font-mono text-gray-400">SKUs</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Reorder Flagged
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-rose-600">{reorderCount}</span>
            <span className="text-[10px] font-mono text-rose-500">Action Required</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Sufficient Stock
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-emerald-700">{safeCount}</span>
            <span className="text-[10px] font-mono text-emerald-600">Nominal</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Lowest Days Remaining
          </span>
          <div className="flex items-baseline justify-between">
            <span className={`text-xl font-bold font-mono ${Number(lowestDays) <= 30 ? 'text-rose-600' : 'text-amber-600'}`}>
              {lowestDays}
            </span>
            <span className="text-[10px] font-mono text-gray-400">Days</span>
          </div>
        </div>
      </div>

      {/* Inventory Prediction Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Inventory Snapshot Predictions
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
                Synced: {lastUpdated}
              </span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-700 border border-gray-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-purple-600' : 'text-gray-500'}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync JSON'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px] tracking-wider font-mono">
              <tr>
                <th className="py-3 px-5">Item ID</th>
                <th className="py-3 px-5">Closing Stock</th>
                <th className="py-3 px-5">Days Remaining</th>
                <th className="py-3 px-5">Predicted Reorder Needed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item) => (
                <tr key={item.item_id} className="hover:bg-gray-50/80 transition-colors font-mono">
                  <td className="py-3.5 px-5 font-bold text-gray-900">
                    {item.item_id}
                  </td>
                  <td className="py-3.5 px-5 font-semibold text-gray-800">
                    {item.closing_stock.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`font-bold ${item.days_remaining <= 30 ? 'text-rose-600' : 'text-gray-700'}`}>
                      {item.days_remaining} Days
                    </span>
                  </td>
                  <td className="py-3.5 px-5 font-sans">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        item.predicted_reorder_needed
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.predicted_reorder_needed ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                      {item.predicted_reorder_needed ? 'Reorder Needed' : 'Sufficient'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. FUEL FORECAST PREDICTION VIEW (timestamp, fuel_level_l, burn_rate_lph, days_remaining)
// ============================================================================
function FuelForecastPredictionView({ data, onRefresh, isRefreshing, lastUpdated }) {
  const initialLevel = data[0]?.fuel_level_l ?? 0;
  const finalLevel = data[data.length - 1]?.fuel_level_l ?? 0;
  const avgBurnRate = (data.reduce((sum, d) => sum + d.burn_rate_lph, 0) / (data.length || 1)).toFixed(1);
  const daysRemaining = data[data.length - 1]?.days_remaining ?? (data[0]?.days_remaining ?? 0);

  // SVG Trendline computation for 72 points
  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    const minVal = Math.min(...data.map((d) => d.fuel_level_l));
    const maxVal = Math.max(...data.map((d) => d.fuel_level_l));
    const range = maxVal - minVal || 1;
    const width = 600;
    const height = 100;
    return data.map((d, idx) => {
      const x = (idx / (data.length - 1 || 1)) * width;
      const y = height - ((d.fuel_level_l - minVal) / range) * (height - 20) - 10;
      return { x, y, ...d };
    });
  }, [data]);

  const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '');

  return (
    <div className="space-y-6">
      {/* 4 Summary Stat KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Start Projected Level
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-amber-700">
              {Number(initialLevel).toLocaleString(undefined, { maximumFractionDigits: 0 })} L
            </span>
            <span className="text-[10px] font-mono text-gray-400">Step 1</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            72h Projected Level
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-orange-700">
              {Number(finalLevel).toLocaleString(undefined, { maximumFractionDigits: 0 })} L
            </span>
            <span className="text-[10px] font-mono text-gray-400">Horizon End</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Average Burn Rate
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-gray-900">{avgBurnRate}</span>
            <span className="text-[10px] font-mono text-gray-400">L / hr</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Autonomous Run Time
          </span>
          <div className="flex items-baseline justify-between">
            <span className={`text-xl font-bold font-mono ${Number(daysRemaining) < 7 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {daysRemaining}
            </span>
            <span className="text-[10px] font-mono text-gray-400">Days</span>
          </div>
        </div>
      </div>

      {/* Trajectory Area Chart Card */}
      <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              72-Hour Fuel Level Depletion Curve
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-gray-400 text-[11px]">72 Timesteps</span>
            <span className="text-amber-700 font-semibold text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {Number(initialLevel).toLocaleString(undefined, { maximumFractionDigits: 0 })} L &rarr; {Number(finalLevel).toLocaleString(undefined, { maximumFractionDigits: 0 })} L
            </span>
          </div>
        </div>

        {/* SVG Sparkline / Area Chart */}
        <div className="w-full h-32 bg-gray-50/60 rounded-lg border border-gray-100 p-2 flex items-center justify-center relative overflow-hidden">
          <svg className="w-full h-full overflow-visible" viewBox="0 0 600 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="fuelGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Fill Area */}
            {points.length > 0 && (
              <path
                d={`${pathD} L 600 100 L 0 100 Z`}
                fill="url(#fuelGradient)"
              />
            )}
            {/* Line stroke */}
            <path
              d={pathD}
              fill="none"
              stroke="#d97706"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Initial and Final Points */}
            {points.length > 0 && (
              <>
                <circle cx={points[0].x} cy={points[0].y} r="4" fill="#d97706" stroke="#fff" strokeWidth="2" />
                <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill="#d97706" stroke="#fff" strokeWidth="2" />
              </>
            )}
          </svg>
        </div>
        <div className="flex justify-between text-[10px] font-mono text-gray-400 px-1">
          <span>T+1h ({data[0]?.timestamp || 'Start'})</span>
          <span>T+36h (Midpoint)</span>
          <span>T+72h ({data[data.length - 1]?.timestamp || 'Horizon'})</span>
        </div>
      </div>

      {/* Hourly Data Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Predicted Hourly Fuel Consumption Schedule
          </span>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
                Synced: {lastUpdated}
              </span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-700 border border-gray-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-purple-600' : 'text-gray-500'}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync JSON'}</span>
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px] tracking-wider font-mono sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-5">Step</th>
                <th className="py-2.5 px-5">Timestamp</th>
                <th className="py-2.5 px-5">Fuel Level (L)</th>
                <th className="py-2.5 px-5">Burn Rate (L/hr)</th>
                <th className="py-2.5 px-5">Days Remaining</th>
                <th className="py-2.5 px-5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, idx) => (
                <tr key={row.timestamp + idx} className="hover:bg-gray-50/80 transition-colors font-mono">
                  <td className="py-2.5 px-5 text-gray-400">
                    +{idx + 1}h
                  </td>
                  <td className="py-2.5 px-5 text-gray-800 font-medium">
                    {row.timestamp}
                  </td>
                  <td className="py-2.5 px-5 font-bold text-amber-700">
                    {row.fuel_level_l.toLocaleString(undefined, { maximumFractionDigits: 1 })} L
                  </td>
                  <td className="py-2.5 px-5 text-gray-700 font-semibold">
                    {row.burn_rate_lph} L/h
                  </td>
                  <td className="py-2.5 px-5">
                    <span className={`font-semibold ${row.days_remaining < 7 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {row.days_remaining} d
                    </span>
                  </td>
                  <td className="py-2.5 px-5">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      row.days_remaining >= 7 
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                        : 'text-amber-700 bg-amber-50 border border-amber-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${row.days_remaining >= 7 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {row.days_remaining >= 7 ? 'Nominal Reserve' : 'Depletion Watch'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 6. RESUPPLY PREDICTION VIEW (shipment_id, planned_date, estimated_arrival, weather_risk, inventory_urgency, route_status, delay_risk, final_status, predicted_risk_score)
// ============================================================================
function ResupplyPredictionView({ data, onRefresh, isRefreshing, lastUpdated }) {
  const totalShipments = data.length;
  const onScheduleCount = data.filter((d) => d.route_status === 'ON_SCHEDULE').length;
  const onScheduleRate = ((onScheduleCount / (totalShipments || 1)) * 100).toFixed(0);
  const avgDelayRisk = (data.reduce((sum, d) => sum + d.delay_risk, 0) / (totalShipments || 1)).toFixed(1);
  const avgRiskScore = (data.reduce((sum, d) => sum + d.predicted_risk_score, 0) / (totalShipments || 1)).toFixed(1);

  return (
    <div className="space-y-6">
      {/* 4 Summary Stat KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Tracked Shipments
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-gray-900">{totalShipments}</span>
            <span className="text-[10px] font-mono text-gray-400">Voyages</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            On-Schedule Rate
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-emerald-700">{onScheduleRate}%</span>
            <span className="text-[10px] font-mono text-emerald-600">Route Reliability</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Average Delay Risk
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-amber-600">{avgDelayRisk}</span>
            <span className="text-[10px] font-mono text-gray-400">Days</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
            Mean Risk Score
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-purple-700">{avgRiskScore}</span>
            <span className="text-[10px] font-mono text-gray-400">/ 100</span>
          </div>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ship className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Resupply Expeditions & Voyage Risk Forecast
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-[10px] font-mono text-gray-400 hidden sm:inline">
                Synced: {lastUpdated}
              </span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-700 border border-gray-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-purple-600' : 'text-gray-500'}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync JSON'}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold uppercase text-[10px] tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">Shipment ID</th>
                <th className="py-3 px-4">Planned Date</th>
                <th className="py-3 px-4">Est. Arrival</th>
                <th className="py-3 px-4">Weather Risk</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Route Status</th>
                <th className="py-3 px-4">Delay Risk</th>
                <th className="py-3 px-4">Predicted Risk Score</th>
                <th className="py-3 px-4">Final Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 font-mono">
              {data.map((shipment) => {
                const isHighRisk = shipment.predicted_risk_score >= 25 || shipment.weather_risk === 'HIGH';
                const weatherBadgeClass = shipment.weather_risk === 'HIGH' 
                  ? 'bg-rose-50 text-rose-700 border-rose-200' 
                  : shipment.weather_risk === 'MEDIUM' 
                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                
                const urgencyBadgeClass = shipment.inventory_urgency === 'HIGH'
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : shipment.inventory_urgency === 'MEDIUM'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200';

                return (
                  <tr key={shipment.shipment_id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-gray-900">
                      {shipment.shipment_id}
                    </td>
                    <td className="py-3 px-4 text-gray-700">
                      {shipment.planned_date}
                    </td>
                    <td className="py-3 px-4 text-gray-700 font-semibold">
                      {shipment.estimated_arrival}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${weatherBadgeClass}`}>
                        {shipment.weather_risk}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgencyBadgeClass}`}>
                        {shipment.inventory_urgency}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {shipment.route_status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${shipment.delay_risk > 10 ? 'text-rose-600' : 'text-gray-700'}`}>
                        +{shipment.delay_risk} Days
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isHighRisk ? 'text-rose-600' : 'text-purple-700'}`}>
                          {shipment.predicted_risk_score}
                        </span>
                        <div className="w-16 bg-gray-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${isHighRisk ? 'bg-rose-500' : 'bg-purple-600'}`}
                            style={{ width: `${Math.min(shipment.predicted_risk_score * 2.5, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                        {shipment.final_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: ML PREDICTIONS SECTION
// ============================================================================
export default function MLPredictionsSection() {
  const [selectedModelId, setSelectedModelId] = useState('equipment_health');

  // Dynamic state for each connected ML model (all 6 models)
  const [equipmentData, setEquipmentData] = useState(equipmentSnapshot);
  const [waterData, setWaterData] = useState(waterForecastSnapshot);
  const [hvacData, setHvacData] = useState(hvacForecastSnapshot);
  const [inventoryData, setInventoryData] = useState(inventorySnapshot);
  const [fuelData, setFuelData] = useState(fuelForecastSnapshot);
  const [resupplyData, setResupplyData] = useState(resupplySnapshot);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Dynamic fetcher that pulls from ML models directory with cache-busting
  const fetchModelData = async () => {
    const timestamp = Date.now();
    try {
      // 1. Equipment
      const eqRes = await fetch(`/ML%20models/equipment_snapshot.json?t=${timestamp}`);
      if (eqRes.ok) {
        const fresh = await eqRes.json();
        if (Array.isArray(fresh) && fresh.length > 0) setEquipmentData(fresh);
      }

      // 2. Water
      const waterRes = await fetch(`/ML%20models/water_forecast.json?t=${timestamp}`);
      if (waterRes.ok) {
        const fresh = await waterRes.json();
        if (Array.isArray(fresh) && fresh.length > 0) setWaterData(fresh);
      }

      // 3. HVAC
      const hvacRes = await fetch(`/ML%20models/hvac_forecast.json?t=${timestamp}`);
      if (hvacRes.ok) {
        const fresh = await hvacRes.json();
        if (Array.isArray(fresh) && fresh.length > 0) setHvacData(fresh);
      }

      // 4. Inventory
      const invRes = await fetch(`/ML%20models/inventory_snapshot.json?t=${timestamp}`);
      if (invRes.ok) {
        const fresh = await invRes.json();
        if (Array.isArray(fresh) && fresh.length > 0) setInventoryData(fresh);
      }

      // 5. Fuel Forecast
      const fuelRes = await fetch(`/ML%20models/fuel_forecast.json?t=${timestamp}`);
      if (fuelRes.ok) {
        const fresh = await fuelRes.json();
        if (Array.isArray(fresh) && fresh.length > 0) setFuelData(fresh);
      }

      // 6. Resupply
      const resupplyRes = await fetch(`/ML%20models/resupply_snapshot.json?t=${timestamp}`);
      if (resupplyRes.ok) {
        const fresh = await resupplyRes.json();
        if (Array.isArray(fresh) && fresh.length > 0) setResupplyData(fresh);
      }

      setLastUpdated(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.warn('Could not fetch updated ML model data, using bundled snapshots:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchModelData();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  useEffect(() => {
    const interval = setInterval(fetchModelData, 5000);
    return () => clearInterval(interval);
  }, []);

  const activeModel = ML_MODELS.find((m) => m.id === selectedModelId) || ML_MODELS[0];
  const ActiveIcon = activeModel.icon;

  return (
    <section id="ml-predictions-section" className="w-full bg-gray-50 border-t border-gray-200 px-6 lg:px-12 py-10 pb-20">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ============================================================== */}
        {/* SECTION HEADER                                                 */}
        {/* ============================================================== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-100 text-purple-700">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                Station ML Predictions
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 shadow-2xs tracking-wider">
                6 MODELS CONFIGURED
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              MoES / NCPOR Machine Learning Intelligence for Autonomous Antarctic Station Operations
            </p>
          </div>

          {/* Model Status & Refresh Controls */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-purple-50 text-gray-700 hover:text-purple-700 border border-gray-200 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-purple-600' : 'text-gray-500'}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Predictions'}</span>
            </button>
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-2xs">
              <Layers className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Active:</span>
              <span className="font-semibold text-gray-800">{activeModel.name}</span>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SELECTOR BAR: TABS & DROPDOWN                                  */}
        {/* ============================================================== */}
        <div className="space-y-3">
          {/* Mobile Dropdown Selector (visible on small screens) */}
          <div className="block sm:hidden">
            <label htmlFor="ml-model-select" className="block text-xs font-bold text-gray-600 mb-1">
              Select ML Model Output:
            </label>
            <div className="relative">
              <select
                id="ml-model-select"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-800 shadow-xs pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {ML_MODELS.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} — {model.category}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Desktop & Tablet Tab Selector Buttons */}
          <div className="hidden sm:flex items-center gap-1.5 p-1.5 bg-white border border-gray-200 rounded-xl shadow-xs overflow-x-auto">
            {ML_MODELS.map((model) => {
              const isActive = selectedModelId === model.id;
              const Icon = model.icon;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setSelectedModelId(model.id)}
                  className={`flex-1 min-w-[120px] py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  <span>{model.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ============================================================== */}
        {/* MODEL DISPLAY PANEL (FULL-WIDTH CONTAINER)                     */}
        {/* ============================================================== */}
        <div className={`bg-white border border-gray-200 rounded-2xl shadow-xs p-6 lg:p-8 space-y-6 relative transition-opacity duration-200 ${
          isRefreshing ? 'opacity-60' : 'opacity-100'
        }`}>
          {isRefreshing && (
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold shadow-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-600" />
              <span>Syncing ML outputs...</span>
            </div>
          )}
          
          {/* Header Card of the Selected Model */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200/80 flex items-center justify-center text-purple-600 shrink-0 shadow-2xs">
                <ActiveIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">
                    {activeModel.name} Model Output
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                    {activeModel.category}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 max-w-2xl leading-relaxed">
                  {activeModel.description}
                </p>
              </div>
            </div>

            {/* Model Architecture & Source Indicator */}
            <div className="flex flex-col md:items-end gap-1 shrink-0 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
                <Sparkles className="w-3 h-3 text-purple-600" />
                {activeModel.tag}
              </span>
              <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
                <Database className="w-3 h-3 text-gray-400" />
                Artifact: {activeModel.fileRef}
              </span>
            </div>
          </div>

          {/* Active Tab Routing: ONLY the selected model's output is displayed */}
          {selectedModelId === 'equipment_health' && (
            <EquipmentHealthPredictionView
              data={equipmentData}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              lastUpdated={lastUpdated}
            />
          )}

          {selectedModelId === 'water_forecast' && (
            <WaterForecastPredictionView
              data={waterData}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              lastUpdated={lastUpdated}
            />
          )}

          {selectedModelId === 'hvac' && (
            <HvacForecastPredictionView
              data={hvacData}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              lastUpdated={lastUpdated}
            />
          )}

          {selectedModelId === 'inventory' && (
            <InventorySnapshotPredictionView
              data={inventoryData}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              lastUpdated={lastUpdated}
            />
          )}

          {selectedModelId === 'fuel_forecast' && (
            <FuelForecastPredictionView
              data={fuelData}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              lastUpdated={lastUpdated}
            />
          )}

          {selectedModelId === 'resupply' && (
            <ResupplyPredictionView
              data={resupplyData}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              lastUpdated={lastUpdated}
            />
          )}

        </div>

      </div>
    </section>
  );
}
