"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

export function AboutSection() {
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-label="About and how to use CanOptimizer"
      className="rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden"
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f766e] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-[#0f766e] shrink-0" aria-hidden="true" />
          <span className="text-sm font-semibold text-[#0f172a]">
            About / How to Use CanOptimizer
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[#475569]" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#475569]" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-3 border-t border-[#e2e8f0] text-sm text-[#334155] space-y-3">
          <p>
            <strong>CanOptimizer</strong> solves the MTH-111 multivariable calculus soda-can
            problem live in your browser using Python (SymPy &amp; SciPy) compiled to WebAssembly
            via Pyodide. Changing the target volume <strong>V₀</strong> in the bar above updates
            every tab automatically.
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs text-[#334155]">
            <li>
              <strong className="text-[#0f172a]">1. Problem &amp; Model:</strong> Sets the target
              volume V₀ (cm³) and shows the objective, constraint, and SymPy KPI summary.
            </li>
            <li>
              <strong className="text-[#0f172a]">2. Analytical (SymPy):</strong> Displays all 7
              symbolic Lagrange multiplier derivation steps rendered with KaTeX.
            </li>
            <li>
              <strong className="text-[#0f172a]">3. Numerical (SLSQP):</strong> Independently
              verifies the optimum from 6 starting guesses with configurable Pass/Fail tolerance.
            </li>
            <li>
              <strong className="text-[#0f172a]">4. Visualizations:</strong> Interactive contour
              tangency, parallel gradients, 1D A(r) curve, and 3D surface with PNG export.
            </li>
            <li>
              <strong className="text-[#0f172a]">5. Interpreting λ:</strong> Compares the Lagrange
              multiplier λ* (1/cm) against the numerical derivative dA_min/dV₀ across volumes.
            </li>
            <li>
              <strong className="text-[#0f172a]">6. Real Cans:</strong> Compares real beverage cans
              (stored in <code className="font-mono">localStorage</code>) against shape-only and
              stated-volume optima.
            </li>
            <li>
              <strong className="text-[#0f172a]">7. Weighted Cost:</strong> Explores how thicker
              top/bottom ends (k &gt; 1) shift the optimal aspect ratio to h*/d* = k.
            </li>
            <li>
              <strong className="text-[#0f172a]">8. Shape Comparison:</strong> Compares SymPy
              Lagrange optima across closed shapes (sphere, cylinder, 3D cube) and open-top shapes.
            </li>
            <li>
              <strong className="text-[#0f172a]">9. Tangency Demo:</strong> Interactive 2D (r, h)
              plot where sliding or clicking along g = V₀ shows ∇f and ∇g aligning at the optimum.
            </li>
            <li>
              <strong className="text-[#0f172a]">10. 3D Can:</strong> Interactive Three.js viewer
              comparing the current can, optimal outline, and a volume-scaled real can.
            </li>
            <li className="md:col-span-2">
              <strong className="text-[#0f172a]">Optional Hardware (</strong>
              <Link href="/hardware" className="underline text-[#0f766e] hover:text-[#115e59]">
                /hardware
              </Link>
              <strong className="text-[#0f172a]">):</strong> Completely optional ESP32 USB Web
              Serial height station (with Simulation Mode for demos without hardware).
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}
