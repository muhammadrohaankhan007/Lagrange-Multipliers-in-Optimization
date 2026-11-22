"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  BarChart3,
  BookOpen,
  Box,
  CheckSquare,
  Compass,
  FlaskConical,
  RotateCcw,
  Scale,
  Shapes,
  Sigma,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { PyodideBanner } from "@/components/PyodideBanner";
import { DemoGuidePanel, type DemoTabId } from "@/components/DemoGuidePanel";
import { AboutSection } from "@/components/AboutSection";
import { TabBar, type TabItem } from "@/components/TabBar";
import { ProblemTab } from "@/components/tabs/ProblemTab";
import { AnalyticalTab } from "@/components/tabs/AnalyticalTab";
import { VerificationTab } from "@/components/tabs/VerificationTab";
import { VisualizationsTab } from "@/components/tabs/VisualizationsTab";
import { LambdaTab } from "@/components/tabs/LambdaTab";
import { RealCansTab } from "@/components/tabs/RealCansTab";
import { WeightedTab } from "@/components/tabs/WeightedTab";
import { ShapeComparisonTab } from "@/components/tabs/ShapeComparisonTab";
import { TangencyDemoTab } from "@/components/tabs/TangencyDemoTab";

const Can3DTab = dynamic(
  () => import("@/components/tabs/Can3DTab").then((mod) => mod.Can3DTab),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
        Loading 3D Can viewer...
      </div>
    ),
  }
);
import {
  analyzeRealCans,
  compareShapes,
  generateVisualizations,
  initSolver,
  onSolverStatus,
  solveLagrange,
  sweepVolume,
  sweepWeight,
  verifyNumerically,
  type AnalyticalSolution,
  type NumericalVerification,
  type RealCanAnalysis,
  type RealCanInput,
  type ShapeComparisonResult,
  type SolverStatus,
  type VisualizationData,
  type VolumeSweepResult,
  type WeightSweepResult,
} from "@/lib/solver-client";
import { DEFAULT_REAL_CANS, loadRealCans, saveRealCans } from "@/lib/cans-storage";

const DEFAULT_V0 = 355;
const V0_MIN = 1;
const V0_MAX = 100000;

