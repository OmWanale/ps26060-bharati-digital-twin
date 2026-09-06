import React, { useState, useEffect, useRef } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Gauge, 
  Wind, 
  ExternalLink, 
  RefreshCw, 
  ArrowLeft,
  X,
  Radio,
  Clock,
  MapPin,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import IndiaFlag from './IndiaFlag';
import ChartTooltip from './ChartTooltip';
import { 
  fetchLiveNCPORData, 
  NCPOR_SOURCE_URL, 
  NCPOR_SOURCE_DISPLAY_NAME 
} from '../services/ncporDataService';

const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5-minute polling interval

export default function LiveNCPORDataModal({ isOpen, onClose, onStatusChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchedTime, setLastFetchedTime] = useState(null);
  const [status, setStatus] = useState('CONNECTING'); // 'LIVE' | 'UNAVAILABLE' | 'CONNECTING'
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeChartParam, setActiveChartParam] = useState('temperature');

  // Interactive chart hover state
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const chartContainerRef = useRef(null);

  // Format local time as HH:MM:SS
  const getFormattedTime = () => {
    return new Date().toTimeString().slice(0, 8);
  };

  // Periodic 5-minute auto-refresh and initial fetch on modal open
  useEffect(() => {
    let isSubscribed = true;
    if (!isOpen) return;

    const executePollingFetch = (force = false) => {
      fetchLiveNCPORData(force)
        .then((result) => {
          if (!isSubscribed) return;
          if (result.success && result.data) {
            setData(result.data); // Update only on successful response
            setStatus('LIVE');
            setErrorMsg(null);
            setLastFetchedTime(getFormattedTime());
            if (onStatusChange) onStatusChange('LIVE');
          } else {
            // Preserve previous valid data, update connection status
            setStatus('UNAVAILABLE');
            const err = result.error || 'NCPOR connection unavailable';
            setErrorMsg(err);
            if (onStatusChange) onStatusChange('UNAVAILABLE');
          }
        })
        .catch((err) => {
          if (!isSubscribed) return;
          setStatus('UNAVAILABLE');
          setErrorMsg(err.message || 'NCPOR connection unavailable');
          if (onStatusChange) onStatusChange('UNAVAILABLE');
        });
    };

    // Immediate initial fetch on open
    executePollingFetch(false);

    // 5-minute controlled automatic polling interval
    const timerId = setInterval(() => {
      executePollingFetch(false);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => {
      isSubscribed = false;
      clearInterval(timerId);
    };
  }, [isOpen, onStatusChange]);

  // Small manual ↻ Refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);

    try {
      const result = await fetchLiveNCPORData(true);
      if (result.success && result.data) {
        setData(result.data); // Update values only after successful response
        setStatus('LIVE');
        setErrorMsg(null);
        setLastFetchedTime(getFormattedTime());
        if (onStatusChange) onStatusChange('LIVE');
      } else {
        // Preserve previous valid data on failure
        setStatus('UNAVAILABLE');
        const err = result.error || 'NCPOR connection unavailable';
        setErrorMsg(err);
        if (onStatusChange) onStatusChange('UNAVAILABLE');
      }
    } catch (err) {
      setStatus('UNAVAILABLE');
      setErrorMsg(err.message || 'NCPOR connection unavailable');
      if (onStatusChange) onStatusChange('UNAVAILABLE');
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const current = data?.current;
  const stats = data?.statistics;

  // Prepare 4 Primary Data Cards from real backend response
  const dataCards = current ? [
    {
      id: 'temperature',
      name: 'Temperature',
      value: current.temperature?.value != null ? current.temperature.value : '—',
      unit: current.temperature?.unit || '°C',
      source: 'NCPOR Live',
      icon: Thermometer,
      accentColor: '#D9534F',
      bgColor: 'bg-rose-50/70',
      borderColor: 'border-rose-200',
      textColor: 'text-rose-700',
      iconBg: 'bg-rose-100 text-rose-600',
    },
    {
      id: 'relativeHumidity',
      name: 'Relative Humidity',
      value: (current.humidity?.value ?? current.relativeHumidity?.value) != null 
        ? (current.humidity?.value ?? current.relativeHumidity?.value) 
        : '—',
      unit: current.humidity?.unit || current.relativeHumidity?.unit || '%',
      source: 'NCPOR Live',
      icon: Droplets,
      accentColor: '#5CB85C',
      bgColor: 'bg-emerald-50/70',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-700',
      iconBg: 'bg-emerald-100 text-emerald-600',
    },
    {
      id: 'airPressure',
      name: 'Air Pressure',
      value: (current.pressure?.value ?? current.airPressure?.value) != null 
        ? (current.pressure?.value ?? current.airPressure?.value) 
        : '—',
      unit: current.pressure?.unit || current.airPressure?.unit || 'mBar',
      source: 'NCPOR Live',
      icon: Gauge,
      accentColor: '#343A40',
      bgColor: 'bg-slate-50/90',
      borderColor: 'border-slate-200',
      textColor: 'text-slate-800',
      iconBg: 'bg-slate-200 text-slate-700',
    },
    {
      id: 'windSpeed',
      name: 'Wind Speed',
      value: current.windSpeed?.value != null ? current.windSpeed.value : '—',
      unit: current.windSpeed?.unit || 'knots',
      source: 'NCPOR Live',
      icon: Wind,
      accentColor: '#4E8DF1',
      bgColor: 'bg-blue-50/70',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      iconBg: 'bg-blue-100 text-blue-600',
    },
  ] : [];

  // Chart data from real backend time series
  const activeSeries = data?.timeSeries?.[activeChartParam] || [];
  const minVal = activeSeries.length ? Math.min(...activeSeries.map((p) => p.value)) : 0;
  const maxVal = activeSeries.length ? Math.max(...activeSeries.map((p) => p.value)) : 1;
  const valRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  const chartPoints = activeSeries.map((pt, idx) => {
    const x = (idx / (activeSeries.length - 1 || 1)) * 600;
    const y = 140 - ((pt.value - minVal) / valRange) * 110;
    return { x, y, value: pt.value, timestamp: pt.timestamp };
  });

  const svgPath = chartPoints.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');

  // Handle modal chart mouse move
  const handleChartMouseMove = (e) => {
    if (!chartContainerRef.current || chartPoints.length === 0) return;
    const rect = chartContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const normX = (mouseX / rect.width) * 600;

    let nearestIdx = 0;
    let minDiff = Infinity;
    chartPoints.forEach((pt, i) => {
      const diff = Math.abs(normX - pt.x);
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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl h-[92vh] max-h-[900px] flex flex-col overflow-hidden text-gray-800 font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-bharati-heading"
      >
        {/* ============================================================== */}
        {/* HEADER: LIVE BHARATI DATA                                      */}
        {/* ============================================================== */}
        <header className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <IndiaFlag className="h-7 w-auto rounded-[3px] shadow-xs border border-gray-200 shrink-0" />
            
            <div className="h-8 w-px bg-gray-200"></div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 id="live-bharati-heading" className="text-lg font-bold text-gray-900 tracking-tight leading-none">
                  LIVE BHARATI DATA
                </h2>

                {/* Connection Indicator: ● NCPOR LIVE / ● NCPOR UNAVAILABLE */}
                {status === 'LIVE' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>● NCPOR LIVE</span>
                  </span>
                )}

                {status === 'UNAVAILABLE' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>● NCPOR UNAVAILABLE</span>
                  </span>
                )}

                {status === 'CONNECTING' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-50 text-gray-600 border border-gray-300 shadow-2xs">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                    <span>CONNECTING...</span>
                  </span>
                )}
              </div>

              {/* Requirement 4: Source clearly as "NCPOR • Bharati Live Data" & Requirement 5: Timestamp from source */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 flex-wrap">
                <span>Source:</span>
                <a 
                  href={NCPOR_SOURCE_URL} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                  title="Open Official NCPOR Live Portal"
                >
                  <span>{NCPOR_SOURCE_DISPLAY_NAME}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-1 font-mono text-gray-600">
                  <Clock className="w-3 h-3 text-gray-400" />
                  Last updated:{' '}
                  <strong className="text-gray-900">
                    {data?.timestamp ? data.timestamp : status === 'UNAVAILABLE' ? 'NCPOR connection unavailable' : 'Fetching...'}
                  </strong>
                </span>

                {/* Requirement: Display Last fetched: HH:MM:SS */}
                {lastFetchedTime && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                      <span>Last fetched: <strong className="text-blue-900 font-bold">{lastFetchedTime}</strong></span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5">
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded bg-gray-50 border border-gray-200 text-xs text-gray-600 font-mono">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>69°24′28″S 76°11′14″E</span>
            </div>

            {/* Requirement: Small manual ↻ Refresh button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-2xs hover:shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              title="Manually fetch latest data from NCPOR via backend scraper"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : '↻ Refresh'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200 shadow-2xs"
              title="Close and return to floor plan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Subtle loading indicator during background refresh */}
        {isRefreshing && (
          <div className="h-0.5 w-full bg-blue-100 overflow-hidden shrink-0">
            <div className="h-full bg-blue-600 animate-pulse w-full"></div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MAIN BODY                                                      */}
        {/* ============================================================== */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50/70 space-y-6">
          {/* Requirement 1: Loading State */}
          {loading && !data && (
            <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center space-y-3 shadow-sm">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <h3 className="font-bold text-sm text-gray-900">
                Fetching Real-Time Telemetry from NCPOR Bharati Station...
              </h3>
              <p className="text-xs text-gray-500 max-w-sm">
                Querying backend endpoint <code>GET /api/bharati/live</code> to parse live environmental sensors.
              </p>
            </div>
          )}

          {/* Requirement 3: Error State when request fails and no prior data exists */}
          {!loading && !data && status === 'UNAVAILABLE' && (
            <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-8 text-center space-y-3 shadow-2xs">
              <div className="inline-flex p-3 rounded-full bg-rose-100 text-rose-600 mb-1">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-rose-900">
                NCPOR connection unavailable
              </h3>
              <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">
                The backend service was unable to reach or parse the official NCPOR Bharati live webpage at this moment ({errorMsg || 'Connection timed out'}).
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          )}

          {/* When data exists: display real values */}
          {data && (
            <>
              {/* Warning banner if a background re-fetch failed while displaying previous data */}
              {status === 'UNAVAILABLE' && errorMsg && (
                <div className="px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>NCPOR connection unavailable:</strong> Showing latest successfully fetched data.
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={handleRefresh}
                    className="font-bold underline text-amber-900 hover:text-black text-xs shrink-0 cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Top Info Banner */}
              <div className="px-4 py-2.5 bg-blue-50/80 border border-blue-200/90 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Official environmental observations scraped from <strong>{NCPOR_SOURCE_DISPLAY_NAME}</strong>.
                  </span>
                </div>
                <a 
                  href={NCPOR_SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-semibold text-[11px] text-blue-700 hover:text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1 shrink-0"
                >
                  <span>data.ncpor.res.in/bharati/live</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* ============================================================ */}
              {/* 1. DATA CARDS: TEMPERATURE, REL. HUMIDITY, PRESSURE, WIND    */}
              {/* ============================================================ */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Current Live Telemetry
                  </h3>
                  <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                    ● Real Data Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dataCards.map((card) => {
                    const Icon = card.icon;
                    const isSelected = activeChartParam === card.id;

                    return (
                      <div
                        key={card.id}
                        onClick={() => setActiveChartParam(card.id)}
                        className={`bg-white p-5 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between ${
                          isSelected 
                            ? 'border-blue-500 ring-2 ring-blue-500/20' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Top Row: Icon + Parameter Name */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${card.iconBg} shrink-0`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs font-bold text-gray-700 tracking-tight">
                              {card.name}
                            </span>
                          </div>
                        </div>

                        {/* Middle Row: Current Value + Unit */}
                        <div className="my-2">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-extrabold font-mono text-gray-900 tracking-tight">
                              {card.value}
                            </span>
                            <span className="text-sm font-bold text-gray-500 font-mono">
                              {card.unit}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Row: Source Indicator */}
                        <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{card.source}</span>
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">
                            Verified Real
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ============================================================ */}
              {/* 2. THREE COMPACT SECTIONS: AVERAGE, MINIMUM, MAXIMUM         */}
              {/* ============================================================ */}
              {stats && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Statistical Summary (24-Hour Cycle)
                    </h3>
                    <span className="text-[11px] text-gray-400 font-mono">
                      Source: National Polar Data Center
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* AVERAGE SECTION */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 mb-3">
                          <span className="text-xs font-extrabold text-blue-700 tracking-wider uppercase flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                            AVERAGE
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                            MEAN
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Thermometer className="w-3 h-3 text-rose-500" /> Temperature
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {stats.average?.temperature?.value != null ? `${stats.average.temperature.value} ${stats.average.temperature.unit}` : '—'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Droplets className="w-3 h-3 text-emerald-500" /> Rel. Humidity
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {stats.average?.humidity?.value != null ? `${stats.average.humidity.value} ${stats.average.humidity.unit}` : '—'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Gauge className="w-3 h-3 text-slate-600" /> Air Pressure
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {stats.average?.pressure?.value != null ? `${stats.average.pressure.value} ${stats.average.pressure.unit}` : '—'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Wind className="w-3 h-3 text-blue-500" /> Wind Speed
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {stats.average?.windSpeed?.value != null ? `${stats.average.windSpeed.value} ${stats.average.windSpeed.unit}` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* MINIMUM SECTION */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 mb-3">
                          <span className="text-xs font-extrabold text-cyan-700 tracking-wider uppercase flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-cyan-600 rotate-180" />
                            MINIMUM
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 border border-cyan-100">
                            LOWEST
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Thermometer className="w-3 h-3 text-rose-500" /> Temperature
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {stats.minimum?.temperature?.value != null ? `${stats.minimum.temperature.value} ${stats.minimum.temperature.unit}` : '—'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Droplets className="w-3 h-3 text-emerald-500" /> Rel. Humidity
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {stats.minimum?.humidity?.value != null ? `${stats.minimum.humidity.value} ${stats.minimum.humidity.unit}` : '—'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Gauge className="w-3 h-3 text-slate-600" /> Air Pressure
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {stats.minimum?.pressure?.value != null ? `${stats.minimum.pressure.value} ${stats.minimum.pressure.unit}` : '—'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Wind className="w-3 h-3 text-blue-500" /> Wind Speed
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {stats.minimum?.windSpeed?.value != null ? `${stats.minimum.windSpeed.value} ${stats.minimum.windSpeed.unit}` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* MAXIMUM SECTION */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-2xs p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 mb-3">
                          <span className="text-xs font-extrabold text-rose-700 tracking-wider uppercase flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
                            MAXIMUM
                          </span>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100">
                            PEAK
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Thermometer className="w-3 h-3 text-rose-500" /> Temperature
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {stats.maximum?.temperature?.value != null ? `${stats.maximum.temperature.value} ${stats.maximum.temperature.unit}` : '—'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Droplets className="w-3 h-3 text-emerald-500" /> Rel. Humidity
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {stats.maximum?.humidity?.value != null ? `${stats.maximum.humidity.value} ${stats.maximum.humidity.unit}` : '—'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs py-1 border-b border-gray-50">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Gauge className="w-3 h-3 text-slate-600" /> Air Pressure
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {stats.maximum?.pressure?.value != null ? `${stats.maximum.pressure.value} ${stats.maximum.pressure.unit}` : '—'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-gray-500 font-medium flex items-center gap-1.5">
                              <Wind className="w-3 h-3 text-blue-500" /> Wind Speed
                            </span>
                            <span className="font-mono font-bold text-gray-900">
                              {stats.maximum?.windSpeed?.value != null ? `${stats.maximum.windSpeed.value} ${stats.maximum.windSpeed.unit}` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* 3. TIME-SERIES TREND CURVE                                   */}
              {/* ============================================================ */}
              {activeSeries.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-2xs">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                        Observation Trend (CanvasJS Official Telemetry Stream)
                      </h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {activeSeries.length} discrete hourly records plotted directly from source dataPoints.
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                      {[
                        { id: 'temperature', label: 'Temp (°C)' },
                        { id: 'windSpeed', label: 'Wind (m/s)' },
                        { id: 'pressure', label: 'Pressure (mBar)' },
                        { id: 'humidity', label: 'Humidity (%)' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveChartParam(item.id)}
                          className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                            activeChartParam === item.id 
                              ? 'bg-white text-gray-900 shadow-2xs font-bold' 
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div 
                    ref={chartContainerRef}
                    className="h-36 w-full pt-2 relative overflow-visible cursor-crosshair"
                    onMouseMove={handleChartMouseMove}
                    onMouseLeave={handleChartMouseLeave}
                  >
                    <svg viewBox="0 0 600 150" className="w-full h-full overflow-visible">
                      <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="85" x2="600" y2="85" stroke="#f1f5f9" strokeWidth="1" />
                      <line x1="0" y1="140" x2="600" y2="140" stroke="#e2e8f0" strokeWidth="1" />

                      {svgPath && (
                        <path
                          d={svgPath}
                          fill="none"
                          stroke={
                            activeChartParam === 'temperature' ? '#D9534F' :
                            activeChartParam === 'humidity' ? '#5CB85C' :
                            activeChartParam === 'pressure' ? '#343A40' : '#4E8DF1'
                          }
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {chartPoints.map((pt, i) => {
                        const isHovered = hoveredIdx === i;
                        const paramColor = 
                          activeChartParam === 'temperature' ? '#D9534F' :
                          activeChartParam === 'humidity' ? '#5CB85C' :
                          activeChartParam === 'pressure' ? '#343A40' : '#4E8DF1';

                        return (
                          <circle
                            key={i}
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? "4.5" : "2.5"}
                            fill={paramColor}
                            stroke={isHovered ? "#fff" : "none"}
                            strokeWidth={isHovered ? "1.5" : "0"}
                            className="transition-all"
                          />
                        );
                      })}

                      {/* Interactive Vertical Guide Line and Highlight Circle */}
                      {hoveredIdx !== null && chartPoints[hoveredIdx] && (() => {
                        const pt = chartPoints[hoveredIdx];
                        const paramColor = 
                          activeChartParam === 'temperature' ? '#D9534F' :
                          activeChartParam === 'humidity' ? '#5CB85C' :
                          activeChartParam === 'pressure' ? '#343A40' : '#4E8DF1';

                        return (
                          <g className="pointer-events-none transition-all duration-150">
                            <line
                              x1={pt.x}
                              y1={25}
                              x2={pt.x}
                              y2={145}
                              stroke="#94a3b8"
                              strokeWidth="1.25"
                              strokeDasharray="3,2"
                              opacity="0.85"
                            />
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="5.5"
                              fill={paramColor}
                              stroke="#fff"
                              strokeWidth="2.5"
                            />
                          </g>
                        );
                      })()}
                    </svg>

                    {/* Interactive Floating Hover Tooltip */}
                    {hoveredIdx !== null && chartPoints[hoveredIdx] && (() => {
                      const pt = chartPoints[hoveredIdx];
                      const xPercent = (pt.x / 600) * 100;
                      
                      // Format timestamp
                      let formattedTime = 'Observation';
                      if (pt.timestamp) {
                        try {
                          const dateObj = new Date(pt.timestamp);
                          if (!isNaN(dateObj.getTime())) {
                            formattedTime = dateObj.toUTCString().slice(17, 22) + ' UTC';
                          }
                        } catch {
                          // Fallback to relative time
                        }
                      } else {
                        const hoursAgo = Math.round(24 - (hoveredIdx / (chartPoints.length - 1 || 1)) * 24);
                        formattedTime = hoursAgo === 0 ? 'Latest' : `T - ${hoursAgo}h`;
                      }

                      const paramLabel = 
                        activeChartParam === 'temperature' ? 'Temperature' :
                        activeChartParam === 'humidity' ? 'Relative Humidity' :
                        activeChartParam === 'pressure' ? 'Air Pressure' : 'Wind Speed';

                      const paramUnit = 
                        activeChartParam === 'temperature' ? '°C' :
                        activeChartParam === 'humidity' ? '%' :
                        activeChartParam === 'pressure' ? 'hPa' : 'm/s';

                      const paramColor = 
                        activeChartParam === 'temperature' ? '#D9534F' :
                        activeChartParam === 'humidity' ? '#5CB85C' :
                        activeChartParam === 'pressure' ? '#343A40' : '#4E8DF1';

                      return (
                        <ChartTooltip
                          timestamp={formattedTime}
                          subtitle="NCPOR Live"
                          items={[
                            {
                              label: paramLabel,
                              value: pt.value,
                              unit: paramUnit,
                              color: paramColor
                            }
                          ]}
                          xPercent={xPercent}
                          yPercent={35}
                          flipLeft={xPercent > 55}
                        />
                      );
                    })()}

                    <div className="flex justify-between text-[10px] font-mono text-gray-400 mt-1">
                      <span>Start: {chartPoints[0]?.value} (24h ago)</span>
                      <span>Range: [{minVal} to {maxVal}]</span>
                      <span>Latest: {chartPoints[chartPoints.length - 1]?.value} (Recent)</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ============================================================== */}
        {/* FOOTER: BACK TO FLOOR PLAN                                     */}
        {/* ============================================================== */}
        <footer className="px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Official Bharati Station telemetry link. Digital twin floor plan state preserved.
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Floor Plan</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
