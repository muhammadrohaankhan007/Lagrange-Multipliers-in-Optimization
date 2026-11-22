"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type { SolverStatus } from "@/lib/solver-client";

interface PyodideBannerProps {
  status: SolverStatus;
  onRetry: () => void;
}

export function PyodideBanner({ status, onRetry }: PyodideBannerProps) {
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const startTimeRef = useRef<number | null>(null);

  // Track real elapsed seconds while loading
  useEffect(() => {
    if (status.stage === "idle" || status.stage === "loading") {
      setCollapsed(false);
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
      const interval = setInterval(() => {
        if (startTimeRef.current !== null) {
          setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    }

    if (status.stage === "error") {
      setCollapsed(false);
      startTimeRef.current = null;
      return;
    }

    if (status.stage === "ready") {
      startTimeRef.current = null;
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const timer = setTimeout(() => {
        setCollapsed(true);
      }, reduced ? 900 : 1600);
      return () => clearTimeout(timer);
    }
  }, [status.stage]);

  // Once collapsed after ready, stay collapsed unless the engine restarts or errors
  if (status.stage === "ready" && collapsed) {
    return null;
  }

  const activeStep = status.steps.find((s) => s.state === "active");
  const isError = status.stage === "error";
  const isReady = status.stage === "ready";
  const showSlowHint = !isError && !isReady && elapsedSec >= 20;

  return (
    <section
      aria-label="Math engine initialization status"
      aria-live="polite"
      className={`rounded-xl border p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 motion-reduce:transition-none ${
        isError
          ? "border-red-200 bg-[#fef2f2]"
          : isReady
          ? "border-emerald-200 bg-[#ecfdf5]"
          : "border-[#e2e8f0] bg-white"
      }`}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            {isError ? (
              <AlertCircle className="w-4 h-4 text-[#b91c1c] shrink-0" aria-hidden="true" />
            ) : isReady ? (
              <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" aria-hidden="true" />
            ) : (
              <Loader2
                className="w-4 h-4 text-[#0f766e] animate-spin motion-reduce:animate-none shrink-0"
                aria-hidden="true"
              />
            )}
            <h2 className="text-sm font-semibold text-[#0f172a]">
              {isError
                ? "Math engine could not start"
                : isReady
                ? "Math engine ready"
                : "Starting the math engine"}
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
            {isError
              ? `Initialization stopped during "${status.failedStep || "startup"}". Please check your internet connection and retry.`
              : isReady
              ? "SymPy and SciPy passed the startup self-test. Collapsing into the top status indicator…"
              : "This site runs Python (SymPy and SciPy) directly in your browser, so there is no server. The first visit downloads these tools, and later visits are much faster."}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!isReady && !isError && (
            <span
              className="rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 font-mono text-xs tabular-nums text-[#475569]"
              aria-label={`Elapsed time ${elapsedSec} seconds`}
            >
              {elapsedSec} s
            </span>
          )}
          {isError && (
            <button
              type="button"
              onClick={() => {
                startTimeRef.current = Date.now();
                setElapsedSec(0);
                onRetry();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#b91c1c] hover:bg-red-800 text-white px-3.5 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Real-event step list */}
      {!isReady && (
        <ol className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {status.steps.map((step) => {
            const isActive = step.state === "active";
            const isDone = step.state === "done";
            const isFailed = step.state === "failed";
            return (
              <li
                key={step.id}
                className={`rounded-lg border px-3 py-2 text-xs space-y-1.5 ${
                  isFailed
                    ? "border-red-200 bg-white text-[#b91c1c]"
                    : isActive
                    ? "border-[#0f766e]/40 bg-[#f0fdfa] text-[#0f172a]"
                    : isDone
                    ? "border-[#e2e8f0] bg-[#f8fafc] text-[#334155]"
                    : "border-[#e2e8f0] bg-white text-[#475569]"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isDone ? (
                    <CheckCircle2
                      className="w-3.5 h-3.5 text-[#047857] shrink-0"
                      aria-hidden="true"
                    />
                  ) : isFailed ? (
                    <XCircle
                      className="w-3.5 h-3.5 text-[#b91c1c] shrink-0"
                      aria-hidden="true"
                    />
                  ) : isActive ? (
                    <Loader2
                      className="w-3.5 h-3.5 text-[#0f766e] animate-spin motion-reduce:animate-none shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-[#cbd5e1] shrink-0" aria-hidden="true" />
                  )}
                  <span className={isActive || isFailed ? "font-medium" : ""}>
                    {step.label}
                  </span>
                </div>

                {/* Indeterminate bar for the active step only — never fake percentages */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    className="h-1 w-full rounded-full bg-[#e2e8f0] overflow-hidden"
                  >
                    <div className="loader-indeterminate h-full rounded-full bg-[#0f766e]" />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* Calm slow-connection hint after 20 seconds */}
      {showSlowHint && (
        <p className="mt-3 text-xs text-[#475569]">
          Still working{activeStep ? ` on "${activeStep.label}"` : ""}. A slow connection can make
          the first load take longer.
        </p>
      )}

      {/* Collapsible Technical Details on failure */}
      {isError && (status.rawError || status.message) && (
        <details className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-[#334155]">
          <summary className="cursor-pointer font-medium text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] rounded">
            Technical details
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] text-[#475569]">
            {status.rawError || status.message}
          </pre>
        </details>
      )}
    </section>
  );
}
