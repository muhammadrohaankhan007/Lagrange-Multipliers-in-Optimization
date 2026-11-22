"use client";

import React from "react";
import { Download } from "lucide-react";
import { MathBlock } from "@/components/MathBlock";
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

  if (loading && !solution) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        Running SymPy symbolic derivation in Pyodide...
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        Analytical solution unavailable until Pyodide finishes loading.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Step-by-Step Symbolic Solution (SymPy)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generated live by <code className="font-mono">lib/python/solver.py</code> using{" "}
            <code className="font-mono">sympy.diff</code>, <code className="font-mono">sympy.solve</code>, and{" "}
            <code className="font-mono">sympy.latex</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export Results CSV
        </button>
      </div>

      <div className="space-y-3">
        {solution.steps.map((step) => (
          <div
            key={step.step_number}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step.step_number}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {step.explanation}
                </p>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3">
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