const TABS: TabItem[] = [
  { id: "problem", label: "Problem & Model", icon: BookOpen, group: "core" },
  { id: "analytical", label: "Analytical (SymPy)", icon: Sigma, group: "core" },
  { id: "verification", label: "Numerical (SLSQP)", icon: CheckSquare, group: "core" },
  { id: "visualizations", label: "Visualizations", icon: BarChart3, group: "core" },
  { id: "lambda", label: "Interpreting λ", icon: Activity, group: "core" },
  { id: "real-cans", label: "Real Cans", icon: FlaskConical, group: "core" },
  { id: "weighted", label: "Weighted Cost", icon: Scale, group: "extras" },
  { id: "shapes", label: "Shape Comparison", icon: Shapes, group: "extras" },
  { id: "tangency", label: "Tangency Demo", icon: Compass, group: "extras" },
  { id: "can-3d", label: "3D Can", icon: Box, group: "extras" },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<DemoTabId>("problem");
  const [demoOpen, setDemoOpen] = useState<boolean>(false);

  // Shared validated volume state: v0 always holds the last valid number
  const [v0, setV0] = useState<number>(DEFAULT_V0);
  const [v0Input, setV0Input] = useState<string>(String(DEFAULT_V0));
  const [v0Error, setV0Error] = useState<string | null>(null);

  const [tolerance, setTolerance] = useState<number>(1e-4);
  const [kWeight, setKWeight] = useState<number>(1.0);

  const [solverStatus, setSolverStatus] = useState<SolverStatus>({
    stage: "idle",
    message: "Starting Pyodide Web Worker...",
  });
  const [ready, setReady] = useState(false);

  const [solution, setSolution] = useState<AnalyticalSolution | null>(null);
  const [verification, setVerification] = useState<NumericalVerification | null>(null);
  const [viz, setViz] = useState<VisualizationData | null>(null);
  const [lambdaSweep, setLambdaSweep] = useState<VolumeSweepResult | null>(null);
  const [weightSweep, setWeightSweep] = useState<WeightSweepResult | null>(null);
  const [shapeComparison, setShapeComparison] = useState<ShapeComparisonResult | null>(null);

  const [rawCans, setRawCans] = useState<RealCanInput[]>([]);
  const [analyzedCans, setAnalyzedCans] = useState<RealCanAnalysis[]>([]);

  const [busy, setBusy] = useState(false);

  // Open demo panel if ?demo=1 is in the URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("demo") === "1") {
        setDemoOpen(true);
      }
    }
  }, []);

  // Load saved cans from localStorage on client mount
  useEffect(() => {
    setRawCans(loadRealCans());
  }, []);

  // Validate volume string; keep last valid v0 on error so charts never blank or crash
  const handleV0InputChange = useCallback((raw: string) => {
    setV0Input(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setV0Error(`Volume cannot be empty. Enter a value between ${V0_MIN} and ${V0_MAX.toLocaleString()} cm³.`);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setV0Error("Volume must be a valid number.");
      return;
    }
    if (parsed <= 0) {
      setV0Error("Volume must be strictly positive (> 0 cm³).");
      return;
    }
    if (parsed < V0_MIN || parsed > V0_MAX) {
      setV0Error(`Volume must be between ${V0_MIN} and ${V0_MAX.toLocaleString()} cm³.`);
      return;
    }
    setV0Error(null);
    setV0(parsed);
  }, []);

  const handleSelectValidV0 = useCallback((val: number) => {
    const clamped = Math.min(V0_MAX, Math.max(V0_MIN, val));
    setV0(clamped);
    setV0Input(String(clamped));
    setV0Error(null);
  }, []);

  const handleResetV0 = useCallback(() => {
    handleSelectValidV0(DEFAULT_V0);
  }, [handleSelectValidV0]);

  const handleChangeK = useCallback((val: number) => {
    if (!Number.isFinite(val)) return;
    setKWeight(Math.min(4.0, Math.max(0.25, Number(val.toFixed(2)))));
  }, []);

  // Initialize Pyodide Web Worker once on mount
  const bootPyodide = useCallback(() => {
    setReady(false);
    initSolver()
      .then(() => setReady(true))
      .catch(() => {
        setReady(false);
      });
  }, []);

  useEffect(() => {
    const unsub = onSolverStatus(setSolverStatus);
    bootPyodide();
    return unsub;
  }, [bootPyodide]);

  // 1. Always keep analytical solution synced with V0 once Pyodide is ready
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setBusy(true);
    solveLagrange(v0, 1.0)
      .then((res) => {
        if (!cancelled) setSolution(res);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, v0]);

  // 2. Tab-specific computations
  useEffect(() => {
    if (!ready || activeTab !== "verification") return;
    let cancelled = false;
    setBusy(true);
    verifyNumerically(v0, tolerance, 1.0)
      .then((res) => {
        if (!cancelled) setVerification(res);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, activeTab, v0, tolerance]);

  useEffect(() => {
    if (!ready || activeTab !== "visualizations") return;
    let cancelled = false;
    setBusy(true);
    generateVisualizations(v0, 1.0)
      .then((res) => {
        if (!cancelled) setViz(res);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, activeTab, v0]);

  useEffect(() => {
    if (!ready || activeTab !== "lambda") return;
    let cancelled = false;
    setBusy(true);
    sweepVolume({ v0, vMin: 100, vMax: 1000, numPoints: 45 }, 1.0)
      .then((res) => {
        if (!cancelled) setLambdaSweep(res);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, activeTab, v0]);

  useEffect(() => {
    if (!ready || activeTab !== "weighted") return;
    let cancelled = false;
    setBusy(true);
    sweepWeight(v0, kWeight)
      .then((res) => {
        if (!cancelled) setWeightSweep(res);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, activeTab, v0, kWeight]);

  useEffect(() => {
    if (!ready || activeTab !== "shapes") return;
    let cancelled = false;
    setBusy(true);
    compareShapes(v0)
      .then((res) => {
        if (!cancelled) setShapeComparison(res);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, activeTab, v0]);

  useEffect(() => {
    if (!ready) return;
    if (rawCans.length === 0) {
      setAnalyzedCans([]);
      return;
    }
    let cancelled = false;
    const exampleById = new Map(rawCans.map((c) => [c.id, Boolean(c.isExample)]));
    analyzeRealCans(rawCans).then((res) => {
      if (!cancelled) {
        setAnalyzedCans(
          res.map((item) => ({
            ...item,
            isExample: exampleById.get(item.id) ?? false,
          }))
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ready, rawCans]);

  const handleAddCan = (can: Omit<RealCanInput, "id">) => {
    const next: RealCanInput[] = [
      ...rawCans,
      {
        ...can,
        isExample: false,
        id: `can-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      },
    ];
    setRawCans(next);
    saveRealCans(next);
  };

  const handleEditCan = (updated: RealCanInput) => {
    const next = rawCans.map((c) => (c.id === updated.id ? { ...updated, isExample: false } : c));
    setRawCans(next);
    saveRealCans(next);
  };

  const handleDeleteCan = (id: string) => {
    const next = rawCans.filter((c) => c.id !== id);
    setRawCans(next);
    saveRealCans(next);
  };

  const handleResetDefaults = () => {
    setRawCans(DEFAULT_REAL_CANS);
    saveRealCans(DEFAULT_REAL_CANS);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        solverStatus={solverStatus}
        onRetrySolver={bootPyodide}
        onToggleDemo={() => setDemoOpen((prev) => !prev)}
        demoOpen={demoOpen}
      />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-5">
        <PyodideBanner status={solverStatus} onRetry={bootPyodide} />

        {demoOpen && (
          <DemoGuidePanel
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onClose={() => setDemoOpen(false)}
          />
        )}

        {/* Shared Target Volume Bar (persists across all tabs) */}
        <section
          aria-label="Shared target volume control"
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor="shared-v0-input"
              className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Shared Target Volume V₀:
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="shared-v0-input"
                type="text"
                inputMode="decimal"
                value={v0Input}
                aria-invalid={Boolean(v0Error)}
                aria-describedby={v0Error ? "shared-v0-error" : undefined}
                onChange={(e) => handleV0InputChange(e.target.value)}
                className={`w-28 rounded-lg border px-2.5 py-1 text-sm font-mono font-semibold bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus-visible:outline-none focus-visible:ring-2 ${
                  v0Error
                    ? "border-rose-500 focus-visible:ring-rose-500"
                    : "border-slate-300 dark:border-slate-700 focus-visible:ring-indigo-500"
                }`}
              />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                cm³ (mL)
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetV0}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Reset to 355
            </button>
          </div>

          {v0Error ? (
            <p
              id="shared-v0-error"
              role="alert"
              className="text-xs text-rose-600 dark:text-rose-400"
            >
              {v0Error} (Active: {v0} cm³)
            </p>
          ) : (
            <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
              {solution
                ? `r* = ${solution.r_opt.toFixed(3)} cm · h* = ${solution.h_opt.toFixed(
                    3
                  )} cm · A_min = ${solution.area_min.toFixed(2)} cm² · λ* = ${solution.lambda_opt.toFixed(
                    4
                  )} 1/cm`
                : "Waiting for Pyodide..."}
            </div>
          )}
        </section>

        {/* Polished Grouped Tab Bar with Fade Edges, Chevrons & Keyboard Nav */}
        <TabBar tabs={TABS} activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Active Tab Content */}
        <div role="tabpanel">
          {activeTab === "problem" && (
            <ProblemTab
              v0={v0}
              v0Input={v0Input}
              v0Error={v0Error}
              onChangeV0Input={handleV0InputChange}
              onSelectPresetV0={handleSelectValidV0}
              onResetV0={handleResetV0}
              solution={solution}
              loading={busy}
            />
          )}
          {activeTab === "analytical" && <AnalyticalTab solution={solution} loading={busy} />}
          {activeTab === "verification" && (
            <VerificationTab
              verification={verification}
              tolerance={tolerance}
              onChangeTolerance={setTolerance}
              loading={busy}
            />
          )}
          {activeTab === "visualizations" && <VisualizationsTab viz={viz} loading={busy} />}
          {activeTab === "lambda" && (
            <LambdaTab
              v0={v0}
              onChangeV0={handleSelectValidV0}
              sweep={lambdaSweep}
              loading={busy}
            />
          )}
          {activeTab === "real-cans" && (
            <RealCansTab
              cans={analyzedCans}
              onAddCan={handleAddCan}
              onEditCan={handleEditCan}
              onDeleteCan={handleDeleteCan}
              onResetDefaults={handleResetDefaults}
              loading={busy}
            />
          )}
          {activeTab === "weighted" && (
            <WeightedTab
              v0={v0}
              kWeight={kWeight}
              onChangeK={handleChangeK}
              sweep={weightSweep}
              loading={busy}
            />
          )}
          {activeTab === "shapes" && (
            <ShapeComparisonTab comparison={shapeComparison} loading={busy} />
          )}
          {activeTab === "tangency" && (
            <TangencyDemoTab v0={v0} solution={solution} loading={busy} />
          )}
          {activeTab === "can-3d" && (
            <Can3DTab
              v0={v0}
              solution={solution}
              realCans={analyzedCans}
              loading={busy}
            />
          )}
        </div>

        <AboutSection />
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 px-4 text-center text-xs text-slate-600 dark:text-slate-400">
        <div className="font-medium text-slate-800 dark:text-slate-200">
          Lagrange Multipliers in Optimization: Minimum-Surface-Area Soda Can
        </div>
        <div className="mt-0.5">
          CanOptimizer · MTH-111 Multivariable Calculus · Salim Habib University · SymPy &amp;
          SciPy via Pyodide
        </div>
      </footer>
    </div>
  );
}
