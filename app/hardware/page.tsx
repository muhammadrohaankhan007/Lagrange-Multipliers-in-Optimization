"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Cpu,
  Info,
  Play,
  Square,
  Usb,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import {
  Esp32SerialClient,
  SIMULATED_CAN_PRESETS,
  generateSimulatedReading,
  isWebSerialSupported,
  parseSerialLine,
  type SerialReading,
} from "@/lib/serial";
import { appendRealCan } from "@/lib/cans-storage";

export default function HardwarePage() {
  const [serialSupported, setSerialSupported] = useState<boolean>(true);
  const [connected, setConnected] = useState<boolean>(false);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [presetId, setPresetId] = useState<string>(SIMULATED_CAN_PRESETS[0].id);

  const [latest, setLatest] = useState<SerialReading | null>(null);
  const [history, setHistory] = useState<SerialReading[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [serialWarning, setSerialWarning] = useState<string | null>(null);

  const [canName, setCanName] = useState<string>("Measured Can");
  const [diameterCm, setDiameterCm] = useState<string>("6.62");
  const [volumeMl, setVolumeMl] = useState<string>("355");
  const [capturedToast, setCapturedToast] = useState<string | null>(null);

  const clientRef = useRef<Esp32SerialClient | null>(null);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSerialSupported(isWebSerialSupported());
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      if (clientRef.current) clientRef.current.disconnect();
    };
  }, []);

  const pushReading = (r: SerialReading) => {
    setLatest(r);
    setHistory((prev) => [r, ...prev].slice(0, 12));
  };

  const handleConnectUsb = async () => {
    setErrorMsg(null);
    setSerialWarning(null);
    if (simulating) handleStopSimulation();
    try {
      const client = new Esp32SerialClient();
      clientRef.current = client;
      setConnected(true);
      await client.connect(
        (reading) => pushReading(reading),
        (err) => {
          setErrorMsg(err);
          setConnected(false);
        },
        (warning) => setSerialWarning(warning)
      );
    } catch (err) {
      setConnected(false);
      setErrorMsg(err instanceof Error ? err.message : "Failed to connect to ESP32 over USB.");
    }
  };

  const handleDisconnectUsb = async () => {
    if (clientRef.current) {
      await clientRef.current.disconnect();
      clientRef.current = null;
    }
    setConnected(false);
  };

  const handleStartSimulation = () => {
    setErrorMsg(null);
    setSerialWarning(null);
    if (connected) handleDisconnectUsb();
    const preset =
      SIMULATED_CAN_PRESETS.find((p) => p.id === presetId) ?? SIMULATED_CAN_PRESETS[0];
    setCanName(`${preset.label} (Simulated)`);
    setDiameterCm(String(preset.diameter_cm));
    setVolumeMl(String(preset.stated_volume_ml));

    setSimulating(true);
    pushReading(generateSimulatedReading(preset));
    simTimerRef.current = setInterval(() => {
      pushReading(generateSimulatedReading(preset));
    }, 900);
  };

  const handleStopSimulation = () => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setSimulating(false);
  };

  const handlePresetChange = (nextId: string) => {
    setPresetId(nextId);
    const preset = SIMULATED_CAN_PRESETS.find((p) => p.id === nextId);
    if (preset) {
      setCanName(`${preset.label} (Simulated)`);
      setDiameterCm(String(preset.diameter_cm));
      setVolumeMl(String(preset.stated_volume_ml));
      if (simulating) {
        if (simTimerRef.current) clearInterval(simTimerRef.current);
        pushReading(generateSimulatedReading(preset));
        simTimerRef.current = setInterval(() => {
          pushReading(generateSimulatedReading(preset));
        }, 900);
      }
    }
  };

  const handleTestMalformedLine = () => {
    const outcome = parseSerialLine("{height_cm: broken-json");
    if (outcome.kind === "warning") {
      setSerialWarning(outcome.message);
    }
  };

  const handleCapture = () => {
    if (!latest) return;
    const d = parseFloat(diameterCm);
    const v = parseFloat(volumeMl);
    if (!Number.isFinite(d) || d < 0.5 || d > 100) {
      setErrorMsg("Enter a valid diameter between 0.5 and 100 cm before capturing.");
      return;
    }
    if (!Number.isFinite(v) || v < 1 || v > 100000) {
      setErrorMsg("Enter a valid stated volume between 1 and 100,000 cm³ (mL) before capturing.");
      return;
    }
    setErrorMsg(null);
    const label = canName.trim() || (latest.simulated ? "Simulated Can" : "ESP32 Measured Can");
    appendRealCan({
      name: label,
      diameter_cm: d,
      height_cm: latest.height_cm,
      stated_volume_ml: v,
      isExample: false,
    });
    setCapturedToast(
      `Captured "${label}" (h = ${latest.height_cm.toFixed(2)} cm, d = ${d.toFixed(
        2
      )} cm, V = ${v} cm³) to Real Cans table.`
    );
    setTimeout(() => setCapturedToast(null), 5000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Cpu className="w-4 h-4" aria-hidden="true" />
              Optional Hardware Add-On (Off by Default)
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              Optional: connect an ESP32
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              The main CanOptimizer app is 100% complete without hardware. This optional page lets
              you connect an ESP32 height station over USB using the Web Serial API (no server
              needed).
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Back to Optimizer
          </Link>
        </div>

        {/* Honest Optional & Simulation Disclosure Banner */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/30 p-4 flex items-start gap-3 text-xs sm:text-sm text-indigo-950 dark:text-indigo-200">
          <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong>Optional module notice:</strong> No ESP32 is required to use CanOptimizer.
            When <strong>Simulation Mode</strong> is enabled below, the height values are{" "}
            <strong>synthetic simulated readings — not real physical sensor measurements</strong>.
          </div>
        </div>

        {/* Browser Support Detection */}
        {!serialSupported && (
          <div
            role="status"
            className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 flex items-start gap-3"
          >
            <AlertTriangle
              className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="text-xs sm:text-sm text-amber-900 dark:text-amber-200">
              <strong>Web Serial API is not supported in this browser.</strong> USB ESP32
              connection requires desktop Google Chrome or Microsoft Edge. You can still use{" "}
              <strong>Simulation Mode</strong> below in any browser.
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs sm:text-sm text-rose-800 dark:text-rose-200"
          >
            {errorMsg}
          </div>
        )}

        {serialWarning && (
          <div
            role="status"
            className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3.5 flex items-start justify-between gap-3 text-xs text-amber-900 dark:text-amber-200"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{serialWarning}</span>
            </div>
            <button
              type="button"
              onClick={() => setSerialWarning(null)}
              className="underline font-medium shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {capturedToast && (
          <div
            role="status"
            className="rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-4 flex items-center justify-between gap-3 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2
                className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                aria-hidden="true"
              />
              <span>{capturedToast}</span>
            </div>
            <Link href="/" className="underline font-semibold shrink-0">
              View in Real Cans →
            </Link>
          </div>
        )}

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Real Hardware USB Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Usb className="w-4 h-4 text-indigo-600" aria-hidden="true" />
                USB Web Serial (ESP32)
              </h2>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  connected
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Flash <code className="font-mono">/firmware/src/main.cpp</code> to your ESP32,
              connect via USB, and click Connect. Expects 115200 baud JSON lines like{" "}
              <code className="font-mono">{`{"height_cm": 12.24}`}</code>. Malformed lines are
              safely ignored with a warning.
            </p>
            <div className="flex flex-wrap gap-2">
              {!connected ? (
                <button
                  type="button"
                  onClick={handleConnectUsb}
                  disabled={!serialSupported}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
                >
                  <Usb className="w-4 h-4" aria-hidden="true" />
                  Connect device
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDisconnectUsb}
                  className="inline-flex items-center gap-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition-colors"
                >
                  Disconnect
                </button>
              )}
              <button
                type="button"
                onClick={handleTestMalformedLine}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
              >
                Test malformed JSON handling
              </button>
            </div>
          </div>

          {/* Simulation Mode Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Simulation Mode (Synthetic Data)
              </h2>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                  simulating
                    ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                {simulating ? "Simulated Stream Active" : "Idle"}
              </span>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="sim-preset-select"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Simulated Can Preset (generates synthetic readings, not real measurements):
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  id="sim-preset-select"
                  value={presetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  {SIMULATED_CAN_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} (~{p.height_cm} cm)
                    </option>
                  ))}
                </select>

                {!simulating ? (
                  <button
                    type="button"
                    onClick={handleStartSimulation}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    Start Simulation
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopSimulation}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white px-3.5 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" aria-hidden="true" />
                    Stop
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Reading + Capture Panel */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {latest?.simulated
                  ? "Simulated Height Reading (Not a Real Measurement)"
                  : "Live Height Reading (cm)"}
              </div>
              <div className="text-4xl font-bold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                {latest ? `${latest.height_cm.toFixed(2)} cm` : "— . — — cm"}
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {latest
                  ? `${
                      latest.simulated ? "Simulated (synthetic)" : "ESP32 USB Serial"
                    } · ${new Date(latest.timestamp).toLocaleTimeString()}`
                  : "Start Simulation or connect an ESP32 to stream live heights."}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCapture}
              disabled={!latest}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-5 py-2.5 text-sm font-semibold shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
            >
              <Camera className="w-4 h-4" aria-hidden="true" />
              Capture to Real Cans Table
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label
                htmlFor="hw-can-label"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Can Label
              </label>
              <input
                id="hw-can-label"
                type="text"
                value={canName}
                onChange={(e) => setCanName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>
            <div>
              <label
                htmlFor="hw-can-diameter"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Diameter d (cm) — Manual / Caliper
              </label>
              <input
                id="hw-can-diameter"
                type="number"
                step="0.01"
                min="0.5"
                max="100"
                value={diameterCm}
                onChange={(e) => setDiameterCm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>
            <div>
              <label
                htmlFor="hw-can-volume"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Stated Volume (cm³ / mL)
              </label>
              <input
                id="hw-can-volume"
                type="number"
                step="1"
                min="1"
                max="100000"
                value={volumeMl}
                onChange={(e) => setVolumeMl(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          {history.length > 0 && (
            <div className="pt-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                Recent Serial JSON Stream
              </div>
              <div className="rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs p-3 max-h-40 overflow-y-auto space-y-1">
                {history.map((item, idx) => (
                  <div key={`${item.timestamp}-${idx}`}>
                    [{new Date(item.timestamp).toLocaleTimeString()}] {item.raw}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 px-4 text-center text-xs text-slate-600 dark:text-slate-400">
        Lagrange Multipliers in Optimization: Minimum-Surface-Area Soda Can · Optional ESP32
        Module
      </footer>
    </div>
  );
}
