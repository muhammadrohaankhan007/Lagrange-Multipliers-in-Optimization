"use client";

import React, { useMemo } from "react";
import { Download } from "lucide-react";
import { MathBlock } from "@/components/MathBlock";
import { PlotlyChart } from "@/components/PlotlyChart";
import { RangeSlider } from "@/components/RangeSlider";
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
        line: { color: "#6366f1", width: 3 },
        name: "A_min(V₀) (cm²)",
      },
      {
        type: "scatter",
        mode: "markers",
        x: [sweep.v0],
        y: [sweep.area_min_at_v0],
        marker: { color: "#ef4444", size: 11 },
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
        line: { color: "#10b981", width: 3 },
        name: "Lagrange Multiplier λ*(V₀) (1/cm)",
      },
      {
        type: "scatter",
        mode: "markers",
        x: sweep.volumes,
        y: sweep.numerical_slopes,
        marker: { color: "#f59e0b", size: 6, symbol: "circle-open" },
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

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Interpreting the Lagrange Multiplier <MathBlock latex="\lambda" display={false} />
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              By the Envelope Theorem,{" "}
              <MathBlock latex="\lambda^* = \frac{d A_{\min}}{d V_0}" display={false} /> (units:{" "}
              <MathBlock latex="\text{cm}^2/\text{cm}^3 = 1/\text{cm}" display={false} />) measures
              how much minimum surface area grows per extra 1 cm³ (1 mL) of can volume.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!sweep}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors disabled:opacity-50"
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

        {sweep && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Minimum Area A_min(V₀)
              </div>
              <div className="text-lg font-bold font-mono mt-1">
                {sweep.area_min_at_v0.toFixed(4)} cm²
              </div>
            </div>
            <div className="rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-4">
              <div className="text-xs text-emerald-800 dark:text-emerald-300">
                Analytical λ* (SymPy)
              </div>
              <div className="text-lg font-bold font-mono text-emerald-900 dark:text-emerald-100 mt-1">
                {sweep.lambda_at_v0.toFixed(6)} 1/cm
              </div>
            </div>
            <div className="rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4">
              <div className="text-xs text-amber-800 dark:text-amber-300">
                Numerical Slope dA/dV₀
              </div>
              <div className="text-lg font-bold font-mono text-amber-900 dark:text-amber-100 mt-1">
                {sweep.numerical_slope_at_v0.toFixed(6)} 1/cm
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Agreement |dA/dV₀ − λ*|
              </div>
              <div className="text-lg font-bold font-mono mt-1">
                {sweep.abs_error.toExponential(2)} 1/cm
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                Rel. error {(sweep.rel_error * 100).toExponential(2)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && !sweep ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
          Computing volume sensitivity sweep...
        </div>
      ) : sweep ? (
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
      ) : null}
    </div>
  );
}
