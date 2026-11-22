"use client";

import React from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import type { SolverStage, SolverStatus } from "@/lib/solver-client";

interface PyodideBannerProps {
  status: SolverStatus;
  onRetry: () => void;
}

const STAGE_PROGRESS: Record<SolverStage, number> = {
  idle: 10,
  loading_runtime: 30,
  loading_packages: 65,
  loading_solver: 85,
  warming_up: 95,
  ready: 100,
  error: 0,
};

export function PyodideBanner({ status, onRetry }: PyodideBannerProps) {
  if (status.stage === "ready") return null;

  if (status.stage === "error") {
    return (
      <div
        role="alert"
        className="rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-4 flex flex-wrap items-start justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200">
              Pyodide Math Engine Failed to Load
            </h3>
            <p className="text-xs text-rose-800 dark:text-rose-300 mt-1">{status.message}</p>
            <p className="text-xs text-rose-700 dark:text-rose-400 mt-1">
              CanOptimizer solves the Lagrange system live in Python (SymPy + SciPy) via Pyodide
              and intentionally does not fall back to hardcoded answers. Please check your
              connection to jsDelivr CDN and retry.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry Pyodide
        </button>
      </div>
    );
  }

  const pct = STAGE_PROGRESS[status.stage] ?? 20;

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/80 dark:bg-indigo-950/40 p-4 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Loader2
            className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">
              Initializing In-Browser Python Math Engine (Pyodide Web Worker)
            </div>
            <div className="text-xs text-indigo-800 dark:text-indigo-300 mt-0.5">
              {status.message} — First load fetches SymPy &amp; SciPy once and caches them in your
              browser.
            </div>
          </div>
        </div>
        <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-300 shrink-0">
          {pct}%
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900 overflow-hidden">
        <div
          className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
