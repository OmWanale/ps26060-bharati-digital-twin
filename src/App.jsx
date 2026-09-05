import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Layers, 
  Clock, 
  Wifi, 
  MapPin, 
  Radio,
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon,
  Info, 
  Loader2, 
  Sparkles,
  Zap,
  RotateCcw,
  ShieldAlert,
  Flame,
  Power,
  ChevronRight,
  Bot,
  Sliders,
  PlayCircle,
  XCircle,
  X
} from 'lucide-react';
import { 
  INITIAL_SYSTEM_STATES, 
  FLOOR_PLANS, 
  SIMULATION_SCENARIOS 
} from './data/bharatiFloorData';
import ArchitecturalFloorPlan from './components/ArchitecturalFloorPlan';

export default function App() {
  const [activeLevel, setActiveLevel] = useState('Level 2');
  const [selectedComponentId, setSelectedComponentId] = useState('chp_gen01');
  const [systemStates, setSystemStates] = useState(INITIAL_SYSTEM_STATES);
  const [diagnosticsRunning, setDiagnosticsRunning] = useState(false);
  const [actionNotice, setActionNotice] = useState(null);
  const [activeScenarioId, setActiveScenarioId] = useState(null);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
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

  // Launch Simulated Scenario
  const handleSelectScenario = (scenario) => {
    setShowScenarioModal(false);
    setActiveScenarioId(scenario.id);
    setActionNotice(null);

    // Apply fault state to systems
    setSystemStates((prev) => ({
      ...prev,
      ...scenario.faultState,
    }));

    // Switch floor view and select component
    setActiveLevel(scenario.targetLevel);
    setSelectedComponentId(scenario.targetComponentId);
  };

  // Reset all systems to nominal
  const handleResetAllNominal = () => {
    setShowScenarioModal(false);
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
    <div className="h-screen w-full flex flex-col overflow-hidden text-gray-800 bg-gray-50 font-sans select-none">
      {/* ============================================================== */}
      {/* TOP NAVBAR: BHARATI REMOTE OPERATIONS                          */}
      {/* ============================================================== */}
      <header className="h-16 bg-white border-b border-gray-200 shadow-sm px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3.5">
          {/* Station Crest Icon */}
          <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm ring-2 ring-blue-600/15">
            <Radio className="w-5 h-5 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">
                Bharati Station Remote Operations
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                LIVE LINK
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                SIH PS26060 • SIMULATED PROTOTYPE
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 tracking-normal mt-1">
              PS26060 - Digital Twin Framework | MoES & NCPOR
            </p>
          </div>
        </div>

        {/* Operational Metadata Bar */}
        <div className="flex items-center gap-3.5 text-xs text-gray-600">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-mono text-gray-700 font-medium">69°24′28″S 76°11′14″E</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">Larsemann Hills, Antarctica</span>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-gray-50 border border-gray-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-mono text-gray-700 font-medium">{currentTime.slice(17, 25)} UTC</span>
          </div>

          {/* SIMULATE SCENARIO BUTTON */}
          <button
            type="button"
            onClick={() => setShowScenarioModal(true)}
            className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            <span>SIMULATE SCENARIO</span>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* MAIN BODY: 70% BLUEPRINT (LEFT) + 30% TELEMETRY DRAWER (RIGHT) */}
      {/* ============================================================== */}
      <main className="flex-1 flex overflow-hidden bg-gray-50">
        {/* Left Column (70% width): Interactive Floor Plan */}
        <section className="w-[70%] h-full p-5 flex flex-col overflow-hidden">
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

            {/* Simulation Status Badge & Reset */}
            <div className="flex items-center gap-2">
              {activeScenarioId ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    SCENARIO ACTIVE
                  </span>
                  <button
                    type="button"
                    onClick={handleResetAllNominal}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 shadow-2xs transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset All
                  </button>
                </div>
              ) : (
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  All Station Systems Nominal
                </span>
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
        </section>

        {/* Right Column (30% width): Telemetry & Actions Drawer */}
        <aside className="w-[30%] h-full bg-white border-l border-gray-200 shadow-lg z-10 flex flex-col">
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
                className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                title="Deselect"
              >
                Clear
              </button>
            )}
          </div>

          {/* Drawer Body */}
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

                {/* Simulated Telemetry Disclaimer Badge */}
                <div className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded text-[10px] font-mono text-gray-500 flex items-center justify-between">
                  <span>DATA FEED: SIMULATED (MOCK)</span>
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
      </main>

      {/* ============================================================== */}
      {/* SIMULATE SCENARIO MODAL                                        */}
      {/* ============================================================== */}
      {showScenarioModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Simulate Station Anomaly Scenario
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  SIH PS26060: Test automated fault detection, AI recommendation and remote operator mitigation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowScenarioModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {SIMULATION_SCENARIOS.map((scen) => (
                <div
                  key={scen.id}
                  onClick={() => handleSelectScenario(scen)}
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

            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetAllNominal}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Reset All to Nominal
              </button>
              <button
                type="button"
                onClick={() => setShowScenarioModal(false)}
                className="px-4 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
