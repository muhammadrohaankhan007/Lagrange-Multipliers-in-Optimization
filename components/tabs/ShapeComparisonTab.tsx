"use client";

import React, { useMemo, useState } from "react";
import { Download, Info } from "lucide-react";
import { MathBlock } from "@/components/MathBlock";
import { PlotlyChart } from "@/components/PlotlyChart";
import { downloadCsv } from "@/lib/csv";
import type { ShapeComparisonEntry, ShapeComparisonResult } from "@/lib/solver-client";

interface ShapeComparisonTabProps {
  comparison: ShapeComparisonResult | null;
  loading: boolean;
}

const SPHERE_DISCUSSION_HYPOTHESES = [
  {
    title: "1. Stacking & shelf packing",
    body: "Hypothesis: Spheres leave large empty voids (~26% even in densest close-packing) and cannot stack vertically in vending machines, cartons, or store shelves without extra cradles.",
  },
  {
    title: "2. Rolling & stability",
    body: "Hypothesis: A spherical container has no flat base, so it rolls off tables and conveyor belts unless flattened or fitted with a separate stand.",
  },
  {
    title: "3. Grip & drinking ergonomics",
    body: "Hypothesis: A 355 cm³ sphere has a diameter of ~8.78 cm, which is awkward to grip with one hand and harder to sip from cleanly compared to a narrow cylinder.",
  },
  {
    title: "4. Drawn-metal manufacturing",
    body: "Hypothesis: Aluminum beverage cans are stamped and drawn-and-ironed in high-speed cylindrical dies (thousands per minute); forming a seamless hollow sphere is far more complex and costly.",
  },
  {
    title: "5. Sealing & double-seaming",
    body: "Hypothesis: Cylinders provide a uniform circular rim where a pull-tab lid can be mechanically double-seamed to hold carbonated pressure reliably.",
  },
  {
    title: "6. Surface printing & labelling",
    body: "Hypothesis: A cylindrical side wall unrolls into a flat rectangle (zero Gaussian curvature), making high-speed rotary printing and bar-code scanning straightforward, unlike a doubly curved sphere.",
  },
];

