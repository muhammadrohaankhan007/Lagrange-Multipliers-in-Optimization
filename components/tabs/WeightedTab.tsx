"use client";

import React, { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { MathBlock } from "@/components/MathBlock";
import { PlotlyChart } from "@/components/PlotlyChart";
import { RangeSlider } from "@/components/RangeSlider";
import type { WeightSweepResult } from "@/lib/solver-client";

interface WeightedTabProps {
  v0: number;
  kWeight: number;
  onChangeK: (k: number) => void;
  sweep: WeightSweepResult | null;
  loading: boolean;
}

const K_MIN = 0.25;
const K_MAX = 4.0;

function clampK(val: number): number {
  if (!Number.isFinite(val)) return 1.0;
  return Math.min(K_MAX, Math.max(K_MIN, Number(val.toFixed(2))));
}

export function WeightedTab({ v0, kWeight, onChangeK, sweep, loading }: WeightedTabProps) {
  const safeK = clampK(kWeight);

  const sweepChartData = useMemo(() => {
    if (!sweep) return [];
    return [
      {
        type: "scatter",
        mode: "lines",
        x: sweep.sweep.k,
        y: sweep.sweep.h_opt,
        line: { color: "#6366f1", width: 3 },
        name: "Optimal Height h*(k) (cm)",
      },
      {
        type: "scatter",
        mode: "lines",
        x: sweep.sweep.k,
        y: sweep.sweep.r_opt.map((r) => 2 * r),
        line: { color: "#10b981", width: 3 },
        name: "Optimal Diameter d*(k) = 2r*(k) (cm)",
      },
      {
        type: "scatter",
        mode: "markers",
        x: [sweep.k, sweep.k],
        y: [sweep.current.h_opt, sweep.current.d_opt],
        marker: { color: "#ef4444", size: 10 },
        name: `Selected k = ${sweep.k.toFixed(2)}`,
      },
    ];
  }, [sweep]);

  const svgDims = useMemo(() => {
    if (!sweep) return { w: 80, h: 80 };
    const maxDim = Math.max(sweep.current.d_opt, sweep.current.h_opt, 1);
    const scale = 120 / maxDim;
    return {
      w: Math.max(24, sweep.current.d_opt * scale),
      h: Math.max(24, sweep.current.h_opt * scale),
    };
  }, [sweep]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Extension: Weighted Material Cost Model
            </h2>
            <button
              type="button"
              onClick={() => onChangeK(1.0)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Reset k = 1.00
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
            In real beverage cans, the top lid and bottom base are thicker (and more costly per
            cm²) than the side wall. Introducing a relative cost weight{" "}
            <MathBlock latex="k \in [0.25, 4.0]" display={false} /> on the two circular ends gives:
          </p>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4">
            <MathBlock
              latex={`f_k(r, h) = 2\\pi r h + k\\cdot 2\\pi r^2, \\qquad \\pi r^2 h = ${v0}\\text{ cm}^3`}
            />
          </div>

          <div className="pt-2">
            <RangeSlider
              id="k-weight-slider"
              label={
                <>
                  Top &amp; Bottom End Cost Multiplier <MathBlock latex="k" display={false} />
                </>
              }
              min={K_MIN}
              max={K_MAX}
              step={0.05}
              value={safeK}
              onChange={(next) => onChangeK(clampK(next))}
              unit="×"
              unitAria="times side wall cost"
              optimumValue={1.0}
              optimumLabel="equal cost (k=1)"
              badgeExtra={`· h*/d* = ${safeK.toFixed(2)}`}
              formatValue={(v) => v.toFixed(2)}
              minLabel="0.25× (squat)"
              maxLabel="4.00× (slim)"
            />
          </div>

          {sweep && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-[11px] text-slate-600 dark:text-slate-400">Radius r*(k)</div>
                <div className="font-mono font-bold text-sm mt-0.5">
                  {sweep.current.r_opt.toFixed(3)} cm
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Diameter d*(k)
                </div>
                <div className="font-mono font-bold text-sm mt-0.5">
                  {sweep.current.d_opt.toFixed(3)} cm
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-[11px] text-slate-600 dark:text-slate-400">Height h*(k)</div>
                <div className="font-mono font-bold text-sm mt-0.5">
                  {sweep.current.h_opt.toFixed(3)} cm
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
                <div className="text-[11px] text-slate-600 dark:text-slate-400">
                  Min Weighted Cost
                </div>
                <div className="font-mono font-bold text-sm mt-0.5">
                  {sweep.current.area_min.toFixed(2)} eq. cm²
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Proportional Can Silhouette */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col items-center justify-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-4">
            Proportional Can Shape (V₀ = {v0} cm³)
          </div>
          <svg
            width="180"
            height="170"
            viewBox="0 0 180 170"
            className="overflow-visible"
            role="img"
            aria-label={`Proportional cylinder diagram for k=${safeK.toFixed(2)}`}
          >
            <g transform={`translate(${90 - svgDims.w / 2}, ${85 - svgDims.h / 2})`}>
              <rect
                x={0}
                y={0}
                width={svgDims.w}
                height={svgDims.h}
                rx={4}
                className="fill-indigo-500/20 stroke-indigo-600 dark:stroke-indigo-400"
                strokeWidth={2}
              />
              <ellipse
                cx={svgDims.w / 2}
                cy={0}
                rx={svgDims.w / 2}
                ry={Math.min(10, svgDims.w * 0.16)}
                className="fill-indigo-500/35 stroke-indigo-600 dark:stroke-indigo-400"
                strokeWidth={2}
              />
              <ellipse
                cx={svgDims.w / 2}
                cy={svgDims.h}
                rx={svgDims.w / 2}
                ry={Math.min(10, svgDims.w * 0.16)}
                className="fill-indigo-500/25 stroke-indigo-600 dark:stroke-indigo-400"
                strokeWidth={2}
              />
            </g>
          </svg>
          {sweep && (
            <div className="text-xs font-mono text-slate-700 dark:text-slate-300 mt-3 text-center">
              h* = {sweep.current.h_opt.toFixed(2)} cm · d* = {sweep.current.d_opt.toFixed(2)} cm
              <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Ratio h*/d* = {sweep.current.h_over_d_opt.toFixed(2)} (equals k)
              </div>
            </div>
          )}
        </div>
      </div>

      {loading && !sweep ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
          Computing weighted cost sweep in Pyodide...
        </div>
      ) : sweep ? (
        <PlotlyChart
          title="How Optimal Height h*(k) and Diameter d*(k) Shift with End-Cost Weight k"
          subtitle="At k = 1, h* = d*. Increasing k penalizes circular end area, driving the can taller and narrower."
          ariaLabel="Line plot showing optimal can height h* and diameter d* in centimeters as a function of end-cost multiplier k"
          takeaway="Making the top and bottom ends k times more expensive than the side wall makes the optimal can taller and narrower with exact ratio h*/d* = k."
          data={sweepChartData}
          layout={{
            xaxis: { title: "End-Cost Weight k (dimensionless)" },
            yaxis: { title: "Optimal Dimension (cm)" },
            legend: { orientation: "h", y: -0.24 },
          }}
          filename={`canoptimizer-weighted-k-V${v0}`}
        />
      ) : null}
    </div>
  );
}
