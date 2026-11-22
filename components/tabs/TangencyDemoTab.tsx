"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Compass, RotateCcw, Target } from "lucide-react";
import { PlotlyChart } from "@/components/PlotlyChart";
import { RangeSlider } from "@/components/RangeSlider";
import { EngineWaitingSkeleton } from "@/components/EngineWaitingSkeleton";
import {
  ALIGNMENT_TOLERANCE_DEG,
  evaluateTangencyAtRadius,
  getConstraintRadiusLimits,
  heightOnConstraint,
  surfaceArea,
} from "@/lib/gradients";
import type { AnalyticalSolution } from "@/lib/solver-client";

interface TangencyDemoTabProps {
  v0: number;
  solution: AnalyticalSolution | null;
  loading: boolean;
}

export function TangencyDemoTab({ v0, solution, loading }: TangencyDemoTabProps) {
  const limits = useMemo(() => {
    const rOpt = solution?.r_opt ?? 3.837;
    return getConstraintRadiusLimits(rOpt);
  }, [solution?.r_opt]);

  const [radius, setRadius] = useState<number>(limits.defaultNonOptimal);

  useEffect(() => {
    setRadius(limits.defaultNonOptimal);
  }, [limits.defaultNonOptimal, v0]);

  const clampedR = Math.min(limits.max, Math.max(limits.min, radius));
  const metrics = useMemo(() => evaluateTangencyAtRadius(clampedR, v0), [clampedR, v0]);

  const plotModel = useMemo(() => {
    if (!solution) return { data: [], layout: {} };

    const rOpt = solution.r_opt;
    const hOpt = solution.h_opt;
    const rMinPlot = Math.max(0.25, 0.38 * rOpt);
    const rMaxPlot = 2.05 * rOpt;
    const hMinPlot = Math.max(0.25, 0.25 * hOpt);
    const hMaxPlot = 2.6 * hOpt;

    const n = 50;
    const rGrid: number[] = [];
    const hGrid: number[] = [];
    for (let i = 0; i < n; i++) {
      rGrid.push(rMinPlot + ((rMaxPlot - rMinPlot) * i) / (n - 1));
      hGrid.push(hMinPlot + ((hMaxPlot - hMinPlot) * i) / (n - 1));
    }
    const zGrid: number[][] = hGrid.map((hv) => rGrid.map((rv) => surfaceArea(rv, hv)));

    const cR: number[] = [];
    const cH: number[] = [];
    for (let i = 0; i < 180; i++) {
      const rv = rMinPlot + ((rMaxPlot - rMinPlot) * i) / 179;
      const hv = heightOnConstraint(rv, v0);
      if (hv >= hMinPlot && hv <= hMaxPlot) {
        cR.push(rv);
        cH.push(hv);
      }
    }

    const levelR: number[] = [];
    const levelH: number[] = [];
    for (let i = 0; i < 180; i++) {
      const rv = rMinPlot + ((rMaxPlot - rMinPlot) * i) / 179;
      const hv = (metrics.area - 2.0 * Math.PI * rv * rv) / (2.0 * Math.PI * rv);
      if (hv >= hMinPlot && hv <= hMaxPlot) {
        levelR.push(rv);
        levelH.push(hv);
      }
    }

    const slope = -metrics.gf.r / (metrics.gf.h || 1e-9);
    const dxSpan = 0.42 * rOpt;
    const tanR = [clampedR - dxSpan, clampedR + dxSpan];
    const tanH = [metrics.h - slope * dxSpan, metrics.h + slope * dxSpan];

    const arrowLen = 0.48 * rOpt;
    const tipF = {
      r: clampedR + (metrics.gf.r / (metrics.normF || 1)) * arrowLen,
      h: metrics.h + (metrics.gf.h / (metrics.normF || 1)) * arrowLen,
    };
    const tipG = {
      r: clampedR + (metrics.gg.r / (metrics.normG || 1)) * arrowLen,
      h: metrics.h + (metrics.gg.h / (metrics.normG || 1)) * arrowLen,
    };

    const data: Record<string, unknown>[] = [
      {
        type: "contour",
        x: rGrid,
        y: hGrid,
        z: zGrid,
        colorscale: "Greys",
        reversescale: true,
        contours: { coloring: "lines", showlabels: false },
        showscale: false,
        opacity: 0.45,
        hoverinfo: "skip",
        name: "f(r, h) Contours",
      },
      {
        type: "scatter",
        mode: "lines",
        x: cR,
        y: cH,
        line: { color: "#b91c1c", width: 3 },
        name: `Constraint g = ${v0} cm³`,
      },
      {
        type: "scatter",
        mode: "lines",
        x: levelR,
        y: levelH,
        line: { color: "#0284c7", width: 2.2, dash: "dash" },
        name: `Level curve f = ${metrics.area.toFixed(1)} cm²`,
      },
      {
        type: "scatter",
        mode: "lines",
        x: tanR,
        y: tanH,
        line: { color: "#b45309", width: 2, dash: "dot" },
        name: "Tangent to level curve",
      },
      {
        type: "scatter",
        mode: "markers",
        x: [rOpt],
        y: [hOpt],
        marker: {
          color: "#047857",
          size: 13,
          symbol: "star",
          line: { color: "#0f172a", width: 1.2 },
        },
        name: `SymPy Optimum (${rOpt.toFixed(2)}, ${hOpt.toFixed(2)})`,
      },
      {
        type: "scatter",
        mode: "markers",
        x: [clampedR],
        y: [metrics.h],
        marker: { color: "#0f766e", size: 11, line: { color: "#ffffff", width: 2 } },
        name: `Current point (${clampedR.toFixed(2)}, ${metrics.h.toFixed(2)})`,
      },
      {
        type: "scatter",
        mode: "lines",
        x: [clampedR, tipF.r],
        y: [metrics.h, tipF.h],
        line: { color: "#0f766e", width: 3.5 },
        name: "∇f direction (fixed length)",
      },
      {
        type: "scatter",
        mode: "lines",
        x: [clampedR, tipG.r],
        y: [metrics.h, tipG.h],
        line: { color: "#047857", width: 3.5 },
        name: "∇g direction (fixed length)",
      },
    ];

    const layout: Record<string, unknown> = {
      xaxis: { title: "Radius r (cm)", range: [rMinPlot, rMaxPlot] },
      yaxis: {
        title: "Height h (cm)",
        range: [hMinPlot, hMaxPlot],
        scaleanchor: "x",
        scaleratio: 1,
      },
      legend: { orientation: "h", y: -0.22 },
      annotations: [
        {
          x: tipF.r,
          y: tipF.h,
          ax: clampedR,
          ay: metrics.h,
          xref: "x",
          yref: "y",
          axref: "x",
          ayref: "y",
          showarrow: true,
          arrowhead: 3,
          arrowsize: 1.2,
          arrowwidth: 2.5,
          arrowcolor: "#0f766e",
        },
        {
          x: tipG.r,
          y: tipG.h,
          ax: clampedR,
          ay: metrics.h,
          xref: "x",
          yref: "y",
          axref: "x",
          ayref: "y",
          showarrow: true,
          arrowhead: 3,
          arrowsize: 1.2,
          arrowwidth: 2.5,
          arrowcolor: "#047857",
        },
      ],
    };

    return { data, layout };
  }, [solution, v0, clampedR, metrics]);

  const handlePlotClick = (pt: { x: number; y: number }) => {
    const nextR = Math.min(limits.max, Math.max(limits.min, pt.x));
    setRadius(Number(nextR.toFixed(3)));
  };

  if (!solution) {
    return (
      <EngineWaitingSkeleton
        title={loading ? "Initializing Tangency Demo…" : "Waiting for the math engine…"}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">
              Interactive Tangency &amp; Gradient Alignment Demo
            </h2>
            <p className="text-sm text-[#475569] mt-0.5">
              Move <code className="font-mono">r</code> along the constraint curve{" "}
              <code className="font-mono">h = V₀/(πr²)</code> using the slider or by clicking the
              curve. Arrows are drawn at fixed display length so their angle is easy to compare.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRadius(Number(solution.r_opt.toFixed(4)))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2 transition-colors"
            >
              <Target className="w-3.5 h-3.5" aria-hidden="true" />
              Jump to optimum
            </button>
            <button
              type="button"
              onClick={() => setRadius(limits.defaultNonOptimal)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset
            </button>
          </div>
        </div>

        {/* Alignment Status Banner */}
        <div
          role="status"
          aria-live="polite"
          className={`rounded-lg border px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-medium ${
            metrics.aligned
              ? "border-emerald-200 bg-[#ecfdf5] text-[#047857]"
              : "border-amber-200 bg-[#fffbeb] text-[#b45309]"
          }`}
        >
          <div className="flex items-center gap-2">
            {metrics.aligned ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <Compass className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>
              {metrics.aligned
                ? "Aligned: this is the optimum"
                : "Not aligned: area can still decrease along the constraint"}
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums">
            Alignment tolerance: angle ≤ {ALIGNMENT_TOLERANCE_DEG.toFixed(1)}°
          </span>
        </div>

        <RangeSlider
          id="tangency-r-slider"
          label="Radius r along constraint curve"
          min={limits.min}
          max={limits.max}
          step={limits.step}
          value={clampedR}
          onChange={setRadius}
          unit="cm"
          unitAria="centimeters"
          optimumValue={solution.r_opt}
          optimumLabel="optimum"
          badgeExtra={`· h = ${metrics.h.toFixed(2)} cm`}
          formatValue={(v) => v.toFixed(2)}
          formatEnd={(v) => `${v.toFixed(2)} cm`}
        />

        {/* Live Metrics Readout */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-xs text-[#475569]">Point (r, h)</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
              ({clampedR.toFixed(3)} cm, {metrics.h.toFixed(3)} cm)
            </div>
          </div>
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-xs text-[#475569]">Surface Area f(r, h)</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
              {metrics.area.toFixed(3)} cm²
            </div>
          </div>
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-xs text-[#475569]">Angle ∠ (∇f, ∇g)</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
              {metrics.angleDeg.toFixed(3)}°
            </div>
          </div>
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-xs text-[#475569]">2D Cross Product ∇f × ∇g</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
              {metrics.cross2D.toFixed(2)} cm³
            </div>
          </div>
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-xs text-[#475569]">True Magnitude |∇f|</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
              {metrics.normF.toFixed(3)} cm
            </div>
          </div>
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-xs text-[#475569]">True Magnitude |∇g|</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
              {metrics.normG.toFixed(3)} cm²
            </div>
          </div>
          <div className="col-span-2 rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-xs text-[#475569]">
              |∇f| / |∇g| — λ estimate (meaningful when the gradients are parallel)
            </div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
              {metrics.lambdaEstimate.toFixed(5)} 1/cm{" "}
              <span className="font-normal text-xs text-[#475569]">
                (SymPy λ* = {solution.lambda_opt.toFixed(5)} 1/cm)
              </span>
            </div>
          </div>
        </div>
      </div>

      <PlotlyChart
        title="Lagrange Tangency Condition in the (r, h) Plane"
        subtitle="Click anywhere on the plot to move r along the red constraint curve. Both gradient arrows use a fixed display length."
        ariaLabel="Interactive 2D plot in the r-h plane showing surface area contours, fixed-volume constraint curve, level curve through the selected point, tangent line, and gradient vectors grad f and grad g"
        takeaway="At the optimum the two gradients point along the same line, which means the constraint curve is tangent to a level curve of the area."
        data={plotModel.data}
        layout={plotModel.layout}
        height={500}
        filename={`canoptimizer-tangency-V${v0}`}
        onPointClick={handlePlotClick}
      />
    </div>
  );
}
