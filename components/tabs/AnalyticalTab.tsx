"use client";

import React from "react";
import { Download } from "lucide-react";
import { MathBlock } from "@/components/MathBlock";
import { ResultSummaryStrip } from "@/components/ResultSummaryStrip";
import { EngineWaitingSkeleton } from "@/components/EngineWaitingSkeleton";
import { downloadCsv } from "@/lib/csv";
import type { AnalyticalSolution } from "@/lib/solver-client";

interface AnalyticalTabProps {
  solution: AnalyticalSolution | null;
  loading: boolean;
}

export function AnalyticalTab({ solution, loading }: AnalyticalTabProps) {
  const handleExportCsv = () => {
    if (!solution) return;
    downloadCsv(
      `canoptimizer-analytical-V${solution.v0}.csv`,
      ["Quantity", "Value", "Units"],
      [
        ["Target Volume V0", solution.v0, "cm^3"],
        ["End-Cost Weight k", solution.k, "dimensionless"],
        ["Optimal Radius r*", solution.r_opt, "cm"],
        ["Optimal Diameter d*", solution.d_opt, "cm"],
        ["Optimal Height h*", solution.h_opt, "cm"],
        ["Aspect Ratio h*/d*", solution.h_over_d_opt, "dimensionless"],
        ["Lagrange Multiplier lambda*", solution.lambda_opt, "1/cm"],
        ["Minimum Surface Area A_min", solution.area_min, "cm^2"],
        ["Second Derivative A''(r*)", solution.second_derivative_at_opt, "cm^2 / cm^2"],
      ]
    );
  };

  if (!solution) {
    return (
      <EngineWaitingSkeleton
        title={
          loading
            ? "Computing symbolic derivation with SymPy…"
            : "Waiting for the math engine…"
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <ResultSummaryStrip
        solution={solution}
        caption={`SymPy analytical optimum for V₀ = ${solution.v0} cm³`}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#0f172a]">
            Step-by-Step Symbolic Solution (SymPy)
          </h2>
          <p className="text-xs text-[#475569] mt-0.5">
            Generated live by <code className="font-mono">lib/python/solver.py</code> using{" "}
            <code className="font-mono">sympy.diff</code>,{" "}
            <code className="font-mono">sympy.solve</code>, and{" "}
            <code className="font-mono">sympy.latex</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Export Results CSV
        </button>
      </div>

      <div className="space-y-3">
        {solution.steps.map((step) => (
          <div
            key={step.step_number}
            className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-7 h-7 rounded-full bg-[#0f766e] text-white text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                {step.step_number}
              </div>
              <div className="min-w-0 flex-1 space-y-2.5">
                <h3 className="text-sm font-semibold text-[#0f172a]">{step.title}</h3>
                <p className="text-sm text-[#334155] leading-relaxed">{step.explanation}</p>
                <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] px-4 py-3">
                  <MathBlock latex={step.latex} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
