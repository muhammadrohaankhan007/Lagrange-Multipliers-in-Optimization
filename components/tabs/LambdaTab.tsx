"use client";

import React, { useMemo } from "react";
import { Download } from "lucide-react";
import { MathBlock } from "@/components/MathBlock";
import { PlotlyChart } from "@/components/PlotlyChart";
import { RangeSlider } from "@/components/RangeSlider";
import { EngineWaitingSkeleton } from "@/components/EngineWaitingSkeleton";
import { downloadCsv } from "@/lib/csv";
import type { VolumeSweepResult } from "@/lib/solver-client";

interface LambdaTabProps {
  v0: number;
  onChangeV0: (v: number) => void;
  sweep: VolumeSweepResult | null;
  loading: boolean;
}

export function LambdaTab({ v0, onChangeV0, sweep, loading }: LambdaTabProps) {
  const areaCurveData = useMemo(() => {
    if (!sweep) return [];
    return [
      {
        type: "scatter",
        mode: "lines",
        x: sweep.volumes,
        y: sweep.areas,
        line: { color: "#0f766e", width: 3 },
        name: "A_min(V₀) (cm²)",
      },
      {
        type: "scatter",
        mode: "markers",
        x: [sweep.v0],
        y: [sweep.area_min_at_v0],
        marker: { color: "#b91c1c", size: 11 },
        name: `Selected V₀ = ${sweep.v0} cm³`,
      },
    ];
  }, [sweep]);

  const slopeCurveData = useMemo(() => {
    if (!sweep) return [];
    return [
      {
        type: "scatter",
        mode: "lines",
        x: sweep.volumes,
        y: sweep.lambdas,
        line: { color: "#047857", width: 3 },
        name: "Lagrange Multiplier λ*(V₀) (1/cm)",
      },
      {
        type: "scatter",
        mode: "markers",
        x: sweep.volumes,
        y: sweep.numerical_slopes,
        marker: { color: "#b45309", size: 6, symbol: "circle-open" },
        name: "Numerical Slope dA_min/dV₀ (1/cm)",
      },
    ];
  }, [sweep]);

  const handleExportCsv = () => {
    if (!sweep) return;
    downloadCsv(
      `canoptimizer-lambda-sensitivity.csv`,
      ["Volume V0 (cm^3)", "A_min (cm^2)", "lambda* (1/cm)", "Numerical dA/dV0 (1/cm)"],
      sweep.volumes.map((v, i) => [
        v.toFixed(2),
        sweep.areas[i].toFixed(6),
        sweep.lambdas[i].toFixed(6),
        sweep.numerical_slopes[i].toFixed(6),
      ])
    );
  };

  if (!sweep) {
    return (
      <EngineWaitingSkeleton
        title={
          loading
            ? "Computing volume sensitivity sweep…"
            : "Waiting for the math engine…"
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Interpreting the Lagrange Multiplier <MathBlock latex="\lambda" display={false} />
            </h2>
            <p className="text-sm text-[#475569] mt-0.5">
              By the Envelope Theorem,{" "}
              <MathBlock latex="\lambda^* = \frac{d A_{\min}}{d V_0}" display={false} /> (units:{" "}
              <MathBlock latex="\text{cm}^2/\text{cm}^3 = 1/\text{cm}" display={false} />) measures
              how much minimum surface area grows per extra 1 cm³ (1 mL) of can volume.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Export Sweep CSV
          </button>
        </div>

        <RangeSlider
          id="lambda-v0-slider"
          label="Target Volume V₀"
          min={100}
          max={1000}
          step={5}
          value={Math.min(1000, Math.max(100, v0))}
          onChange={onChangeV0}
          unit="cm³"
          unitAria="cubic centimeters"
          optimumValue={355}
          optimumLabel="355 cm³ (default)"
          formatValue={(v) => String(Math.round(v))}
          formatEnd={(v) => `${v} cm³`}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-4">
            <div className="text-xs text-[#475569]">Minimum Area A_min(V₀)</div>
            <div className="text-lg font-semibold font-mono tabular-nums text-[#0f172a] mt-1">
              {sweep.area_min_at_v0.toFixed(4)} cm²
            </div>
          </div>
          <div className="rounded-lg bg-[#ecfdf5] border border-emerald-200 p-4">
            <div className="text-xs text-[#047857]">Analytical λ* (SymPy)</div>
            <div className="text-lg font-semibold font-mono tabular-nums text-[#0f172a] mt-1">
              {sweep.lambda_at_v0.toFixed(6)} 1/cm
            </div>
          </div>
          <div className="rounded-lg bg-[#fffbeb] border border-amber-200 p-4">
            <div className="text-xs text-[#b45309]">Numerical Slope dA/dV₀</div>
            <div className="text-lg font-semibold font-mono tabular-nums text-[#0f172a] mt-1">
              {sweep.numerical_slope_at_v0.toFixed(6)} 1/cm
            </div>
          </div>
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-4">
            <div className="text-xs text-[#475569]">Agreement |dA/dV₀ − λ*|</div>
            <div className="text-lg font-semibold font-mono tabular-nums text-[#0f172a] mt-1">
              {sweep.abs_error.toExponential(2)} 1/cm
            </div>
            <div className="text-xs text-[#475569]">
              Rel. error {(sweep.rel_error * 100).toExponential(2)}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PlotlyChart
          title="Minimum Surface Area A_min vs Volume V₀"
          subtitle="Minimum required aluminum grows sub-linearly with volume (A_min ∝ V₀^(2/3))."
          ariaLabel="Line chart plotting minimum surface area A_min in square centimeters against target volume V0 in cubic centimeters"
          takeaway="Larger cans use less aluminum per cm³ of drink because surface area grows slower than volume."
          data={areaCurveData}
          layout={{
            xaxis: { title: "Volume V₀ (cm³)" },
            yaxis: { title: "Minimum Area A_min (cm²)" },
            legend: { orientation: "h", y: -0.24 },
          }}
          filename="canoptimizer-area-vs-volume"
        />

        <PlotlyChart
          title="Lagrange Multiplier λ*(V₀) vs Numerical Slope dA_min/dV₀"
          subtitle="Amber circles (numerical slope) lie directly on top of the green SymPy λ* curve."
          ariaLabel="Comparison chart showing analytical Lagrange multiplier lambda matching numerical slope dA_min/dV0 across volumes"
          takeaway="Lambda is how much the minimum surface area grows per extra cm³ of volume."
          data={slopeCurveData}
          layout={{
            xaxis: { title: "Volume V₀ (cm³)" },
            yaxis: { title: "Marginal Area dA/dV₀ & λ* (1/cm)" },
            legend: { orientation: "h", y: -0.24 },
          }}
          filename="canoptimizer-lambda-vs-slope"
        />
      </div>
    </div>
  );
}