export function ShapeComparisonTab({ comparison, loading }: ShapeComparisonTabProps) {
  const allShapes: ShapeComparisonEntry[] = useMemo(() => {
    if (!comparison) return [];
    return [...comparison.closed, ...comparison.open_top];
  }, [comparison]);

  const [selectedShapeId, setSelectedShapeId] = useState<string>("closed_box");

  const activeShape = useMemo(() => {
    return allShapes.find((s) => s.id === selectedShapeId) ?? allShapes[0] ?? null;
  }, [allShapes, selectedShapeId]);

  const barChartData = useMemo(() => {
    if (!comparison) return [];
    return [
      {
        type: "bar",
        name: "Closed Shapes (cm²)",
        x: comparison.closed.map((s) => s.name),
        y: comparison.closed.map((s) => Number(s.area_min.toFixed(2))),
        marker: { color: "#0f766e" },
      },
      {
        type: "bar",
        name: "Open-Top Shapes (cm²)",
        x: comparison.open_top.map((s) => s.name),
        y: comparison.open_top.map((s) => Number(s.area_min.toFixed(2))),
        marker: { color: "#64748b" },
      },
    ];
  }, [comparison]);

  const handleExportCsv = () => {
    if (!comparison) return;
    downloadCsv(
      `canoptimizer-shape-comparison-V${comparison.v0}.csv`,
      [
        "Group",
        "Shape",
        "Volume V0 (cm^3)",
        "Optimal Dimensions",
        "Minimum Area (cm^2)",
        "Area / Sphere Area (Closed Only)",
        "Optimal Dimension Ratios",
        "lambda* (1/cm)",
      ],
      [
        ...comparison.closed.map((s) => [
          "Closed",
          s.name,
          comparison.v0,
          s.dimensions_summary,
          s.area_min.toFixed(4),
          s.ratio_to_sphere !== null ? s.ratio_to_sphere.toFixed(4) : "N/A",
          s.optimal_ratios,
          s.lambda_opt !== null ? s.lambda_opt.toFixed(6) : "N/A",
        ]),
        ...comparison.open_top.map((s) => [
          "Open-Top",
          s.name,
          comparison.v0,
          s.dimensions_summary,
          s.area_min.toFixed(4),
          "N/A (open-top not ranked against closed)",
          s.optimal_ratios,
          s.lambda_opt !== null ? s.lambda_opt.toFixed(6) : "N/A",
        ]),
      ]
    );
  };

  if (loading && !comparison) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        Solving Lagrange systems for all shapes in Pyodide (SymPy)...
      </div>
    );
  }

  if (!comparison) return null;

  return (
    <div className="space-y-6">
      {/* Header + Fairness Notice */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Shape Comparison at Fixed Volume V₀ = {comparison.v0} cm³
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Each shape is optimized live with SymPy using Lagrange multipliers (∇f = λ∇g,
              g = V₀), except the sphere where V₀ fixes r directly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Export CSV
          </button>
        </div>

        <div className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
          <Info className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Fair comparison rule:</strong> Closed shapes (fully sealed containers) and
            open-top shapes (missing a lid) solve different optimization problems. They are grouped
            separately below and <strong>never ranked against each other</strong>.
          </p>
        </div>
      </div>

      {/* Group 1: Closed Shapes Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Group 1: Closed Shapes (Ranked Against Sphere Baseline)
          </h3>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            V₀ = {comparison.v0} cm³
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Shape</th>
                <th className="px-4 py-3 font-semibold font-mono">Optimal Dimensions (cm)</th>
                <th className="px-4 py-3 font-semibold font-mono">Minimum Area (cm²)</th>
                <th className="px-4 py-3 font-semibold font-mono">Area / Sphere</th>
                <th className="px-4 py-3 font-semibold">Derived Optimal Ratios</th>
                <th className="px-4 py-3 font-semibold font-mono">λ* (1/cm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {comparison.closed.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {s.name}
                  </td>
                  <td className="px-4 py-3 font-mono">{s.dimensions_summary}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-teal-700 dark:text-teal-400">
                    {s.area_min.toFixed(4)} cm²
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {s.ratio_to_sphere !== null ? `${s.ratio_to_sphere.toFixed(4)}×` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {s.optimal_ratios}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                    {s.lambda_opt !== null ? s.lambda_opt.toFixed(5) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Group 2: Open-Top Shapes Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Group 2: Open-Top Shapes (Separate Problem — Not Ranked Against Closed Shapes)
          </h3>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            V₀ = {comparison.v0} cm³
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 font-semibold">Shape</th>
                <th className="px-4 py-3 font-semibold font-mono">Optimal Dimensions (cm)</th>
                <th className="px-4 py-3 font-semibold font-mono">Minimum Area (cm²)</th>
                <th className="px-4 py-3 font-semibold">Derived Optimal Ratios</th>
                <th className="px-4 py-3 font-semibold font-mono">λ* (1/cm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {comparison.open_top.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                    {s.name}
                  </td>
                  <td className="px-4 py-3 font-mono">{s.dimensions_summary}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {s.area_min.toFixed(4)} cm²
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                    {s.optimal_ratios}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                    {s.lambda_opt !== null ? s.lambda_opt.toFixed(5) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bar Chart + "Why aren't cans spheres?" Discussion */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <PlotlyChart
            title="Minimum Surface Area by Shape (Grouped: Closed vs Open-Top)"
            subtitle={`At V₀ = ${comparison.v0} cm³, closed and open-top groups are shown in separate colors and should only be compared within their own group.`}
            ariaLabel="Bar chart comparing minimum surface area in square centimeters across closed shapes and open-top shapes"
            takeaway="Among closed containers of equal volume, the sphere uses the least surface area (~14.5% less than the optimal cylinder and ~24.1% less than a cube)."
            data={barChartData}
            layout={{
              barmode: "group",
              xaxis: { title: "Container Shape" },
              yaxis: { title: "Minimum Surface Area (cm²)" },
              legend: { orientation: "h", y: -0.24 },
            }}
            filename={`canoptimizer-shape-comparison-V${comparison.v0}`}
          />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Why Aren&apos;t Cans Spheres?
            </h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Discussion · Hypotheses
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            By the classical isoperimetric inequality, the sphere achieves the smallest surface
            area for a given volume among all closed 3D shapes (confirmed numerically above). The
            practical reasons beverage cans are cylinders instead are engineering{" "}
            <strong>hypotheses</strong> to discuss:
          </p>
          <div className="space-y-2">
            {SPHERE_DISCUSSION_HYPOTHESES.map((item) => (
              <div
                key={item.title}
                className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5"
              >
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {item.title}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step-by-Step Symbolic Derivation Selector */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Step-by-Step Lagrange Derivation by Shape (SymPy)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Select any shape to inspect its plain-language SymPy derivation.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Select shape derivation">
            {allShapes.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedShapeId(s.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 transition-colors ${
                  activeShape?.id === s.id
                    ? "bg-teal-700 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {activeShape && (
          <div className="space-y-3">
            {activeShape.steps.map((step) => (
              <div
                key={step.step_number}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {step.step_number}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {step.title}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      {step.explanation}
                    </p>
                    <div className="rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2.5">
                      <MathBlock latex={step.latex} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
