"use client";

import React from "react";
import { CheckCircle2, Download, Info, XCircle } from "lucide-react";
import { ResultSummaryStrip } from "@/components/ResultSummaryStrip";
import { EngineWaitingSkeleton } from "@/components/EngineWaitingSkeleton";
import { downloadCsv } from "@/lib/csv";
import type { AnalyticalSolution, NumericalVerification } from "@/lib/solver-client";

interface VerificationTabProps {
  solution: AnalyticalSolution | null;
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
  solution,
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

  if (!verification) {
    return (
      <EngineWaitingSkeleton
        title={
          loading
            ? "Running SciPy SLSQP multi-start verification…"
            : "Waiting for the math engine…"
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <ResultSummaryStrip
        solution={solution}
        caption={`SymPy analytical reference for V₀ = ${verification.v0} cm³`}
      />

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Independent Numerical Verification (SciPy SLSQP)
            </h2>
            <p className="text-sm text-[#475569] mt-0.5">
              Minimizes <code className="font-mono">f(r, h)</code> subject to{" "}
              <code className="font-mono">πr²h − V₀ = 0</code> from 6 diverse initial guesses
              (cm) and compares against the SymPy analytical optimum.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="tol-select" className="text-xs font-medium text-[#334155]">
                Tolerance:
              </label>
              <select
                id="tol-select"
                value={tolerance}
                onChange={(e) => onChangeTolerance(parseFloat(e.target.value))}
                className="rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1.5 text-xs font-mono text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
              >
                {TOLERANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                verification.all_passed
                  ? "bg-[#ecfdf5] text-[#047857] border border-emerald-200"
                  : "bg-[#fef2f2] text-[#b91c1c] border border-red-200"
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

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              CSV
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] px-4 py-3 flex items-start gap-2.5 text-xs text-[#334155]">
          <Info className="w-4 h-4 text-[#0f766e] shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong className="text-[#0f172a]">How PASS / FAIL is determined:</strong> Each SLSQP
            run passes only if the optimizer reports convergence (
            <code className="font-mono">success = true</code>) AND all three absolute differences
            against the SymPy analytical reference —{" "}
            <code className="font-mono">|r_SLSQP − r*|</code> (cm),{" "}
            <code className="font-mono">|h_SLSQP − h*|</code> (cm), and{" "}
            <code className="font-mono">|A_SLSQP − A_min|</code> (cm²) — are less than or equal to
            the selected tolerance (<code className="font-mono">≤ {tolerance}</code>).
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
        <div className="overflow-x-auto max-h-[520px]">
          <table className="w-full min-w-[780px] text-left text-xs sm:text-sm">
            <thead className="sticky top-0 z-10 bg-[#f8fafc] border-b border-[#e2e8f0] text-[#334155]">
              <tr>
                <th className="px-4 py-3 font-semibold">Method / Start (r₀, h₀) cm</th>
                <th className="px-4 py-3 font-semibold font-mono text-right">r (cm)</th>
                <th className="px-4 py-3 font-semibold font-mono text-right">h (cm)</th>
                <th className="px-4 py-3 font-semibold font-mono text-right">Area (cm²)</th>
                <th className="px-4 py-3 font-semibold font-mono text-right">|Δr| (cm)</th>
                <th className="px-4 py-3 font-semibold font-mono text-right">|Δh| (cm)</th>
                <th className="px-4 py-3 font-semibold font-mono text-right">|ΔArea| (cm²)</th>
                <th className="px-4 py-3 font-semibold text-right">Iters</th>
                <th className="px-4 py-3 font-semibold text-right">Badge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              <tr className="bg-[#f0fdfa] font-medium">
                <td className="px-4 py-3 text-[#0f766e]">SymPy Analytical (Reference)</td>
                <td className="px-4 py-3 font-mono tabular-nums text-right">
                  {verification.analytical_r.toFixed(6)}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-right">
                  {verification.analytical_h.toFixed(6)}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-right">
                  {verification.analytical_area.toFixed(6)}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-right text-[#475569]">0</td>
                <td className="px-4 py-3 font-mono tabular-nums text-right text-[#475569]">0</td>
                <td className="px-4 py-3 font-mono tabular-nums text-right text-[#475569]">0</td>
                <td className="px-4 py-3 text-right text-[#475569]">—</td>
                <td className="px-4 py-3 text-right">
                  <span className="inline-flex rounded-full bg-white border border-[#0f766e]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#0f766e]">
                    EXACT
                  </span>
                </td>
              </tr>
              {verification.runs.map((run) => (
                <tr
                  key={run.label}
                  className="even:bg-[#f8fafc] hover:bg-[#f1f5f9]/70 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#0f172a]">
                      {run.method} — {run.label}
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-[#475569]">
                      start = ({run.start_r.toFixed(2)} cm, {run.start_h.toFixed(2)} cm)
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right">
                    {run.r_num.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right">
                    {run.h_num.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right">
                    {run.area_num.toFixed(6)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right">
                    {run.diff_r.toExponential(2)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right">
                    {run.diff_h.toExponential(2)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right">
                    {run.diff_area.toExponential(2)}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-right text-[#475569]">
                    {run.iterations}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {run.passed ? (
                      <span className="inline-flex rounded-full bg-[#ecfdf5] border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#047857]">
                        PASS
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-[#fef2f2] border border-red-200 px-2.5 py-0.5 text-[11px] font-semibold text-[#b91c1c]">
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
    </div>
  );
}
