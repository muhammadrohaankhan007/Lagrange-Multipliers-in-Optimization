"use client";

import React, { useMemo } from "react";
import { PlotlyChart } from "@/components/PlotlyChart";
import type { VisualizationData } from "@/lib/solver-client";

interface VisualizationsTabProps {
  viz: VisualizationData | null;
  loading: boolean;
}

export function VisualizationsTab({ viz, loading }: VisualizationsTabProps) {
  const contourData = useMemo(() => {
    if (!viz) return [];
    return [
      {
        type: "contour",
        x: viz.contour.r,
        y: viz.contour.h,
        z: viz.contour.z,
        colorscale: "Viridis",
        contours: { coloring: "lines", showlabels: true },
        line: { width: 1.4 },
        name: "f(r, h) Contours (cm²)",
        colorbar: { title: "Area (cm²)" },
      },
      {
        type: "scatter",
        mode: "lines",
        x: viz.contour.constraint_r,
        y: viz.contour.constraint_h,
        line: { color: "#ef4444", width: 3 },
        name: `Constraint g(r,h) = ${viz.v0} cm³`,
      },
      {
        type: "scatter",
        mode: "markers",
        x: [viz.optimum.r],
        y: [viz.optimum.h],
        marker: {
          color: "#f59e0b",
          size: 12,
          symbol: "star",
          line: { color: "#0f172a", width: 1.5 },
        },
        name: `Optimum (${viz.optimum.r.toFixed(2)} cm, ${viz.optimum.h.toFixed(2)} cm)`,
      },
    ];
  }, [viz]);

  const gradientPlot = useMemo(() => {
    if (!viz) return { data: [], layout: {} };
    const { r_opt, h_opt, grad_f, grad_g } = viz.gradients;

    const normF = Math.hypot(grad_f[0], grad_f[1]) || 1;
    const normG = Math.hypot(grad_g[0], grad_g[1]) || 1;
    const arrowLenF = 0.45 * r_opt;
    const arrowLenG = 0.72 * r_opt;

    const tipF = [
      r_opt + (grad_f[0] / normF) * arrowLenF,
      h_opt + (grad_f[1] / normF) * arrowLenF,
    ];
    const tipG = [
      r_opt + (grad_g[0] / normG) * arrowLenG,
      h_opt + (grad_g[1] / normG) * arrowLenG,
    ];

    const data: Record<string, unknown>[] = [
      {
        type: "contour",
        x: viz.contour.r,
        y: viz.contour.h,
        z: viz.contour.z,
        colorscale: "Blues",
        contours: { coloring: "lines", showlabels: false },
        showscale: false,
        opacity: 0.45,
        name: "Surface Area Level Curves",
      },
      {
        type: "scatter",
        mode: "lines",
        x: viz.contour.constraint_r,
        y: viz.contour.constraint_h,
        line: { color: "#ef4444", width: 2.5, dash: "dot" },
        name: `Constraint g = ${viz.v0} cm³`,
      },
      {
        type: "scatter",
        mode: "lines+markers",
        x: [r_opt, tipG[0]],
        y: [h_opt, tipG[1]],
        line: { color: "#10b981", width: 4 },
        marker: { size: [6, 10], symbol: ["circle", "triangle-up"] },
        name: `∇g = (${grad_g[0].toFixed(1)}, ${grad_g[1].toFixed(1)}) cm²`,
      },
      {
        type: "scatter",
        mode: "lines+markers",
        x: [r_opt, tipF[0]],
        y: [h_opt, tipF[1]],
        line: { color: "#6366f1", width: 4 },
        marker: { size: [8, 10], symbol: ["circle", "triangle-up"] },
        name: `∇f = (${grad_f[0].toFixed(1)}, ${grad_f[1].toFixed(1)}) cm`,
      },
    ];

    const span = Math.max(arrowLenG * 1.9, 1.5);
    const layout: Record<string, unknown> = {
      xaxis: { title: "Radius r (cm)", range: [Math.max(0.1, r_opt - span), r_opt + span] },
      yaxis: {
        title: "Height h (cm)",
        range: [Math.max(0.1, h_opt - span), h_opt + span],
        scaleanchor: "x",
        scaleratio: 1,
      },
      legend: { orientation: "h", y: -0.24 },
      annotations: [
        {
          x: tipF[0],
          y: tipF[1],
          ax: r_opt,
          ay: h_opt,
          xref: "x",
          yref: "y",
          axref: "x",
          ayref: "y",
          showarrow: true,
          arrowhead: 3,
          arrowsize: 1.2,
          arrowwidth: 2.5,
          arrowcolor: "#6366f1",
        },
        {
          x: tipG[0],
          y: tipG[1],
          ax: r_opt,
          ay: h_opt,
          xref: "x",
          yref: "y",
          axref: "x",
          ayref: "y",
          showarrow: true,
          arrowhead: 3,
          arrowsize: 1.2,
          arrowwidth: 2.5,
          arrowcolor: "#10b981",
        },
      ],
    };

    return { data, layout };
  }, [viz]);

  const oneVarData = useMemo(() => {
    if (!viz) return [];
    return [
      {
        type: "scatter",
        mode: "lines",
        x: viz.one_variable.r,
        y: viz.one_variable.area,
        line: { color: "#6366f1", width: 3 },
        name: "A(r) = 2πr² + 2V₀/r (cm²)",
      },
      {
        type: "scatter",
        mode: "markers+text",
        x: [viz.one_variable.r_opt],
        y: [viz.one_variable.area_min],
        text: [
          `Min (${viz.one_variable.r_opt.toFixed(2)} cm, ${viz.one_variable.area_min.toFixed(
            1
          )} cm²)`,
        ],
        textposition: "top center",
        marker: { color: "#ef4444", size: 11, symbol: "diamond" },
        name: "Global Minimum",
      },
    ];
  }, [viz]);

  const surface3dData = useMemo(() => {
    if (!viz) return [];
    return [
      {
        type: "surface",
        x: viz.surface_3d.r,
        y: viz.surface_3d.h,
        z: viz.surface_3d.z,
        colorscale: "Viridis",
        opacity: 0.82,
        showscale: false,
        name: "f(r, h) (cm²)",
      },
      {
        type: "scatter3d",
        mode: "lines",
        x: viz.surface_3d.constraint_r,
        y: viz.surface_3d.constraint_h,
        z: viz.surface_3d.constraint_area,
        line: { color: "#ef4444", width: 6 },
        name: `Constraint g = ${viz.v0} cm³`,
      },
      {
        type: "scatter3d",
        mode: "markers",
        x: [viz.optimum.r],
        y: [viz.optimum.h],
        z: [viz.optimum.area],
        marker: { color: "#f59e0b", size: 7, symbol: "diamond" },
        name: "Constrained Optimum",
      },
    ];
  }, [viz]);

  if (loading && !viz) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        Generating interactive Plotly visualization grids in Pyodide...
      </div>
    );
  }

  if (!viz) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PlotlyChart
          title="1. Contour Plot of f(r, h) & Constraint Tangency"
          subtitle={`Volume V₀ = ${viz.v0} cm³. Star marks (r*, h*) = (${viz.optimum.r.toFixed(
            2
          )} cm, ${viz.optimum.h.toFixed(2)} cm).`}
          ariaLabel="Contour plot of surface area f(r, h) with the fixed-volume constraint curve overlaid and optimum marked"
          takeaway="At the optimum, the red fixed-volume curve just touches (is tangent to) the lowest reachable surface-area contour."
          data={contourData}
          layout={{
            xaxis: { title: "Radius r (cm)" },
            yaxis: { title: "Height h (cm)" },
            legend: { orientation: "h", y: -0.24 },
          }}
          filename={`canoptimizer-contour-V${viz.v0}`}
        />

        <PlotlyChart
          title="2. Parallel Gradient Vectors ∇f and ∇g at Optimum"
          subtitle={`Angle between ∇f and ∇g = ${viz.gradients.angle_degrees.toFixed(
            6
          )}° (cos θ = ${viz.gradients.cosine_similarity.toFixed(
            6
          )}, λ* = ${viz.gradients.lambda.toFixed(4)} 1/cm).`}
          ariaLabel="Vector plot showing the gradient of surface area and gradient of volume pointing in the same direction at the optimum"
          takeaway="The gradients ∇f and ∇g point in the exact same direction (0° angle), confirming the Lagrange condition ∇f = λ∇g."
          data={gradientPlot.data}
          layout={gradientPlot.layout}
          filename={`canoptimizer-gradients-V${viz.v0}`}
        />

        <PlotlyChart
          title="3. Single-Variable Reduction A(r)"
          subtitle="Eliminating h = V₀/(πr²) gives a strictly convex 1D curve with a unique minimum."
          ariaLabel="Line plot of surface area A(r) versus radius r showing a unique global minimum"
          takeaway="Making the can either too skinny or too wide sharply increases total surface area; the unique minimum occurs where h = 2r."
          data={oneVarData}
          layout={{
            xaxis: { title: "Radius r (cm)" },
            yaxis: { title: "Surface Area A(r) (cm²)" },
            legend: { orientation: "h", y: -0.24 },
          }}
          filename={`canoptimizer-1d-area-V${viz.v0}`}
        />

        <PlotlyChart
          title="4. 3D Surface f(r, h) with Lifted Constraint Curve"
          subtitle="Drag to rotate. The red curve traces all feasible cylinders (πr²h = V₀) on the surface."
          ariaLabel="3D surface plot of surface area f(r, h) with the volume constraint curve lifted onto the surface"
          takeaway="Among all points on the red feasible curve lifted onto the surface f(r, h), the amber diamond sits at the lowest elevation."
          data={surface3dData}
          layout={{
            margin: { t: 10, r: 10, b: 10, l: 10 },
            scene: {
              xaxis: { title: "Radius r (cm)" },
              yaxis: { title: "Height h (cm)" },
              zaxis: { title: "Area f(r,h) (cm²)" },
            },
            legend: { orientation: "h", y: 0 },
          }}
          filename={`canoptimizer-3d-surface-V${viz.v0}`}
        />
      </div>
    </div>
  );
}
