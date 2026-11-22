"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { PlotlyChart } from "@/components/PlotlyChart";
import { downloadCsv } from "@/lib/csv";
import type { RealCanAnalysis, RealCanInput } from "@/lib/solver-client";

interface RealCansTabProps {
  cans: RealCanAnalysis[];
  onAddCan: (can: Omit<RealCanInput, "id">) => void;
  onEditCan: (can: RealCanInput) => void;
  onDeleteCan: (id: string) => void;
  onResetDefaults: () => void;
  loading: boolean;
}

const HYPOTHESES = [
  {
    title: "1. Neck taper & smaller lid",
    body: "Hypothesis: Real aluminum cans taper inward at the top so the thicker, more expensive lid (with pull-tab and double seam) uses a smaller diameter than the main body.",
  },
  {
    title: "2. Domed bottom for internal pressure",
    body: "Hypothesis: Carbonated drinks generate 2–4 atm of internal pressure; a concave spherical dome at the base resists buckling better than a flat disc without needing much thicker metal.",
  },
  {
    title: "3. Thicker top & bottom ends (k > 1)",
    body: "Hypothesis: The top lid and seamed rim are roughly 2×–3× thicker than the drawn-and-ironed side wall. As shown in the Weighted Cost tab, k > 1 shifts the optimum toward taller, slimmer cans (h/d = k).",
  },
  {
    title: "4. Ergonomics & single-hand grip",
    body: "Hypothesis: An optimal 355 cm³ cylinder has diameter d* ≈ 7.67 cm and height h* ≈ 7.67 cm, which feels squat and slightly awkward to hold in one hand compared to a ~6.6 cm diameter can.",
  },
  {
    title: "5. Vending, cup-holders & shelf stacking",
    body: "Hypothesis: Standardized diameters (~6.6 cm) fit car cup-holders, vending chutes, and multi-pack tooling; taller profiles also offer larger front-facing billboard area for branding.",
  },
];

function computeVolumeMismatchPct(diameterCm: number, heightCm: number, statedVol: number): number {
  const geomVol = (Math.PI * diameterCm * diameterCm * heightCm) / 4.0;
  return Math.abs(geomVol - statedVol) / statedVol;
}

