"use client";

import React, { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { MathBlock } from "@/components/MathBlock";
import { PlotlyChart } from "@/components/PlotlyChart";
import { RangeSlider } from "@/components/RangeSlider";
import { EngineWaitingSkeleton } from "@/components/EngineWaitingSkeleton";
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
        line: { color: "#0f766e", width: 3 },
        name: "Optimal Height h*(k) (cm)",
      },
      {
        type: "scatter",
        mode: "lines",
        x: sweep.sweep.k,
        y: sweep.sweep.r_opt.map((r) => 2 * r),
        line: { color: "#047857", width: 3 },
        name: "Optimal Diameter d*(k) = 2r*(k) (cm)",
      },
      {
        type: "scatter",
        mode: "markers",
        x: [sweep.k, sweep.k],
        y: [sweep.current.h_opt, sweep.current.d_opt],
        marker: { color: "#b91c1c", size: 10 },
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

  if (!sweep) {
    return (
      <EngineWaitingSkeleton
        title={
          loading
            ? "Computing weighted cost sweep…"
            : "Waiting for the math engine…"
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Extension: Weighted Material Cost Model
            </h2>
            <button
              type="button"
              onClick={() => onChangeK(1.0)}
              className="inline-flex items-center gap-1 rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Reset k = 1.00
            </button>
          </div>
          <p className="text-sm text-[#334155]">
            In real beverage cans, the top lid and bottom base are thicker (and more costly per
            cm²) than the side wall. Introducing a relative cost weight{" "}
            <MathBlock latex="k \in [0.25, 4.0]" display={false} /> on the two circular ends gives:
          </p>
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-4">
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

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
              <div className="text-xs text-[#475569]">Radius r*(k)</div>
              <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
                {sweep.current.r_opt.toFixed(3)} cm
              </div>
            </div>
            <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
              <div className="text-xs text-[#475569]">Diameter d*(k)</div>
              <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
                {sweep.current.d_opt.toFixed(3)} cm
              </div>
            </div>
            <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
              <div className="text-xs text-[#475569]">Height h*(k)</div>
              <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
                {sweep.current.h_opt.toFixed(3)} cm
              </div>
            </div>
            <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
              <div className="text-xs text-[#475569]">Min Weighted Cost</div>
              <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
                {sweep.current.area_min.toFixed(2)} eq. cm²
              </div>
            </div>
          </div>
        </div>

        {/* Live Proportional Can Silhouette */}
        <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col items-center justify-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#475569] mb-4">
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
                fill="rgba(15, 118, 110, 0.14)"
                stroke="#0f766e"
                strokeWidth={2}
              />
              <ellipse
                cx={svgDims.w / 2}
                cy={0}
                rx={svgDims.w / 2}
                ry={Math.min(10, svgDims.w * 0.16)}
                fill="rgba(15, 118, 110, 0.28)"
                stroke="#0f766e"
                strokeWidth={2}
              />
              <ellipse
                cx={svgDims.w / 2}
                cy={svgDims.h}
                rx={svgDims.w / 2}
                ry={Math.min(10, svgDims.w * 0.16)}
                fill="rgba(15, 118, 110, 0.2)"
                stroke="#0f766e"
                strokeWidth={2}
              />
            </g>
          </svg>
          <div className="text-xs font-mono tabular-nums text-[#334155] mt-3 text-center">
            h* = {sweep.current.h_opt.toFixed(2)} cm · d* = {sweep.current.d_opt.toFixed(2)} cm
            <div className="text-xs text-[#475569] mt-1">
              Ratio h*/d* = {sweep.current.h_over_d_opt.toFixed(2)} (equals k)
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
