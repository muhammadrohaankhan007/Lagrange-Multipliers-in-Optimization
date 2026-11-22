"use client";

import React from "react";
import { CheckCircle2, Download, Info, XCircle } from "lucide-react";
import { downloadCsv } from "@/lib/csv";
import type { NumericalVerification } from "@/lib/solver-client";

interface VerificationTabProps {
  verification: NumericalVerification | null;
  tolerance: number;
  onChangeTolerance: (tol: number) => void;
  loading: boolean;
}

const TOLERANCE_OPTIONS = [
  { label: "1e-2 (0.01)", value: 1e-2 },
  { label: "1e-3 (0.001)", value: 1e-3 },
  { label: "1e-4 (0.0001)", value: 1e-4 },
  { label: "1e-5", value: 1e-5 },
  { label: "1e-6", value: 1e-6 },
];

export function VerificationTab({
  verification,
  tolerance,
  onChangeTolerance,
  loading,
}: VerificationTabProps) {
  const handleExportCsv = () => {
    if (!verification) return;
    downloadCsv(
      `canoptimizer-slsqp-verification-V${verification.v0}.csv`,
      [
        "Starting Point",
        "Method",
        "Start r0 (cm)",
        "Start h0 (cm)",
        "r (cm)",
        "h (cm)",
        "Area (cm^2)",
        "|Delta r| (cm)",
        "|Delta h| (cm)",
        "|Delta Area| (cm^2)",
        "|g(r,h)-V0| (cm^3)",
        "Iterations",
        "Status",
      ],
      verification.runs.map((r) => [
        r.label,
        r.method,
        r.start_r,
        r.start_h,
        r.r_num,
        r.h_num,
        r.area_num,
        r.diff_r,
        r.diff_h,
        r.diff_area,
        r.constraint_residual,
        r.iterations,
        r.passed ? "PASS" : "FAIL",
      ])
    );
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Independent Numerical Verification (SciPy SLSQP)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Minimizes <code className="font-mono">f(r, h)</code> subject to{" "}
              <code className="font-mono">πr²h − V₀ = 0</code> from 6 diverse initial guesses
              (cm) and compares against the SymPy analytical optimum.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="tol-select"
                className="text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Tolerance:
              </label>
              <select
                id="tol-select"
                value={tolerance}
                onChange={(e) => onChangeTolerance(parseFloat(e.target.value))}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {TOLERANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {verification && (
              <div
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  verification.all_passed
                    ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
                    : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300"
                }`}
              >
                {verification.all_passed ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    ALL {verification.runs.length} RUNS PASSED
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" aria-hidden="true" />
                    TOLERANCE EXCEEDED
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!verification}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              CSV
            </button>
          </div>
        </div>

        {/* Explicit Pass/Fail Badge Explanation */}
        <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>How PASS / FAIL is determined:</strong> Each SLSQP run passes only if the
            optimizer reports convergence (<code className="font-mono">success = true</code>) AND
            all three absolute differences against the SymPy analytical reference —{" "}
            <code className="font-mono">|r_SLSQP − r*|</code> (cm),{" "}
            <code className="font-mono">|h_SLSQP − h*|</code> (cm), and{" "}
            <code className="font-mono">|A_SLSQP − A_min|</code> (cm²) — are less than or equal to
            the selected tolerance (<code className="font-mono">≤ {tolerance}</code>).
          </p>
        </div>
      </div>

      {loading && !verification ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
          Running SciPy SLSQP multi-start verification...
        </div>
      ) : verification ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Method / Start (r₀, h₀) cm</th>
                  <th className="px-4 py-3 font-semibold font-mono">r (cm)</th>
                  <th className="px-4 py-3 font-semibold font-mono">h (cm)</th>
                  <th className="px-4 py-3 font-semibold font-mono">Area (cm²)</th>
                  <th className="px-4 py-3 font-semibold font-mono">|Δr| (cm)</th>
                  <th className="px-4 py-3 font-semibold font-mono">|Δh| (cm)</th>
                  <th className="px-4 py-3 font-semibold font-mono">|ΔArea| (cm²)</th>
                  <th className="px-4 py-3 font-semibold">Iters</th>
                  <th className="px-4 py-3 font-semibold">Badge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                <tr className="bg-indigo-50/50 dark:bg-indigo-950/20 font-medium">
                  <td className="px-4 py-3 text-indigo-900 dark:text-indigo-200">
                    SymPy Analytical (Reference)
                  </td>
                  <td className="px-4 py-3 font-mono">{verification.analytical_r.toFixed(6)}</td>
                  <td className="px-4 py-3 font-mono">{verification.analytical_h.toFixed(6)}</td>
                  <td className="px-4 py-3 font-mono">
                    {verification.analytical_area.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500">0</td>
                  <td className="px-4 py-3 font-mono text-slate-500">0</td>
                  <td className="px-4 py-3 font-mono text-slate-500">0</td>
                  <td className="px-4 py-3 text-slate-500">—</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-indigo-100 dark:bg-indigo-900/60 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800 dark:text-indigo-200">
                      EXACT
                    </span>
                  </td>
                </tr>
                {verification.runs.map((run) => (
                  <tr
                    key={run.label}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {run.method} — {run.label}
                      </div>
                      <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                        start = ({run.start_r.toFixed(2)} cm, {run.start_h.toFixed(2)} cm)
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono">{run.r_num.toFixed(6)}</td>
                    <td className="px-4 py-3 font-mono">{run.h_num.toFixed(6)}</td>
                    <td className="px-4 py-3 font-mono">{run.area_num.toFixed(6)}</td>
                    <td className="px-4 py-3 font-mono">{run.diff_r.toExponential(2)}</td>
                    <td className="px-4 py-3 font-mono">{run.diff_h.toExponential(2)}</td>
                    <td className="px-4 py-3 font-mono">{run.diff_area.toExponential(2)}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                      {run.iterations}
                    </td>
                    <td className="px-4 py-3">
                      {run.passed ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                          PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-950 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                          FAIL
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
