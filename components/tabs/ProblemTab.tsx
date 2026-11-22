"use client";

import React from "react";
import { RotateCcw } from "lucide-react";
import { MathBlock } from "@/components/MathBlock";
import type { AnalyticalSolution } from "@/lib/solver-client";

interface ProblemTabProps {
  v0: number;
  v0Input: string;
  v0Error: string | null;
  onChangeV0Input: (raw: string) => void;
  onSelectPresetV0: (v: number) => void;
  onResetV0: () => void;
  solution: AnalyticalSolution | null;
  loading: boolean;
}

const PRESETS = [
  { label: "250 cm³ Slim", value: 250 },
  { label: "330 cm³ Standard", value: 330 },
  { label: "355 cm³ Classic", value: 355 },
  { label: "500 cm³ Tallboy", value: 500 },
  { label: "1000 cm³ Canister", value: 1000 },
];

export function ProblemTab({
  v0,
  v0Input,
  v0Error,
  onChangeV0Input,
  onSelectPresetV0,
  onResetV0,
  solution,
  loading,
}: ProblemTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Constrained Optimization Model
            </h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Lagrange Multipliers
            </span>
          </div>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            For a fixed target volume <MathBlock latex="V_0" display={false} /> (in{" "}
            <MathBlock latex="\text{cm}^3" display={false} />, where{" "}
            <MathBlock latex="1\text{ mL} = 1\text{ cm}^3" display={false} />), determine the
            radius <MathBlock latex="r" display={false} /> (cm) and height{" "}
            <MathBlock latex="h" display={false} /> (cm) of a closed right circular cylindrical
            soda can that minimize total surface area{" "}
            <MathBlock latex="f(r, h)" display={false} /> (
            <MathBlock latex="\text{cm}^2" display={false} />).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Objective (Surface Area in cm²)
              </div>
              <MathBlock latex="f(r, h) = 2\pi r^2 + 2\pi r h" />
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
                Equality Constraint (Volume in cm³)
              </div>
              <MathBlock latex={`g(r, h) = \\pi r^2 h = V_0 = ${v0}\\text{ cm}^3`} />
            </div>
          </div>

          <div className="rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-800 dark:text-indigo-300 mb-1">
              Lagrange Multiplier System
            </div>
            <MathBlock latex="\nabla f(r, h) = \lambda\,\nabla g(r, h), \qquad g(r, h) = V_0 \qquad (r > 0,\; h > 0)" />
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2">
              At the optimal dimensions <MathBlock latex="(r^*, h^*)" display={false} />, the
              surface-area level curve <MathBlock latex="f(r, h) = A_{\min}" display={false} /> is
              tangent to the volume constraint <MathBlock latex="g(r, h) = V_0" display={false} />,
              meaning their gradients are parallel and{" "}
              <MathBlock latex="\lambda" display={false} /> has units of{" "}
              <MathBlock latex="\text{cm}^2/\text{cm}^3 = 1/\text{cm}" display={false} />.
            </p>
          </div>
        </div>

        {/* Target Volume Control Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Target Volume <MathBlock latex="V_0" display={false} />
              </h3>
              <button
                type="button"
                onClick={onResetV0}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Reset to 355
              </button>
            </div>

            <div>
              <label
                htmlFor="v0-input-problem"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Volume in cm³ (valid range: 1 to 100,000 cm³)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="v0-input-problem"
                  type="text"
                  inputMode="decimal"
                  value={v0Input}
                  aria-invalid={Boolean(v0Error)}
                  aria-describedby={v0Error ? "v0-error-problem" : undefined}
                  onChange={(e) => onChangeV0Input(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-base font-mono font-semibold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 ${
                    v0Error
                      ? "border-rose-500 focus-visible:ring-rose-500"
                      : "border-slate-300 dark:border-slate-700 focus-visible:ring-indigo-500"
                  }`}
                />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 shrink-0">
                  cm³
                </span>
              </div>
              {v0Error && (
                <p
                  id="v0-error-problem"
                  role="alert"
                  className="text-xs text-rose-600 dark:text-rose-400 mt-1.5"
                >
                  {v0Error} Showing last valid result for V₀ = {v0} cm³.
                </p>
              )}
            </div>

            <div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                Quick Presets
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onSelectPresetV0(p.value)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors ${
                      v0 === p.value && !v0Error
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
            Every result below is solved live by SymPy inside the Pyodide Web Worker — no
            hardcoded formulas in the frontend.
          </div>
        </div>
      </div>

      {/* Live SymPy Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Optimal Radius r*",
            value: solution ? `${solution.r_opt.toFixed(4)} cm` : "—",
            sub: solution ? `Diameter d* = ${solution.d_opt.toFixed(4)} cm` : "Awaiting SymPy",
          },
          {
            label: "Optimal Height h*",
            value: solution ? `${solution.h_opt.toFixed(4)} cm` : "—",
            sub: solution
              ? `Ratio h*/d* = ${solution.h_over_d_opt.toFixed(4)} (dimensionless)`
              : "Awaiting SymPy",
          },
          {
            label: "Minimum Area A_min",
            value: solution ? `${solution.area_min.toFixed(4)} cm²` : "—",
            sub: `For V₀ = ${v0} cm³`,
          },
          {
            label: "Lagrange Multiplier λ*",
            value: solution ? `${solution.lambda_opt.toFixed(5)} 1/cm` : "—",
            sub: "Marginal area dA/dV₀ (cm²/cm³)",
          },
          {
            label: "2nd Derivative A''(r*)",
            value: solution ? `${solution.second_derivative_at_opt.toFixed(2)} cm²/cm²` : "—",
            sub: solution?.is_strict_minimum ? "Positive → strict minimum ✓" : "Checking...",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
          >
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {card.label}
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-1">
              {loading ? "..." : card.value}
            </div>
            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">{card.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
