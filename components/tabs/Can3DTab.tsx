"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Lightbulb, Pause, Play, RotateCcw, Target } from "lucide-react";
import { RangeSlider } from "@/components/RangeSlider";
import { EngineWaitingSkeleton } from "@/components/EngineWaitingSkeleton";
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

  if (!solution) {
    return (
      <EngineWaitingSkeleton
        title={loading ? "Initializing 3D Can viewer…" : "Waiting for the math engine…"}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#0f172a]">
              3D Can Explorer Along the Volume Constraint (V₀ = {v0} cm³)
            </h2>
            <p className="text-sm text-[#475569] mt-0.5">
              Drag to orbit, scroll to zoom. Watch how changing radius{" "}
              <code className="font-mono">r</code> stretches or flattens the solid can compared to
              the SymPy optimal outline.
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
              onClick={() => setAutoRotate((prev) => !prev)}
              aria-pressed={autoRotate}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset view
            </button>
          </div>
        </div>

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
              className="block text-xs font-medium text-[#334155] mb-1"
            >
              Optional 3rd Can (from Real Cans table):
            </label>
            <select
              id="can3d-real-select"
              value={selectedCanId}
              onChange={(e) => setSelectedCanId(e.target.value)}
              className="w-full rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-2 text-xs text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]"
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
          <p className="text-xs text-[#334155] rounded-lg bg-[#f8fafc] border border-[#e2e8f0] px-3.5 py-2.5">
            <strong className="text-[#0f172a]">Scaling note:</strong> &ldquo;{scaledRealCan.name}
            &rdquo; is scaled to the exact same volume <strong>V₀ = {v0} cm³</strong> while keeping
            its height-to-diameter ratio (<strong>h/d = {scaledRealCan.hOverD.toFixed(2)}</strong>)
            → scaled r = {scaledRealCan.r.toFixed(2)} cm, h = {scaledRealCan.h.toFixed(2)} cm.
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-xs text-[#475569]">Current Radius r</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
              {clampedR.toFixed(3)} cm
            </div>
          </div>
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-xs text-[#475569]">Current Height h</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
              {currentH.toFixed(3)} cm
            </div>
          </div>
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-xs text-[#475569]">Current Surface Area</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#0f172a] mt-0.5">
              {currentArea.toFixed(2)} cm²
            </div>
          </div>
          <div className="rounded-lg bg-[#f8fafc] border border-[#e2e8f0] p-3">
            <div className="text-xs text-[#475569]">Excess Over Optimum</div>
            <div className="font-mono tabular-nums font-semibold text-sm text-[#b45309] mt-0.5">
              +{Math.max(0, percentExcess).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

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
        <figcaption className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 flex items-start gap-2 text-xs text-[#334155]">
          <Lightbulb className="w-3.5 h-3.5 text-[#b45309] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-[#0f172a]">Takeaway:</strong> Holding volume
            fixed forces any slimmer or wider cylinder to stretch dramatically in height or width,
            increasing surface area above the compact h = d optimal outline.
          </span>
        </figcaption>
      </figure>
    </div>
  );
}
