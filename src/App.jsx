import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  Loader2, 
  Sparkles, 
  RotateCcw, 
  Power, 
  Bot, 
  PlayCircle
} from 'lucide-react';
import { 
  INITIAL_SYSTEM_STATES 
} from './data/bharatiFloorData';
import ArchitecturalFloorPlan from './components/ArchitecturalFloorPlan';
import IndiaFlag from './components/IndiaFlag';
import LiveNCPORDataModal from './components/LiveNCPORDataModal';
import ForecastPanel from './components/ForecastPanel';
import ScenarioControlPanel from './components/ScenarioControlPanel';
import SimulationResultPanel from './components/SimulationResultPanel';
import { simulateScenario } from './services/simulationService';
import { DEFAULT_MOCK_SIMULATION_RESULT } from './data/mockSimulationResult';

export default function App() {
  const [activeLevel, setActiveLevel] = useState('Level 2');
  const [selectedComponentId, setSelectedComponentId] = useState('chp_gen01');
  const [systemStates, setSystemStates] = useState(INITIAL_SYSTEM_STATES);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [showLiveDataModal, setShowLiveDataModal] = useState(false);
  const [simulationResult, setSimulationResult] = useState(DEFAULT_MOCK_SIMULATION_RESULT);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toUTCString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const floors = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'External Systems'];

  // Current selected system object
  const selectedSystem = selectedComponentId ? systemStates[selectedComponentId] : null;

  // Execute Simulated Remote Management Action
  const handleExecuteAction = (actionName, mitigationKey = null) => {
    if (!selectedSystem) return;

    setDiagnosticsRunning(true);
    setActionNotice(null);

    setTimeout(() => {
      setDiagnosticsRunning(false);

      // Handle specific smart automation mitigation or general actions
      if (mitigationKey === 'activate_chp_backup' || actionName === 'ACTIVATE BACKUP') {
        setSystemStates((prev) => ({
          ...prev,
          chp_gen01: {
            ...prev.chp_gen01,
            status: 'OPERATIONAL',
            telemetry: {
              ...prev.chp_gen01.telemetry,
              'Load %': '0% (Isolated / Standby)',
              'Temperature': '72.4°C (Stabilized)',
              'Fuel Consumption': '0.0 L/hr',
              'Vibration': '0.0 mm/s',
              'Health': '94%',
              'Status': 'Standby Cooling',
            },
            recommendation: null,
          },
          chp_gen02: {
            ...prev.chp_gen02,
            status: 'OPERATIONAL',
            telemetry: {
              ...prev.chp_gen02.telemetry,
              'Load %': '68%',
              'Temperature': '79.2°C',
              'Fuel Consumption': '25.2 L/hr',
              'Vibration': '1.5 mm/s (Normal)',
              'Status': 'Running (Lead Backup Active)',
            },
          },
        }));
        setActionNotice({
          type: 'success',
          text: 'Remote action executed — simulated: Backup Generator 02 engaged. Primary Generator 01 isolated. Power grid stable.',
        });
      } else if (mitigationKey === 'shed_grid_loads' || actionName === 'REDUCE LOAD') {
        setSystemStates((prev) => {
          const currentSys = prev[selectedComponentId];
          const newStatus = 'OPERATIONAL';
          const updatedTelemetry = { ...currentSys.telemetry };

          if (updatedTelemetry['Load %']) updatedTelemetry['Load %'] = '58%';
          if (updatedTelemetry['Load']) updatedTelemetry['Load'] = '62% (Loads Shed)';
          if (updatedTelemetry['Current']) updatedTelemetry['Current'] = '142 A (Balanced)';
          if (updatedTelemetry['Temperature']) updatedTelemetry['Temperature'] = '76.0°C (Cooled)';
          if (updatedTelemetry['Fuel Consumption']) updatedTelemetry['Fuel Consumption'] = '21.5 L/hr';

          return {
            ...prev,
            [selectedComponentId]: {
              ...currentSys,
              status: newStatus,
              telemetry: updatedTelemetry,
              recommendation: null,
            },
          };
        });
        setActionNotice({
          type: 'success',
          text: 'Remote action executed — simulated: Non-critical heating & workshop loads shed. Grid parameters nominal.',
        });
      } else if (mitigationKey === 'restart_ro_pump' || actionName === 'START PUMP') {
        setSystemStates((prev) => ({
          ...prev,
          ro_plant: {
            ...prev.ro_plant,
            status: 'OPERATIONAL',
            telemetry: {
              ...prev.ro_plant.telemetry,
              'Flow Rate': '490 L/hr (Restored)',
              'Pressure': '57.0 bar',
              'Pump Status': 'HP Pump 02 Running (Normal)',
              'Water Quality Status': 'Potable (80 ppm TDS)',
              'Health': '97%',
            },
            recommendation: null,
          },
        }));
        setActionNotice({
          type: 'success',
          text: 'Remote action executed — simulated: Standby RO High-Pressure Pump 02 started. Potable output restored.',
        });
      } else if (mitigationKey === 'transfer_fuel' || actionName === 'INITIATE FUEL TRANSFER') {
        setSystemStates((prev) => ({
          ...prev,
          fuel_farm: {
            ...prev.fuel_farm,
            status: 'OPERATIONAL',
            telemetry: {
              ...prev.fuel_farm.telemetry,
              'Fuel Level': '82% (Automated Transfer Active)',
              'Estimated Remaining': '135 Days Autonomous',
              'Tank Status': 'Transferring Bulk 2 -> Day Tank',
            },
            recommendation: null,
          },
        }));
        setActionNotice({
          type: 'success',
          text: 'Remote action executed — simulated: Bulk fuel transfer engaged. Station fuel reserve replenished.',
        });
      } else if (mitigationKey === 'reconnect_satcom' || actionName === 'RECONNECT') {
        setSystemStates((prev) => ({
          ...prev,
          satcom_system: {
            ...prev.satcom_system,
            status: 'OPERATIONAL',
            telemetry: {
              ...prev.satcom_system.telemetry,
              'Link Status': 'Locked (Inmarsat Polar Backup BGAN)',
              'Signal Strength': '-62 dBm (Strong)',
              'Latency': '610 ms',
              'Connection Status': 'Failover Link Synchronized',
            },
            recommendation: null,
          },
        }));
        setActionNotice({
          type: 'success',
          text: 'Remote action executed — simulated: Satellite uplink failover complete. Polar IP link restored.',
        });
      } else if (mitigationKey === 'set_hvac_safe' || actionName === 'SET SAFE MODE') {
        setSystemStates((prev) => ({
          ...prev,
          ahu_system: {
            ...prev.ahu_system,
            status: 'OPERATIONAL',
            telemetry: {
              ...prev.ahu_system.telemetry,
              'Temperature': '19.2°C Supply / 21.0°C Return',
              'Airflow': '3,900 m³/hr (Recirculation 85%)',
              'Fan Status': 'Synchronized (Safe Mode)',
              'Power Consumption': '36.5 kW (Optimized)',
              'System Health': '96%',
            },
            recommendation: null,
          },
        }));
        setActionNotice({
          type: 'success',
          text: 'Remote action executed — simulated: HVAC Safe Mode engaged. Recirculation loop active against blizzard.',
        });
      } else {
        // Generic Action / Diagnostics
        setSystemStates((prev) => ({
          ...prev,
          [selectedComponentId]: {
            ...prev[selectedComponentId],
            status: 'OPERATIONAL',
            recommendation: null,
          },
        }));
        setActionNotice({
          type: 'success',
          text: `Remote action executed — simulated: Command [${actionName}] applied to ${selectedSystem.name}. Telemetry nominal.`,
        });
      }
    }, 800);
  };

  // Execute What-If Scenario simulation and update results section
  const handleSimulateScenario = async (scenarioPayload) => {
    setIsSimulating(true);
    setSimulationError(null);

    // Smooth scroll to the results section
    const resultsEl = document.getElementById('simulation-results-section');
    if (resultsEl) {
      resultsEl.scrollIntoView({ behavior: 'smooth' });
    }

    try {
      const res = await simulateScenario(scenarioPayload);
      setSimulationResult(res);
      setActionNotice({
        type: 'success',
        text: `What-If Simulation complete: Predicted Power ${res.summary.predictedPowerDemand.value} kW, Fuel ${res.summary.predictedFuelConsumption.value} L/hr.`
      });
    } catch (err) {
      console.error('Simulation error:', err);
      setSimulationError('Unable to generate simulation results.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Smooth scroll to scenario control panel
  const scrollToScenario = () => {
    const el = document.getElementById('scenario-control-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Reset all systems to nominal
  const handleResetAllNominal = () => {
    setActiveScenarioId(null);
    setActionNotice(null);
    setSystemStates(INITIAL_SYSTEM_STATES);
  };

  // Status badge helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPERATIONAL':
        return {
          dotClass: 'bg-green-500',
          badgeClass: 'text-green-700 bg-green-50 border-green-200',
          label: 'OPERATIONAL',
        };
      case 'WARNING':
        return {
          dotClass: 'bg-amber-500',
          badgeClass: 'text-amber-700 bg-amber-50 border-amber-200',
          label: 'WARNING / ATTENTION REQUIRED',
        };
      case 'FAULT':
        return {
          dotClass: 'bg-red-500',
          badgeClass: 'text-red-700 bg-red-50 border-red-200',
          label: 'CRITICAL / FAULT',
        };
      case 'OFFLINE':
      default:
        return {
          dotClass: 'bg-gray-400',
          badgeClass: 'text-gray-600 bg-gray-100 border-gray-200',
          label: 'OFFLINE',
        };
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col text-gray-800 bg-gray-50 font-sans">
      {/* ============================================================== */}
      {/* TOP NAVBAR: BHARATI REMOTE OPERATIONS                          */}
      {/* ============================================================== */}
      <header className="sticky top-0 h-16 bg-white border-b border-gray-200 shadow-xs px-6 flex items-center justify-between z-30 shrink-0">
        {/* Left: Station Identity on a single line */}
        <div className="flex items-center gap-2.5 shrink-0 select-none">
          {/* Indian National Flag */}
          <div className="flex items-center shrink-0" title="Republic of India">
            <IndiaFlag className="h-6 w-auto rounded-[2px] shadow-2xs border border-gray-200/90" />
          </div>

          <h1 className="text-base font-bold text-gray-900 tracking-tight whitespace-nowrap">
            Bharati Station Remote Operations
          </h1>
        </div>

        {/* Right: Operational Metadata & Two Distinct Action Buttons */}
        <div className="flex items-center gap-3 text-xs text-gray-600 shrink-0">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-mono text-gray-700 font-medium whitespace-nowrap">69°24′28″S 76°11′14″E</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500 whitespace-nowrap">Larsemann Hills, Antarctica</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-mono text-gray-700 font-medium whitespace-nowrap">{currentTime.slice(17, 25)} UTC</span>
          </div>

          {/* Action 1: Live NCPOR Data (Calm Teal/Cyan tone - Real Environmental Data) */}
          <button
            type="button"
            onClick={() => setShowLiveDataModal(true)}
            className="px-3.5 py-1.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 hover:text-teal-900 font-semibold text-xs border border-teal-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Open Live NCPOR Data (Real Environmental Observations)"
          >
            <Activity className="w-3.5 h-3.5 text-teal-600" />
            <span>Live NCPOR Data</span>
          </button>

          {/* Action 2: Simulate Scenario (Scrolls to Scenario Control) */}
          <button
            type="button"
            onClick={scrollToScenario}
            className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Jump to Scenario Control (What-If Analysis)"
          >
            <PlayCircle className="w-3.5 h-3.5 text-white" />
            <span>Simulate Scenario</span>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN CONTENT AREA: VERTICALLY SCROLLABLE                       */}
      {/* ============================================================== */}
      <main className="min-h-0 flex-1 flex flex-col">
        {/* ============================================================== */}
        {/* SECTION 1: 2D FLOORPLAN (LEFT) + TELEMETRY SIDEBAR (RIGHT)     */}
        {/* ============================================================== */}
        <section className="w-full h-[calc(100vh-4rem)] min-h-[600px] flex border-b border-gray-200 shrink-0 bg-gray-50">
        {/* Left Column (70% width): Interactive Floor Plan */}
        <div className="w-[70%] h-full p-5 flex flex-col overflow-hidden">
          {/* Floor Navigation Toggles */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="inline-flex items-center gap-1.5">
              {floors.map((level) => {
                const isActive = activeLevel === level;
                // Count active warnings or faults on this level
                const levelAlerts = Object.values(systemStates).filter(
                  (s) => s.level === level && (s.status === 'WARNING' || s.status === 'FAULT')
                ).length;

                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => {
                      setActiveLevel(level);
                      setActionNotice(null);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span>{level}</span>
                    {levelAlerts > 0 && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-400 text-slate-900 animate-pulse">
                        {levelAlerts}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Simulation Status Badge & Reset (Active Only) */}
            <div className="flex items-center gap-2">
              {activeScenarioId && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    SCENARIO ACTIVE
                  </span>
                  <button
                    type="button"
                    onClick={handleResetAllNominal}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset All
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Architectural SVG Floor Plan Component */}
          <ArchitecturalFloorPlan
            activeLevel={activeLevel}
            selectedComponentId={selectedComponentId}
            onSelectComponent={(compId) => {
              setSelectedComponentId(compId);
              setActionNotice(null);
            }}
            systemStates={systemStates}
          />
        </div>

        {/* Right Column (30% width): Telemetry & Actions Sidebar */}
        <aside className="w-[30%] h-full bg-white border-l border-gray-200 shadow-sm z-10 flex flex-col">
          {/* Drawer Header */}
          <div className="h-16 border-b border-gray-200 px-6 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-blue-600" />
              <h2 className="font-bold text-gray-900 text-base tracking-tight">
                Telemetry & Actions
              </h2>
            </div>
            {selectedSystem && (
              <button
                type="button"
                onClick={() => setSelectedComponentId(null)}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                title="Deselect"
              >
                Clear
              </button>
            )}
          </div>

          {/* Drawer Body: Telemetry & Actions for Selected Component */}
          {selectedSystem ? (
            <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto bg-white">
              <div className="space-y-4">
                {/* Header with Component Name, Code & Level */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-mono text-blue-600 font-bold uppercase tracking-wider">
                      {selectedSystem.code}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {selectedSystem.level} • {selectedSystem.category}
                    </span>
                  </div>
                  <h3 className="text-gray-900 font-bold text-lg leading-snug">
                    {selectedSystem.name}
                  </h3>

                  {/* Sleek Status Badge */}
                  {(() => {
                    const badge = getStatusBadge(selectedSystem.status);
                    return (
                      <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border ${badge.badgeClass}`}>
                        <span className={`w-2 h-2 rounded-full ${badge.dotClass} ${selectedSystem.status !== 'OPERATIONAL' ? 'animate-ping' : ''}`}></span>
                        <span>● {badge.label}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* ========================================================== */}
                {/* SMART AUTOMATION / AI RULE RECOMMENDATION ENGINE (PS26060) */}
                {/* ========================================================== */}
                {selectedSystem.recommendation && (
                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 shadow-2xs space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between font-bold text-blue-800">
                      <span className="flex items-center gap-1.5">
                        <Bot className="w-4 h-4 text-blue-600" />
                        Smart Automation Recommendation
                      </span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 bg-blue-100 rounded text-blue-700">
                        {selectedSystem.recommendation.ruleId}
                      </span>
                    </div>
                    <p className="text-gray-700 leading-relaxed text-[11px]">
                      {selectedSystem.recommendation.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleExecuteAction(
                        selectedSystem.recommendation.actionLabel,
                        selectedSystem.recommendation.mitigationKey
                      )}
                      disabled={diagnosticsRunning}
                      className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{selectedSystem.recommendation.actionLabel}</span>
                    </button>
                  </div>
                )}

                {/* Telemetry Stream Status Badge */}
                <div className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded text-[10px] font-mono text-gray-500 flex items-center justify-between">
                  <span>TELEMETRY STREAM: STATION SENSORS</span>
                  <span className="text-emerald-600 font-semibold">REFRESH: 1 Hz</span>
                </div>

                {/* Component-Specific Telemetry Rows */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                    Live Telemetry Parameters
                  </h4>
                  <div className="divide-y divide-gray-200">
                    {Object.entries(selectedSystem.telemetry || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between py-2 text-xs">
                        <span className="text-gray-500 font-medium">{key}:</span>
                        <span className="font-mono font-semibold text-gray-900">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Supported Remote Actions Section */}
              <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Remote Management Actions
                </h4>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => handleExecuteAction('RUN DIAGNOSTICS')}
                  disabled={diagnosticsRunning}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-80 text-white w-full py-2.5 rounded-lg shadow-sm transition-colors font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {diagnosticsRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Transmitting Remote Command...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>RUN DIAGNOSTICS</span>
                    </>
                  )}
                </button>

                {/* Contextual Realistic Component Actions */}
                <div className="grid grid-cols-1 gap-1.5">
                  {selectedSystem.availableActions?.filter((a) => a !== 'RUN DIAGNOSTICS').map((action) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => handleExecuteAction(action)}
                      disabled={diagnosticsRunning}
                      className="w-full py-2 px-3 text-xs font-semibold bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Power className="w-3.5 h-3.5 text-gray-500" />
                      <span>{action}</span>
                    </button>
                  ))}
                </div>

                {/* Action Confirmation Banner */}
                {actionNotice && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-start gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{actionNotice.text}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400 gap-3">
              <Info className="w-10 h-10 stroke-[1.5]" />
              <p className="text-sm max-w-[220px] leading-relaxed">
                Select a station zone or infrastructure component to view telemetry.
              </p>
            </div>
          )}
        </aside>
      </section>

      {/* ============================================================== */}
      {/* SECTION 2: FORECAST PANEL (Current → Predicted)                 */}
      {/* ============================================================== */}
      <section id="forecast-section" className="w-full bg-white border-b border-gray-200 px-6 lg:px-12 py-10">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-blue-700 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Station Environmental & Demand Forecasting</span>
            </div>
            <span className="text-xs font-mono text-gray-400">Current → Predicted</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-6">
            <ForecastPanel />
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 3: SCENARIO CONTROL (Power | Generator | Fuel | ...)   */}
      {/* ============================================================== */}
      <section id="scenario-control-section" className="w-full bg-gray-50 border-b border-gray-200 px-6 lg:px-12 py-10">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-700 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span>What-If Scenario Control</span>
            </div>
            <span className="text-xs font-mono text-gray-400">Power | Generator | Fuel | Environment | Duration</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-6">
            <ScenarioControlPanel onSimulate={handleSimulateScenario} />
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 4: SIMULATION RESULTS (Impact | Risk | Forecast | ...) */}
      {/* ============================================================== */}
      <section id="simulation-results-section" className="w-full bg-white px-6 lg:px-12 py-10 pb-20">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>Simulated Operational Results</span>
            </div>
            <span className="text-xs font-mono text-gray-400">Impact | Risk | Forecast | Recommendation</span>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-6">
            <SimulationResultPanel
              simulationResult={simulationResult}
              loading={isSimulating}
              error={simulationError}
              empty={!simulationResult && !isSimulating}
              onRunNewScenario={scrollToScenario}
            />
          </div>
        </div>
      </section>
      </main>

      {/* ============================================================== */}
      {/* LIVE NCPOR REAL-DATA PORTAL MODAL / SECTION                     */}
      {/* ============================================================== */}
      <LiveNCPORDataModal
        isOpen={showLiveDataModal}
        onClose={() => setShowLiveDataModal(false)}
      />
    </div>
  );
}
