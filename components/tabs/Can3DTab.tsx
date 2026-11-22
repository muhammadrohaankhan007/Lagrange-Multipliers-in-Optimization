"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Lightbulb, Pause, Play, RotateCcw, Target } from "lucide-react";
import { RangeSlider } from "@/components/RangeSlider";
import {
  getConstraintRadiusLimits,
  heightOnConstraint,
  surfaceArea,
} from "@/lib/gradients";
import type { AnalyticalSolution, RealCanAnalysis } from "@/lib/solver-client";
import Can3DScene, { type ScaledRealCan3D } from "./Can3DScene";

interface Can3DTabProps {
  v0: number;
  solution: AnalyticalSolution | null;
  realCans: RealCanAnalysis[];
  loading: boolean;
}

export function Can3DTab({ v0, solution, realCans, loading }: Can3DTabProps) {
  const limits = useMemo(() => {
    const rOpt = solution?.r_opt ?? 3.837;
    return getConstraintRadiusLimits(rOpt);
  }, [solution?.r_opt]);

  const [radius, setRadius] = useState<number>(limits.defaultNonOptimal);
  const [selectedCanId, setSelectedCanId] = useState<string>("");
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [resetCounter, setResetCounter] = useState<number>(0);

  // Respect prefers-reduced-motion: default autoRotate OFF if reduced motion is requested
  useEffect(() => {
    if (typeof window !== "undefined") {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setAutoRotate(!reduced);
    }
  }, []);

  useEffect(() => {
    setRadius(limits.defaultNonOptimal);
  }, [limits.defaultNonOptimal, v0]);

  const clampedR = Math.min(limits.max, Math.max(limits.min, radius));
  const currentH = heightOnConstraint(clampedR, v0);
  const currentArea = surfaceArea(clampedR, currentH);
  const percentExcess = solution
    ? ((currentArea - solution.area_min) / solution.area_min) * 100.0
    : 0;

  // Optional 3rd can from Real Cans table, scaled to V0 while preserving h/d ratio
  const scaledRealCan: ScaledRealCan3D | null = useMemo(() => {
    if (!selectedCanId) return null;
    const found = realCans.find((c) => c.id === selectedCanId);
    if (!found) return null;
    const rho = found.h_over_d;
    const rScaled = Math.cbrt(v0 / (2.0 * Math.PI * rho));
    const hScaled = 2.0 * rho * rScaled;
    return {
      name: found.name,
      r: rScaled,
      h: hScaled,
      hOverD: rho,
    };
  }, [selectedCanId, realCans, v0]);

  if (loading && !solution) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        Waiting for SymPy optimum before initializing 3D Can viewer...
      </div>
    );
  }

  if (!solution) return null;

  return (
    <div className="space-y-5">
      {/* Controls & Live Readout */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              3D Can Explorer Along the Volume Constraint (V₀ = {v0} cm³)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Drag to orbit, scroll to zoom. Watch how changing radius{" "}
              <code className="font-mono">r</code> stretches or flattens the solid can compared to
              the SymPy optimal outline.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRadius(Number(solution.r_opt.toFixed(4)))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors"
            >
              <Target className="w-3.5 h-3.5" aria-hidden="true" />
              Jump to optimum
            </button>
            <button
              type="button"
              onClick={() => setAutoRotate((prev) => !prev)}
              aria-pressed={autoRotate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors"
            >
              {autoRotate ? (
                <>
                  <Pause className="w-3.5 h-3.5" aria-hidden="true" />
                  Auto-rotate: On
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" aria-hidden="true" />
                  Auto-rotate: Off
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setResetCounter((c) => c + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset view
            </button>
          </div>
        </div>

        {/* Shared RangeSlider & Optional Real Can Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-end">
          <div className="lg:col-span-2">
            <RangeSlider
              id="can3d-r-slider"
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
              badgeExtra={`· h = ${currentH.toFixed(2)} cm`}
              formatValue={(v) => v.toFixed(2)}
              formatEnd={(v) => `${v.toFixed(2)} cm`}
            />
          </div>

          <div>
            <label
              htmlFor="can3d-real-select"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Optional 3rd Can (from Real Cans table):
            </label>
            <select
              id="can3d-real-select"
              value={selectedCanId}
              onChange={(e) => setSelectedCanId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <option value="">None (show Current + Optimal only)</option>
              {realCans.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (h/d = {c.h_over_d.toFixed(2)})
                </option>
              ))}
            </select>
          </div>
        </div>

        {scaledRealCan && (
          <p className="text-xs text-slate-600 dark:text-slate-400 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2">
            <strong>Scaling note:</strong> &ldquo;{scaledRealCan.name}&rdquo; is scaled to the
            exact same volume <strong>V₀ = {v0} cm³</strong> while keeping its height-to-diameter
            ratio (<strong>h/d = {scaledRealCan.hOverD.toFixed(2)}</strong>) → scaled r ={" "}
            {scaledRealCan.r.toFixed(2)} cm, h = {scaledRealCan.h.toFixed(2)} cm.
          </p>
        )}

        {/* Live KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-[11px] text-slate-600 dark:text-slate-400">Current Radius r</div>
            <div className="font-mono font-bold text-sm mt-0.5">{clampedR.toFixed(3)} cm</div>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-[11px] text-slate-600 dark:text-slate-400">Current Height h</div>
            <div className="font-mono font-bold text-sm mt-0.5">{currentH.toFixed(3)} cm</div>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              Current Surface Area
            </div>
            <div className="font-mono font-bold text-sm mt-0.5">{currentArea.toFixed(2)} cm²</div>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3">
            <div className="text-[11px] text-slate-600 dark:text-slate-400">
              Excess Over Optimum
            </div>
            <div className="font-mono font-bold text-sm mt-0.5 text-amber-700 dark:text-amber-400">
              +{Math.max(0, percentExcess).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* 3D Viewport + Takeaway */}
      <figure className="space-y-2">
        <Can3DScene
          targetR={clampedR}
          minR={limits.min}
          maxR={limits.max}
          optR={solution.r_opt}
          optH={solution.h_opt}
          realCan={scaledRealCan}
          autoRotate={autoRotate}
          resetCounter={resetCounter}
          v0={v0}
        />
        <figcaption className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 px-4 py-2.5 flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              Takeaway:
            </strong>{" "}
            Holding volume fixed forces any slimmer or wider cylinder to stretch dramatically in
            height or width, increasing surface area above the compact h = d optimal outline.
          </span>
        </figcaption>
      </figure>
    </div>
  );
}
