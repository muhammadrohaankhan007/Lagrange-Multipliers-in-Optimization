"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

export function AboutSection() {
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-label="About and how to use CanOptimizer"
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            About / How to Use CanOptimizer
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-500" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-3">
          <p>
            <strong>CanOptimizer</strong> solves the MTH-111 multivariable calculus soda-can
            problem live in your browser using Python (SymPy &amp; SciPy) compiled to WebAssembly
            via Pyodide. Changing the target volume <strong>V₀</strong> in the bar above updates
            every tab automatically.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <li>
              <strong>1. Problem &amp; Model:</strong> Sets the target volume V₀ (cm³) and shows
              the objective, constraint, and SymPy KPI summary.
            </li>
            <li>
              <strong>2. Analytical (SymPy):</strong> Displays all 7 symbolic Lagrange multiplier
              derivation steps rendered with KaTeX.
            </li>
            <li>
              <strong>3. Numerical (SLSQP):</strong> Independently verifies the optimum from 6
              starting guesses with configurable Pass/Fail tolerance.
            </li>
            <li>
              <strong>4. Visualizations:</strong> Interactive contour tangency, parallel gradients,
              1D A(r) curve, and 3D surface with PNG export.
            </li>
            <li>
              <strong>5. Interpreting λ:</strong> Compares the Lagrange multiplier λ* (1/cm)
              against the numerical derivative dA_min/dV₀ across volumes.
            </li>
            <li>
              <strong>6. Real Cans:</strong> Compares real beverage cans (stored in{" "}
              <code className="font-mono">localStorage</code>) against the ideal cylinder.
            </li>
            <li>
              <strong>7. Weighted Cost:</strong> Explores how thicker top/bottom ends (k &gt; 1)
              shift the optimal aspect ratio to h*/d* = k.
            </li>
            <li>
              <strong>8. Shape Comparison:</strong> Compares SymPy Lagrange optima across closed
              shapes (sphere, cylinder, 3D cube) and open-top shapes (cylinder, square-base box).
            </li>
            <li>
              <strong>9. Tangency Demo:</strong> Interactive 2D (r, h) plot where sliding or
              clicking along g = V₀ shows ∇f and ∇g aligning at the optimum.
            </li>
            <li>
              <strong>10. 3D Can:</strong> Interactive Three.js viewer comparing the current can,
              optimal wireframe, and a volume-scaled real can.
            </li>
            <li>
              <strong>Optional Hardware (</strong>
              <Link href="/hardware" className="underline text-indigo-600 dark:text-indigo-400">
                /hardware
              </Link>
              <strong>):</strong> Completely optional ESP32 USB Web Serial height station (with
              Simulation Mode for demos without hardware).
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