export function RealCansTab({
  cans,
  onAddCan,
  onEditCan,
  onDeleteCan,
  onResetDefaults,
  loading,
}: RealCansTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [diameter, setDiameter] = useState("6.62");
  const [height, setHeight] = useState("12.27");
  const [volume, setVolume] = useState("355");
  const [formError, setFormError] = useState<string | null>(null);
  const [includeExamplesInExport, setIncludeExamplesInExport] = useState(false);

  const parsedD = parseFloat(diameter);
  const parsedH = parseFloat(height);
  const parsedV = parseFloat(volume);
  const formGeomVol =
    Number.isFinite(parsedD) && parsedD > 0 && Number.isFinite(parsedH) && parsedH > 0
      ? (Math.PI * parsedD * parsedD * parsedH) / 4.0
      : null;
  const formMismatchWarning =
    formGeomVol !== null &&
    Number.isFinite(parsedV) &&
    parsedV > 0 &&
    Math.abs(formGeomVol - parsedV) / parsedV > 0.1
      ? `Warning: Cylinder volume πd²h/4 = ${formGeomVol.toFixed(
          1
        )} cm³ differs from stated volume ${parsedV} cm³ by ${(
          (Math.abs(formGeomVol - parsedV) / parsedV) *
          100
        ).toFixed(1)}% (>10%). Check for a typo or wrong units (mm vs cm); real cans also include headspace and a domed base.`
      : null;

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDiameter("6.62");
    setHeight("12.27");
    setVolume("355");
    setFormError(null);
  };

  const handleStartEdit = (can: RealCanAnalysis) => {
    setEditingId(can.id);
    setName(can.name);
    setDiameter(String(can.diameter_cm));
    setHeight(String(can.height_cm));
    setVolume(String(can.stated_volume_ml));
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const d = parseFloat(diameter);
    const h = parseFloat(height);
    const v = parseFloat(volume);

    if (!trimmed) {
      setFormError("Please enter a can name.");
      return;
    }
    if (!Number.isFinite(d) || d < 0.5 || d > 100) {
      setFormError("Diameter must be a number between 0.5 and 100 cm.");
      return;
    }
    if (!Number.isFinite(h) || h < 0.5 || h > 200) {
      setFormError("Height must be a number between 0.5 and 200 cm.");
      return;
    }
    if (!Number.isFinite(v) || v < 1 || v > 100000) {
      setFormError("Stated volume must be a number between 1 and 100,000 cm³ (mL).");
      return;
    }

    setFormError(null);
    if (editingId) {
      onEditCan({
        id: editingId,
        name: trimmed,
        diameter_cm: d,
        height_cm: h,
        stated_volume_ml: v,
        isExample: false,
      });
      resetForm();
    } else {
      onAddCan({
        name: trimmed,
        diameter_cm: d,
        height_cm: h,
        stated_volume_ml: v,
        isExample: false,
      });
      setName("");
    }
  };

  const exportableCans = useMemo(
    () => (includeExamplesInExport ? cans : cans.filter((c) => !c.isExample)),
    [cans, includeExamplesInExport]
  );

  const barChartData = useMemo(() => {
    return [
      {
        type: "bar",
        name: "Actual Can Area (cm²)",
        x: cans.map((c) => (c.isExample ? `${c.name} (Ex.)` : c.name)),
        y: cans.map((c) => Number(c.actual_area_cm2.toFixed(2))),
        marker: { color: "#6366f1" },
      },
      {
        type: "bar",
        name: "Shape-Only Optimum (Geom. V, cm²)",
        x: cans.map((c) => (c.isExample ? `${c.name} (Ex.)` : c.name)),
        y: cans.map((c) => Number(c.optimal_area_geom_cm2.toFixed(2))),
        marker: { color: "#0ea5e9" },
      },
      {
        type: "bar",
        name: "Stated-Volume Optimum (cm²)",
        x: cans.map((c) => (c.isExample ? `${c.name} (Ex.)` : c.name)),
        y: cans.map((c) => Number(c.optimal_area_cm2.toFixed(2))),
        marker: { color: "#10b981" },
      },
    ];
  }, [cans]);

  const handleExportCsv = () => {
    if (exportableCans.length === 0) return;
    downloadCsv(
      "canoptimizer-real-cans.csv",
      [
        "Can Name",
        "Data Source",
        "Diameter (cm)",
        "Height (cm)",
        "Stated Volume (cm^3)",
        "Geometric Volume pi*d^2*h/4 (cm^3)",
        "h/d Ratio (dimensionless)",
        "Actual Area (cm^2)",
        "Shape-Only Optimum Area [Geom. V] (cm^2)",
        "Shape-Only Excess [Geom. V] (%)",
        "Stated-Volume Optimum Area (cm^2)",
        "Stated-Volume Excess (%)",
      ],
      exportableCans.map((c) => [
        c.name,
        c.isExample ? "Example data, not measured" : "User entry",
        c.diameter_cm,
        c.height_cm,
        c.stated_volume_ml,
        c.geometric_volume_cm3.toFixed(2),
        c.h_over_d.toFixed(3),
        c.actual_area_cm2.toFixed(2),
        c.optimal_area_geom_cm2.toFixed(2),
        c.percent_excess_geom.toFixed(2),
        c.optimal_area_cm2.toFixed(2),
        c.percent_excess.toFixed(2),
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Add / Edit Can Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Real Cans Comparison
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Saved in browser <code className="font-mono">localStorage</code>. Built-in rows are
              clearly marked as <strong>Example data, not measured</strong> and excluded from CSV
              exports unless you opt in.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeExamplesInExport}
                onChange={(e) => setIncludeExamplesInExport(e.target.checked)}
                className="rounded border-slate-300 accent-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
              Include example cans in CSV
            </label>
            <button
              type="button"
              onClick={onResetDefaults}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Restore Examples
            </button>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={exportableCans.length === 0}
              title={
                exportableCans.length === 0
                  ? "Add a user can or check 'Include example cans in CSV' to export"
                  : `Export ${exportableCans.length} can(s) to CSV`
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors disabled:opacity-45"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              CSV ({exportableCans.length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label
              htmlFor="can-name-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              {editingId ? "Editing Can Name" : "Can Name"}
            </label>
            <input
              id="can-name-input"
              type="text"
              placeholder="e.g., Cola 330 mL (Measured)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="can-diameter-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Diameter d (cm)
            </label>
            <input
              id="can-diameter-input"
              type="number"
              step="0.01"
              min="0.5"
              max="100"
              value={diameter}
              onChange={(e) => setDiameter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
          <div>
            <label
              htmlFor="can-height-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Height h (cm)
            </label>
            <input
              id="can-height-input"
              type="number"
              step="0.01"
              min="0.5"
              max="200"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label
                htmlFor="can-volume-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Volume (cm³ / mL)
              </label>
              <input
                id="can-volume-input"
                type="number"
                step="1"
                min="1"
                max="100000"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-mono text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {editingId ? "Save" : "Add"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                aria-label="Cancel editing"
                className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {formError && (
          <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
            {formError}
          </p>
        )}
        {formMismatchWarning && (
          <div
            role="status"
            className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{formMismatchWarning}</span>
          </div>
        )}
      </form>

      {/* Empty State or Table */}
      {cans.length === 0 && !loading ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center space-y-3">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            No cans in the comparison table yet.
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Enter a real can&apos;s diameter (cm), height (cm), and stated volume (cm³) using the
            form above, capture heights from the optional <code className="font-mono">/hardware</code>{" "}
            page, or restore the built-in example cans.
          </p>
          <button
            type="button"
            onClick={onResetDefaults}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Restore Example Cans
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1060px] text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Can &amp; Source</th>
                  <th className="px-3 py-3 font-semibold font-mono">d (cm)</th>
                  <th className="px-3 py-3 font-semibold font-mono">h (cm)</th>
                  <th className="px-3 py-3 font-semibold font-mono">Geom. V (cm³)</th>
                  <th className="px-3 py-3 font-semibold font-mono">Stated V (cm³)</th>
                  <th className="px-3 py-3 font-semibold font-mono">h/d (opt=1)</th>
                  <th className="px-3 py-3 font-semibold font-mono">Actual Area (cm²)</th>
                  <th className="px-3 py-3 font-semibold font-mono text-sky-700 dark:text-sky-300">
                    Shape-Only Opt. (cm²)
                  </th>
                  <th className="px-3 py-3 font-semibold font-mono text-sky-700 dark:text-sky-300">
                    Shape Excess (%)
                  </th>
                  <th className="px-3 py-3 font-semibold font-mono text-emerald-700 dark:text-emerald-300">
                    Stated-V Opt. (cm²)
                  </th>
                  <th className="px-3 py-3 font-semibold font-mono text-emerald-700 dark:text-emerald-300">
                    Stated-V Excess (%)
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading && cans.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-6 text-center text-slate-500">
                      Computing optimal areas in Pyodide...
                    </td>
                  </tr>
                ) : (
                  cans.map((c) => {
                    const mismatchPct = computeVolumeMismatchPct(
                      c.diameter_cm,
                      c.height_cm,
                      c.stated_volume_ml
                    );
                    const hasVolumeWarning = mismatchPct > 0.1;
                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors ${
                          c.isExample
                            ? "bg-slate-50/70 dark:bg-slate-900/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {c.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {c.isExample ? (
                              <span className="inline-flex rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                Example data, not measured
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-indigo-100 dark:bg-indigo-950 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:text-indigo-300">
                                User entry
                              </span>
                            )}
                            {hasVolumeWarning && (
                              <span
                                title={`Cylinder volume πd²h/4 = ${c.geometric_volume_cm3.toFixed(
                                  1
                                )} cm³ differs from stated ${c.stated_volume_ml} cm³ by ${(
                                  mismatchPct * 100
                                ).toFixed(1)}%.`}
                                className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-300"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
                                πd²h/4 ≠ V ({(mismatchPct * 100).toFixed(0)}%)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono">{c.diameter_cm.toFixed(2)}</td>
                        <td className="px-3 py-3 font-mono">{c.height_cm.toFixed(2)}</td>
                        <td className="px-3 py-3 font-mono text-slate-600 dark:text-slate-400">
                          {c.geometric_volume_cm3.toFixed(1)}
                        </td>
                        <td className="px-3 py-3 font-mono">{c.stated_volume_ml}</td>
                        <td className="px-3 py-3 font-mono">{c.h_over_d.toFixed(2)}</td>
                        <td className="px-3 py-3 font-mono">{c.actual_area_cm2.toFixed(2)}</td>
                        <td className="px-3 py-3 font-mono text-sky-700 dark:text-sky-400">
                          {c.optimal_area_geom_cm2.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-mono font-semibold text-sky-700 dark:text-sky-400">
                          {c.percent_excess_geom >= 0 ? "+" : ""}
                          {c.percent_excess_geom.toFixed(2)}%
                        </td>
                        <td className="px-3 py-3 font-mono text-emerald-700 dark:text-emerald-400">
                          {c.optimal_area_cm2.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 font-mono font-semibold text-amber-700 dark:text-amber-400">
                          {c.percent_excess >= 0 ? "+" : ""}
                          {c.percent_excess.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(c)}
                            aria-label={`Edit ${c.name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors mr-1"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCan(c.id)}
                            aria-label={`Delete ${c.name}`}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-xs text-slate-700 dark:text-slate-300">
            <strong>Comparing the two columns:</strong> The <em>Shape-Only</em> comparison uses the
            measured geometric cylinder volume (<code className="font-mono">πd²h/4</code>) to
            isolate the penalty of the can&apos;s non-optimal proportions alone, whereas the{" "}
            <em>Stated-Volume</em> comparison benchmarks against the labelled drink volume and
            therefore also reflects headspace, domed base, rim seam, and wall thickness.
          </div>
        </div>
      )}

      {/* Bar Chart + Hypotheses Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          {cans.length > 0 && (
            <PlotlyChart
              title="Actual Surface Area vs SymPy Optimal Area"
              subtitle="Comparing each can against an ideal h = d cylinder of the same stated volume."
              ariaLabel="Grouped bar chart comparing actual surface area against optimal surface area in square centimeters for each can"
              takeaway="Commercial beverage cans consistently use more surface area than the pure h = d optimum because they are taller and slimmer."
              data={barChartData}
              layout={{
                barmode: "group",
                xaxis: { title: "Can" },
                yaxis: { title: "Surface Area (cm²)" },
                legend: { orientation: "h", y: -0.26 },
              }}
              filename="canoptimizer-real-cans-bar"
            />
          )}
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Why Do Real Cans Differ From h = d? (Hypotheses)
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            The pure calculus model assumes uniform wall thickness and a flat-ended cylinder.
            Real manufacturing introduces competing engineering constraints:
          </p>
          <div className="space-y-2.5">
            {HYPOTHESES.map((item) => (
              <div
                key={item.title}
                className="rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3"
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
    </div>
  );
}
