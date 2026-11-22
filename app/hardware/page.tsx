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
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#0f172a]">
      <Navbar />

      <main
        id="main-content"
        className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0f766e]">
              <Cpu className="w-4 h-4" aria-hidden="true" />
              Optional Hardware Add-On (Off by Default)
            </div>
            <h1 className="text-2xl font-semibold text-[#0f172a] mt-0.5">
              Optional: connect an ESP32
            </h1>
            <p className="text-sm text-[#475569] mt-1">
              The main CanOptimizer app is 100% complete without hardware. This optional page lets
              you connect an ESP32 height station over USB using the Web Serial API (no server
              needed).
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Back to Optimizer
          </Link>
        </div>

        <div className="rounded-xl border border-[#0f766e]/25 bg-[#f0fdfa] p-4 flex items-start gap-3 text-sm text-[#0f172a]">
          <Info className="w-5 h-5 text-[#0f766e] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <strong>Optional module notice:</strong> No ESP32 is required to use CanOptimizer. When{" "}
            <strong>Simulation Mode</strong> is enabled below, the height values are{" "}
            <strong>synthetic simulated readings — not real physical sensor measurements</strong>.
          </div>
        </div>

        {!serialSupported && (
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-[#fffbeb] p-4 flex items-start gap-3"
          >
            <AlertTriangle
              className="w-5 h-5 text-[#b45309] shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="text-sm text-[#b45309]">
              <strong>Web Serial API is not supported in this browser.</strong> USB ESP32
              connection requires desktop Google Chrome or Microsoft Edge. You can still use{" "}
              <strong>Simulation Mode</strong> below in any browser.
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-[#fef2f2] p-4 text-sm text-[#b91c1c]"
          >
            {errorMsg}
          </div>
        )}

        {serialWarning && (
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-[#fffbeb] p-3.5 flex items-start justify-between gap-3 text-xs text-[#b45309]"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
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
            className="rounded-xl border border-emerald-200 bg-[#ecfdf5] p-4 flex items-center justify-between gap-3 text-sm text-[#047857]"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{capturedToast}</span>
            </div>
            <Link href="/" className="underline font-semibold shrink-0">
              View in Real Cans →
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#0f172a] flex items-center gap-2">
                <Usb className="w-4 h-4 text-[#0f766e]" aria-hidden="true" />
                USB Web Serial (ESP32)
              </h2>
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  connected
                    ? "bg-[#ecfdf5] text-[#047857] border border-emerald-200"
                    : "bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]"
                }`}
              >
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <p className="text-xs text-[#475569]">
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
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0f766e] hover:bg-[#115e59] disabled:opacity-45 text-white px-4 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2 transition-colors"
                >
                  <Usb className="w-4 h-4" aria-hidden="true" />
                  Connect device
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDisconnectUsb}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#b91c1c] hover:bg-red-800 text-white px-4 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b91c1c] focus-visible:ring-offset-2 transition-colors"
                >
                  Disconnect
                </button>
              )}
              <button
                type="button"
                onClick={handleTestMalformedLine}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
              >
                Test malformed JSON handling
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#0f172a]">
                Simulation Mode (Synthetic Data)
              </h2>
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                  simulating
                    ? "bg-[#fffbeb] text-[#b45309] border border-amber-200"
                    : "bg-[#f1f5f9] text-[#475569] border border-[#e2e8f0]"
                }`}
              >
                {simulating ? "Simulated Stream Active" : "Idle"}
              </span>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="sim-preset-select"
                className="block text-xs font-medium text-[#334155]"
              >
                Simulated Can Preset (generates synthetic readings, not real measurements):
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  id="sim-preset-select"
                  value={presetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="flex-1 rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-xs text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
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
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white px-3.5 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" aria-hidden="true" />
                    Start Simulation
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopSimulation}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3.5 py-2 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
                  >
                    <Square className="w-3.5 h-3.5" aria-hidden="true" />
                    Stop
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-[#475569]">
                {latest?.simulated
                  ? "Simulated Height Reading (Not a Real Measurement)"
                  : "Live Height Reading (cm)"}
              </div>
              <div className="text-4xl font-semibold font-mono tabular-nums text-[#0f766e] mt-1">
                {latest ? `${latest.height_cm.toFixed(2)} cm` : "— . — — cm"}
              </div>
              <div className="text-xs text-[#475569] mt-1">
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
              className="inline-flex items-center gap-2 rounded-lg bg-[#0f766e] hover:bg-[#115e59] disabled:opacity-40 text-white px-5 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2 transition-colors"
            >
              <Camera className="w-4 h-4" aria-hidden="true" />
              Capture to Real Cans Table
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#e2e8f0]">
            <div>
              <label htmlFor="hw-can-label" className="block text-xs font-medium text-[#334155] mb-1">
                Can Label
              </label>
              <input
                id="hw-can-label"
                type="text"
                value={canName}
                onChange={(e) => setCanName(e.target.value)}
                className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
              />
            </div>
            <div>
              <label
                htmlFor="hw-can-diameter"
                className="block text-xs font-medium text-[#334155] mb-1"
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
                className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-mono tabular-nums text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
              />
            </div>
            <div>
              <label
                htmlFor="hw-can-volume"
                className="block text-xs font-medium text-[#334155] mb-1"
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
                className="w-full rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-sm font-mono tabular-nums text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
              />
            </div>
          </div>

          {history.length > 0 && (
            <div className="pt-2">
              <div className="text-xs font-semibold text-[#475569] mb-2">
                Recent Serial JSON Stream
              </div>
              <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] text-[#0f172a] font-mono text-xs p-3 max-h-40 overflow-y-auto space-y-1">
                {history.map((item, idx) => (
                  <div key={`${item.timestamp}-${idx}`}>
                    <span className="text-[#475569]">
                      [{new Date(item.timestamp).toLocaleTimeString()}]
                    </span>{" "}
                    {item.raw}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[#e2e8f0] bg-white py-5 px-4 text-center text-xs text-[#475569]">
        Lagrange Multipliers in Optimization: Minimum-Surface-Area Soda Can · Optional ESP32
        Module
      </footer>
    </div>
  );
}
