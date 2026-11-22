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
        <div className="lg:col-span-2 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Constrained Optimization Model
            </h2>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-[#0f766e]/20 bg-[#f0fdfa] text-[#0f766e]">
              Lagrange Multipliers
            </span>
          </div>

          <p className="text-[15px] text-[#334155] leading-relaxed">
            For a fixed target volume <MathBlock latex="V_0" display={false} /> (in{" "}
            <MathBlock latex="\text{cm}^3" display={false} />, where{" "}
            <MathBlock latex="1\text{ mL} = 1\text{ cm}^3" display={false} />), determine the
            radius <MathBlock latex="r" display={false} /> (cm) and height{" "}
            <MathBlock latex="h" display={false} /> (cm) of a closed right circular cylindrical
            soda can that minimize total surface area{" "}
            <MathBlock latex="f(r, h)" display={false} /> (
            <MathBlock latex="\text{cm}^2" display={false} />).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
                Objective (Surface Area in cm²)
              </div>
              <MathBlock latex="f(r, h) = 2\pi r^2 + 2\pi r h" />
            </div>
            <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#475569] mb-1">
                Equality Constraint (Volume in cm³)
              </div>
              <MathBlock latex={`g(r, h) = \\pi r^2 h = V_0 = ${v0}\\text{ cm}^3`} />
            </div>
          </div>

          <div className="rounded-lg bg-[#f0fdfa] border border-[#0f766e]/20 p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#0f766e] mb-1">
              Lagrange Multiplier System
            </div>
            <MathBlock latex="\nabla f(r, h) = \lambda\,\nabla g(r, h), \qquad g(r, h) = V_0 \qquad (r > 0,\; h > 0)" />
            <p className="text-xs text-[#334155] mt-2 leading-relaxed">
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
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-[#0f172a]">
                Target Volume <MathBlock latex="V_0" display={false} />
              </h3>
              <button
                type="button"
                onClick={onResetV0}
                className="inline-flex items-center gap-1 rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                Reset to 355
              </button>
            </div>

            <div>
              <label
                htmlFor="v0-input-problem"
                className="block text-xs font-medium text-[#334155] mb-1.5"
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
                  className={`w-full rounded-lg border px-3 py-2 text-base font-mono tabular-nums font-semibold bg-white text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 ${
                    v0Error
                      ? "border-[#b91c1c] focus-visible:ring-[#b91c1c]"
                      : "border-[#cbd5e1] focus-visible:ring-[#0f766e]"
                  }`}
                />
                <span className="text-sm font-medium text-[#475569] shrink-0">cm³</span>
              </div>
              {v0Error && (
                <p id="v0-error-problem" role="alert" className="text-xs text-[#b91c1c] mt-1.5">
                  {v0Error} Showing last valid result for V₀ = {v0} cm³.
                </p>
              )}
            </div>

            <div>
              <div className="text-xs font-medium text-[#475569] mb-2">Quick Presets</div>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onSelectPresetV0(p.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors ${
                      v0 === p.value && !v0Error
                        ? "bg-[#0f766e] text-white"
                        : "bg-[#f1f5f9] text-[#334155] hover:bg-[#e2e8f0]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-[#475569] border-t border-[#e2e8f0] pt-3">
            Every result below is solved live by SymPy inside your browser — no hardcoded formulas
            in the frontend.
          </p>
        </div>
      </div>

      {/* Live SymPy Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: "Optimal Radius r*",
            value: solution ? `${solution.r_opt.toFixed(4)} cm` : "—",
            sub: solution ? `Diameter d* = ${solution.d_opt.toFixed(4)} cm` : "Waiting for engine…",
          },
          {
            label: "Optimal Height h*",
            value: solution ? `${solution.h_opt.toFixed(4)} cm` : "—",
            sub: solution
              ? `Ratio h*/d* = ${solution.h_over_d_opt.toFixed(4)} (dimensionless)`
              : "Waiting for engine…",
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
            sub: solution?.is_strict_minimum ? "Positive → strict minimum" : "Waiting for engine…",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="text-xs font-medium text-[#475569]">{card.label}</div>
            <div className="text-lg font-semibold font-mono tabular-nums text-[#0f172a] mt-1">
              {loading && !solution ? "…" : card.value}
            </div>
            <div className="text-xs text-[#475569] mt-1">{card.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
