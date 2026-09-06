import React, { useEffect, useRef, useState } from 'react';
import {
  Radio,
  Lightbulb,
  Play,
  Square,
  Loader2,
  CheckCircle2,
  XCircle,
  Signal,
  Activity,
} from 'lucide-react';
import { sendCommand, subscribeDeviceEvents } from '../services/commandService';

const INITIAL_LOG = [];

/**
 * Esp32LedPanel - Live hardware control card.
 *
 * Shows the real ESP32 LED node (via the bridge server) with live telemetry
 * and Start/Stop blink remote commands. Falls back gracefully when the
 * device or bridge is unreachable.
 */
export default function Esp32LedPanel() {
  const [online, setOnline] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [busy, setBusy] = useState(null); // 'LED_START_BLINK' | 'LED_STOP_BLINK' | null
  const [log, setLog] = useState(INITIAL_LOG);
  const [lastResult, setLastResult] = useState(null); // { ok, latencyMs, reason }
  const offlineTimerRef = useRef(null);

  // Live subscription over WebSocket
  useEffect(() => {
    const unsubscribe = subscribeDeviceEvents({
      onState: (state) => {
        if (state.online) {
          // Device is connected - cancel any pending offline flip
          if (offlineTimerRef.current) {
            clearTimeout(offlineTimerRef.current);
            offlineTimerRef.current = null;
          }
          setOnline(true);
          // Prefer the real device telemetry over a simulator's
          if (state.telemetry && !(state.telemetry.deviceId || '').includes('sim')) {
            setTelemetry({ ...state.telemetry, deviceId: state.telemetry.deviceId });
          }
        } else {
          // Grace period: a single dropped WS frame / blip should not flip
          // the badge. Wait 8s of confirmed offline before showing OFFLINE.
          if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
          offlineTimerRef.current = setTimeout(() => setOnline(false), 8000);
        }
      },
      onTelemetry: (msg) => {
        // Ignore simulator telemetry when it can't be the real device's
        if (msg.deviceId && String(msg.deviceId).includes('sim')) {
          setTelemetry((prev) => (prev && (prev.deviceId || '').includes('sim') ? { ...msg.telemetry, deviceId: msg.deviceId } : prev));
          return;
        }
        // Any live telemetry also means the device is reachable
        if (offlineTimerRef.current) {
          clearTimeout(offlineTimerRef.current);
          offlineTimerRef.current = null;
        }
        setOnline(true);
        setTelemetry({ ...msg.telemetry, deviceId: msg.deviceId });
      },
      onLog: (entry) => {
        setLog((prev) => [entry, ...prev].slice(0, 6));
      },
    });
    return () => {
      unsubscribe();
      if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
    };
  }, []);

  const executeCommand = async (action) => {
    if (busy) return;
    setBusy(action);
    setLastResult(null);
    try {
      const result = await sendCommand(action);
      setLastResult({
        ok: result.acked,
        latencyMs: result.latencyMs,
        reason: result.reason || (result.httpStatus === 409 ? 'device_offline' : null),
      });
    } catch {
      setLastResult({ ok: false, reason: 'bridge_unreachable' });
    } finally {
      setBusy(null);
    }
  };

  // Blink phase mirror: the physical LED toggles every 500ms while blinking,
  // but telemetry samples at 1Hz catch random phases. So while blink mode is
  // active we alternate the display locally at the same 500ms rate instead of
  // showing the aliased sampled bit.
  const [blinkPhase, setBlinkPhase] = useState(false);
  const blinking = telemetry ? telemetry.blinking : false;

  useEffect(() => {
    if (!blinking) return undefined;
    const timer = setInterval(() => setBlinkPhase((p) => !p), 500);
    return () => clearInterval(timer);
  }, [blinking]);

  const ledOn = blinking ? blinkPhase : telemetry ? telemetry.led : false;

  const fmtUptime = (s) => {
    if (s == null) return '—';
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const rssiLabel = (rssi) => {
    if (rssi == null) return '—';
    if (rssi >= -60) return `${rssi} dBm (Strong)`;
    if (rssi >= -70) return `${rssi} dBm (Fair)`;
    return `${rssi} dBm (Weak)`;
  };

  return (
    <div className="bg-white rounded-xl flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-gray-900 tracking-tight">ESP32 LED Control</h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              LIVE HARDWARE
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Remote command execution on real device
          </p>
        </div>

        {/* Connection indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border ${
            online
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-50 text-gray-500 border-gray-200'
          }`}
          title={online ? 'Device connected to bridge' : 'Device offline or bridge unreachable'}
        >
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-gray-400'}`} />
          <Radio className="w-3 h-3" />
          <span>{online ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Live telemetry grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50/70 border border-gray-200/80 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            <Lightbulb className="w-3 h-3 text-amber-500" />
            LED State
          </div>
          <p className={`font-mono text-sm font-bold ${ledOn ? 'text-amber-600' : 'text-gray-400'}`}>
            {ledOn ? 'ON' : 'OFF'}
            {blinking && <span className="ml-1.5 text-[10px] font-bold text-blue-600 animate-pulse">BLINKING</span>}
          </p>
        </div>

        <div className="bg-gray-50/70 border border-gray-200/80 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            <Signal className="w-3 h-3 text-blue-500" />
            WiFi Signal
          </div>
          <p className="font-mono text-sm font-bold text-gray-800">
            {telemetry ? rssiLabel(telemetry.rssi) : '—'}
          </p>
        </div>

        <div className="bg-gray-50/70 border border-gray-200/80 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            <Activity className="w-3 h-3 text-emerald-500" />
            Uptime
          </div>
          <p className="font-mono text-sm font-bold text-gray-800">
            {telemetry ? fmtUptime(telemetry.uptime_s) : '—'}
          </p>
        </div>

        <div className="bg-gray-50/70 border border-gray-200/80 rounded-lg p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-3 h-3 text-indigo-500" />
            Commands
          </div>
          <p className="font-mono text-sm font-bold text-gray-800">
            {telemetry && telemetry.commands != null ? telemetry.commands : '—'}
          </p>
        </div>
      </div>

      {/* Command buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => executeCommand('LED_START_BLINK')}
          disabled={!!busy}
          className="py-2.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
        >
          {busy === 'LED_START_BLINK' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          <span>{busy === 'LED_START_BLINK' ? 'SENDING...' : 'Start Blink'}</span>
        </button>

        <button
          type="button"
          onClick={() => executeCommand('LED_STOP_BLINK')}
          disabled={!!busy}
          className="py-2.5 px-3 rounded-lg bg-white hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-gray-300 shadow-2xs transition-colors cursor-pointer"
        >
          {busy === 'LED_STOP_BLINK' ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Square className="w-3.5 h-3.5 text-gray-600" />
          )}
          <span>{busy === 'LED_STOP_BLINK' ? 'SENDING...' : 'Stop Blink'}</span>
        </button>
      </div>

      {/* Last command result */}
      {lastResult && (
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${
            lastResult.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {lastResult.ok ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>
                Command acknowledged by device in {lastResult.latencyMs}ms
              </span>
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span>
                {lastResult.reason === 'device_offline' && 'Device offline - connect the ESP32 and retry'}
                {lastResult.reason === 'ack_timeout' && 'Device did not acknowledge in time'}
                {lastResult.reason === 'bridge_unreachable' && 'Bridge server unreachable'}
                {!['device_offline', 'ack_timeout', 'bridge_unreachable'].includes(lastResult.reason) &&
                  `Command failed (${lastResult.reason || 'unknown'})`}
              </span>
            </>
          )}
        </div>
      )}

      {/* Command log */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Command Log</h4>
          <span className="text-[10px] font-mono text-gray-400">last {log.length || 0}</span>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 min-h-[64px] max-h-28 overflow-y-auto">
          {log.length === 0 ? (
            <p className="text-[11px] text-gray-400 font-mono py-2 text-center">
              No commands sent yet
            </p>
          ) : (
            <div className="space-y-1">
              {log.map((entry, idx) => (
                <div
                  key={`log-${entry.ts}-${idx}`}
                  className="flex items-center justify-between text-[10px] font-mono"
                >
                  <span className="text-gray-600 truncate flex-1">
                    {entry.event === 'ack' && (
                      <span className="text-emerald-600 font-bold">ACK </span>
                    )}
                    {entry.event === 'sent' && (
                      <span className="text-blue-600 font-bold">SENT </span>
                    )}
                    {entry.event === 'rejected' && (
                      <span className="text-rose-600 font-bold">REJECT </span>
                    )}
                    {entry.event === 'timeout' && (
                      <span className="text-amber-600 font-bold">TIMEOUT </span>
                    )}
                    {entry.event === 'device_online' && (
                      <span className="text-emerald-600 font-bold">DEVICE ONLINE </span>
                    )}
                    {entry.event === 'device_offline' && (
                      <span className="text-gray-500 font-bold">DEVICE OFFLINE </span>
                    )}
                    {entry.action || ''}
                  </span>
                  <span className="text-gray-400 ml-2 shrink-0">
                    {entry.ts ? new Date(entry.ts).toLocaleTimeString([], { hour12: false }) : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
