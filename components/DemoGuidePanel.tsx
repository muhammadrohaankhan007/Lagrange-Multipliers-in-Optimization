"use client";

import React from "react";
import { ArrowRight, Presentation, X } from "lucide-react";

export type DemoTabId =
  | "problem"
  | "analytical"
  | "verification"
  | "visualizations"
  | "lambda"
  | "real-cans"
  | "weighted"
  | "shapes"
  | "tangency"
  | "can-3d";

interface DemoGuidePanelProps {
  activeTab: DemoTabId;
  onSelectTab: (tab: DemoTabId) => void;
  onClose: () => void;
}

const DEMO_STEPS: {
  step: number;
  time: string;
  title: string;
  tab: DemoTabId;
  script: string;
}[] = [
  {
    step: 1,
    time: "0:00–0:20",
    title: "Problem & Model",
    tab: "problem",
    script:
      "We want the cylinder radius r and height h that minimize metal surface area for a fixed 355 cm³ soda can using Lagrange multipliers.",
  },
  {
    step: 2,
    time: "0:20–0:40",
    title: "Analytical Solution (SymPy)",
    tab: "analytical",
    script:
      "SymPy runs live in the browser to compute gradients, eliminate lambda, and prove the optimal can has height equal to its diameter (h = 2r = d).",
  },
  {
    step: 3,
    time: "0:40–1:00",
    title: "Numerical Verification (SLSQP)",
    tab: "verification",
    script:
      "Independently, SciPy SLSQP solves the constrained problem from six very different starting guesses and agrees with SymPy well within tolerance.",
  },
  {
    step: 4,
    time: "1:00–1:20",
    title: "Visualizations",
    tab: "visualizations",
    script:
      "Visually, the red volume curve is tangent to the optimal surface-area contour, and the two gradient vectors point in the exact same direction (0° angle).",
  },
  {
    step: 5,
    time: "1:20–1:40",
    title: "Interpreting λ",
    tab: "lambda",
    script:
      "Sliding the volume confirms that lambda equals dA_min/dV0: adding one extra cubic centimeter of volume increases minimum metal area by about lambda cm².",
  },
  {
    step: 6,
    time: "1:40–2:00",
    title: "Real Cans Comparison",
    tab: "real-cans",
    script:
      "Real cans are taller than h = d and use roughly 15–22% more surface area due to thicker lids, domed bases, grip ergonomics, and cup-holder sizing.",
  },
];

const DEMO_EXTRAS: {
  label: string;
  tab: DemoTabId;
  script: string;
}[] = [
  {
    label: "Extra A: Shape Comparison",
    tab: "shapes",
    script:
      "Using Lagrange multipliers across multiple geometries confirms the sphere uses the least closed surface area, while practical packaging explains why cans are cylinders.",
  },
  {
    label: "Extra B: Tangency Demo",
    tab: "tangency",
    script:
      "Dragging along the constraint curve shows the angle between grad f and grad g dropping to zero precisely at the optimal point where the level curve is tangent.",
  },
  {
    label: "Extra C: 3D Can",
    tab: "can-3d",
    script:
      "In 3D, you can visually compare the solid can, the optimal wireframe, and a volume-scaled real beverage can side by side.",
  },
];

export function DemoGuidePanel({ activeTab, onSelectTab, onClose }: DemoGuidePanelProps) {
  return (
    <aside
      aria-label="2-Minute Presentation Demo Guide"
      className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 p-4 shadow-sm space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Presentation className="w-4 h-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <h2 className="text-sm font-bold text-amber-950 dark:text-amber-100">
            2-Minute Presentation Demo Flow
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close demo guide"
          className="p-1 rounded-md text-amber-800 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
        Click any step to jump straight to that tab, and read the suggested one-sentence talking
        point aloud.
      </p>

      <ol className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {DEMO_STEPS.map((item) => {
          const isCurrent = activeTab === item.tab;
          return (
            <li key={item.step}>
              <button
                type="button"
                onClick={() => onSelectTab(item.tab)}
                className={`w-full h-full text-left rounded-lg border p-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isCurrent
                    ? "border-indigo-500 bg-white dark:bg-slate-900 shadow-sm"
                    : "border-amber-200 dark:border-amber-900/70 bg-white/80 dark:bg-slate-900/70 hover:border-indigo-400"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    {item.step}. {item.title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    {item.time}
                  </span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
                  &ldquo;{item.script}&rdquo;
                </p>
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                  {isCurrent ? "Current tab" : "Open tab"}
                  <ArrowRight className="w-3 h-3" aria-hidden="true" />
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="pt-2 border-t border-amber-200 dark:border-amber-900/70 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
          Optional Extras (If Time Permits)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {DEMO_EXTRAS.map((extra) => {
            const isCurrent = activeTab === extra.tab;
            return (
              <button
                key={extra.tab}
                type="button"
                onClick={() => onSelectTab(extra.tab)}
                className={`w-full text-left rounded-lg border p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  isCurrent
                    ? "border-teal-600 bg-white dark:bg-slate-900 shadow-sm"
                    : "border-amber-200 dark:border-amber-900/70 bg-white/80 dark:bg-slate-900/70 hover:border-teal-500"
                }`}
              >
                <div className="text-xs font-bold text-teal-700 dark:text-teal-400">
                  {extra.label}
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                  &ldquo;{extra.script}&rdquo;
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
