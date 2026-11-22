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
import { EngineWaitingSkeleton } from "@/components/EngineWaitingSkeleton";
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
    loading: () => <EngineWaitingSkeleton title="Loading 3D Can viewer…" />,
  }
);

import {
  INITIAL_LOADER_STEPS,
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

  const [v0, setV0] = useState<number>(DEFAULT_V0);
  const [v0Input, setV0Input] = useState<string>(String(DEFAULT_V0));
  const [v0Error, setV0Error] = useState<string | null>(null);

  const [tolerance, setTolerance] = useState<number>(1e-4);
  const [kWeight, setKWeight] = useState<number>(1.0);

  const [solverStatus, setSolverStatus] = useState<SolverStatus>({
    stage: "idle",
    message: "Starting the math engine…",
    steps: INITIAL_LOADER_STEPS.map((s) => ({ ...s })),
    failedStep: null,
    rawError: null,
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("demo") === "1") {
        setDemoOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    setRawCans(loadRealCans());
  }, []);

  const handleV0InputChange = useCallback((raw: string) => {
    setV0Input(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setV0Error(
        `Volume cannot be empty. Enter a value between ${V0_MIN} and ${V0_MAX.toLocaleString()} cm³.`
      );
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
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#0f172a]">
      <Navbar
        solverStatus={solverStatus}
        onRetrySolver={bootPyodide}
        onToggleDemo={() => setDemoOpen((prev) => !prev)}
        demoOpen={demoOpen}
      />

      <main
        id="main-content"
        className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6"
      >
        <PyodideBanner status={solverStatus} onRetry={bootPyodide} />

        {demoOpen && (
          <DemoGuidePanel
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onClose={() => setDemoOpen(false)}
          />
        )}

        {/* Shared Target Volume Bar */}
        <section
          aria-label="Shared target volume control"
          className="rounded-xl border border-[#e2e8f0] bg-white px-4 sm:px-5 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="shared-v0-input" className="text-sm font-semibold text-[#0f172a]">
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
                className={`w-28 rounded-lg border px-2.5 py-1 text-sm font-mono tabular-nums font-semibold bg-white text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 ${
                  v0Error
                    ? "border-[#b91c1c] focus-visible:ring-[#b91c1c]"
                    : "border-[#cbd5e1] focus-visible:ring-[#0f766e]"
                }`}
              />
              <span className="text-xs font-medium text-[#475569]">cm³ (mL)</span>
            </div>
            <button
              type="button"
              onClick={handleResetV0}
              className="inline-flex items-center gap-1 rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Reset to 355
            </button>
          </div>

          {v0Error ? (
            <p id="shared-v0-error" role="alert" className="text-xs text-[#b91c1c]">
              {v0Error} (Active: {v0} cm³)
            </p>
          ) : (
            <div className="text-xs text-[#475569] font-mono tabular-nums">
              {solution
                ? `r* = ${solution.r_opt.toFixed(3)} cm · h* = ${solution.h_opt.toFixed(
                    3
                  )} cm · A_min = ${solution.area_min.toFixed(2)} cm² · λ* = ${solution.lambda_opt.toFixed(
                    4
                  )} 1/cm`
                : "Waiting for the math engine…"}
            </div>
          )}
        </section>

        <TabBar tabs={TABS} activeTab={activeTab} onSelectTab={setActiveTab} />

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
              solution={solution}
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
              engineReady={ready}
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
            <ShapeComparisonTab
              solution={solution}
              comparison={shapeComparison}
              loading={busy}
            />
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

      <footer className="border-t border-[#e2e8f0] bg-white py-5 px-4 text-center text-xs text-[#475569]">
        <div className="font-medium text-[#0f172a]">
          Lagrange Multipliers in Optimization: Minimum-Surface-Area Soda Can
        </div>
        <div className="mt-1">
          CanOptimizer · MTH-111 Multivariable Calculus · Salim Habib University · SymPy &amp;
          SciPy in your browser
        </div>
      </footer>
    </div>
  );
}
