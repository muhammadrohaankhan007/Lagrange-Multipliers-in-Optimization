/**
 * Typed TypeScript client wrapping the Pyodide Web Worker (/public/pyodide-worker.js),
 * which runs /lib/python/solver.py (SymPy + SciPy + NumPy) off the main thread.
 *
 * Exports:
 *  - initSolver()
 *  - solveLagrange(V0, k?)
 *  - verifyNumerically(V0, tolerance?, k?)
 *  - generateVisualizations(V0, k?)
 *  - sweepVolume(range, k?)
 *  - sweepWeight(V0, k?)
 *  - analyzeRealCans(cans)
 *  - onSolverStatus(listener)
 */

export type SolverStage =
  | "idle"
  | "loading_runtime"
  | "loading_packages"
  | "loading_solver"
  | "warming_up"
  | "ready"
  | "error";

export interface SolverStatus {
  stage: SolverStage;
  message: string;
}

export interface DerivationStep {
  step_number: number;
  title: string;
  explanation: string;
  latex: string;
}

export interface AnalyticalSolution {
  v0: number;
  k: number;
  r_opt: number;
  h_opt: number;
  d_opt: number;
  lambda_opt: number;
  area_min: number;
  h_over_d_opt: number;
  second_derivative_at_opt: number;
  is_strict_minimum: boolean;
  symbolic_r_latex: string;
  symbolic_h_latex: string;
  symbolic_lambda_latex: string;
  symbolic_area_latex: string;
  steps: DerivationStep[];
}

export interface NumericalRun {
  label: string;
  method: string;
  start_r: number;
  start_h: number;
  r_num: number;
  h_num: number;
  area_num: number;
  diff_r: number;
  diff_h: number;
  diff_area: number;
  constraint_residual: number;
  iterations: number;
  success: boolean;
  passed: boolean;
}

export interface NumericalVerification {
  v0: number;
  k: number;
  tolerance: number;
  analytical_r: number;
  analytical_h: number;
  analytical_area: number;
  all_passed: boolean;
  runs: NumericalRun[];
}

export interface VisualizationData {
  v0: number;
  k: number;
  optimum: {
    r: number;
    h: number;
    area: number;
    lambda: number;
  };
  contour: {
    r: number[];
    h: number[];
    z: number[][];
    constraint_r: number[];
    constraint_h: number[];
  };
  gradients: {
    r_opt: number;
    h_opt: number;
    grad_f: [number, number];
    grad_g: [number, number];
    lambda_grad_g: [number, number];
    lambda: number;
    cosine_similarity: number;
    angle_degrees: number;
  };
  one_variable: {
    r: number[];
    area: number[];
    r_opt: number;
    area_min: number;
  };
  surface_3d: {
    r: number[];
    h: number[];
    z: number[][];
    constraint_r: number[];
    constraint_h: number[];
    constraint_area: number[];
  };
}

export interface VolumeSweepRange {
  v0: number;
  vMin?: number;
  vMax?: number;
  numPoints?: number;
}

export interface VolumeSweepResult {
  v0: number;
  k: number;
  area_min_at_v0: number;
  lambda_at_v0: number;
  numerical_slope_at_v0: number;
  abs_error: number;
  rel_error: number;
  delta_v_used: number;
  volumes: number[];
  areas: number[];
  lambdas: number[];
  numerical_slopes: number[];
}

export interface WeightSweepResult {
  v0: number;
  k: number;
  current: AnalyticalSolution;
  sweep: {
    k: number[];
    r_opt: number[];
    h_opt: number[];
    cost_min: number[];
    h_over_d: number[];
  };
}

export interface RealCanInput {
  id: string;
  name: string;
  diameter_cm: number;
  height_cm: number;
  stated_volume_ml: number;
  isExample?: boolean;
}

export interface RealCanAnalysis extends RealCanInput {
  radius_cm: number;
  geometric_volume_cm3: number;
  h_over_d: number;
  optimal_h_over_d: number;
  actual_area_cm2: number;
  optimal_area_geom_cm2: number;
  percent_excess_geom: number;
  optimal_area_cm2: number;
  optimal_r_cm: number;
  optimal_h_cm: number;
  percent_excess: number;
}

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
};

type StatusListener = (status: SolverStatus) => void;

let worker: Worker | null = null;
let reqCounter = 0;
const pending = new Map<number, PendingRequest>();
const statusListeners = new Set<StatusListener>();
let currentStatus: SolverStatus = {
  stage: "idle",
  message: "Pyodide engine not yet started.",
};

// In-memory cache for repeated queries so UI slider/tab switches are instant
const resultCache = new Map<string, unknown>();

function emitStatus(status: SolverStatus) {
  currentStatus = status;
  for (const listener of statusListeners) {
    listener(status);
  }
}

export function getSolverStatus(): SolverStatus {
  return currentStatus;
}

export function onSolverStatus(listener: StatusListener): () => void {
  statusListeners.add(listener);
  listener(currentStatus);
  return () => {
    statusListeners.delete(listener);
  };
}

function getWorker(): Worker {
  if (typeof window === "undefined") {
    throw new Error("Pyodide solver can only run in a browser environment.");
  }
  if (!worker) {
    worker = new Worker("/pyodide-worker.js");
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data) return;
      if (data.type === "status") {
        emitStatus({ stage: data.stage, message: data.message });
        return;
      }
      const { id, ok, result, error } = data;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      if (ok) {
        entry.resolve(result);
      } else {
        entry.reject(new Error(error || "Unknown Pyodide worker error"));
      }
    };
    worker.onerror = (err) => {
      const message = err.message || "Web Worker crashed while loading Pyodide.";
      emitStatus({ stage: "error", message });
      for (const [, entry] of pending) {
        entry.reject(new Error(message));
      }
      pending.clear();
    };
  }
  return worker;
}

function callWorker<T>(action: string, payload?: Record<string, unknown>, cacheKey?: string): Promise<T> {
  if (cacheKey && resultCache.has(cacheKey)) {
    return Promise.resolve(resultCache.get(cacheKey) as T);
  }
  const w = getWorker();
  const id = ++reqCounter;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, {
      resolve: (val) => {
        if (cacheKey) {
          if (resultCache.size > 150) {
            const oldestKey = resultCache.keys().next().value;
            if (oldestKey) resultCache.delete(oldestKey);
          }
          resultCache.set(cacheKey, val);
        }
        resolve(val as T);
      },
      reject,
    });
    w.postMessage({ id, action, payload });
  });
}

export async function initSolver(): Promise<{ ready: boolean }> {
  return callWorker<{ ready: boolean }>("init");
}

export async function solveLagrange(v0: number, k: number = 1.0): Promise<AnalyticalSolution> {
  const key = `solve:${v0.toFixed(4)}:${k.toFixed(4)}`;
  return callWorker<AnalyticalSolution>("solve_lagrange", { v0, k }, key);
}

export async function verifyNumerically(
  v0: number,
  tolerance: number = 1e-4,
  k: number = 1.0
): Promise<NumericalVerification> {
  const key = `verify:${v0.toFixed(4)}:${tolerance}:${k.toFixed(4)}`;
  return callWorker<NumericalVerification>("verify_numerically", { v0, tolerance, k }, key);
}

export async function generateVisualizations(
  v0: number,
  k: number = 1.0
): Promise<VisualizationData> {
  const key = `viz:${v0.toFixed(4)}:${k.toFixed(4)}`;
  return callWorker<VisualizationData>("generate_visualizations", { v0, k }, key);
}

export async function sweepVolume(
  range: VolumeSweepRange,
  k: number = 1.0
): Promise<VolumeSweepResult> {
  const vMin = range.vMin ?? 100;
  const vMax = range.vMax ?? 1000;
  const numPoints = range.numPoints ?? 45;
  const key = `sweepV:${range.v0.toFixed(2)}:${vMin}:${vMax}:${numPoints}:${k.toFixed(4)}`;
  return callWorker<VolumeSweepResult>(
    "sweep_volume",
    {
      v0: range.v0,
      v_min: vMin,
      v_max: vMax,
      num_points: numPoints,
      k,
    },
    key
  );
}

export async function sweepWeight(v0: number, k: number = 1.0): Promise<WeightSweepResult> {
  const key = `sweepK:${v0.toFixed(4)}:${k.toFixed(4)}`;
  return callWorker<WeightSweepResult>("sweep_weight", { v0, k }, key);
}

export interface ShapeComparisonEntry {
  id: string;
  name: string;
  group: "closed" | "open_top";
  dimensions_summary: string;
  dimensions: Record<string, number>;
  area_min: number;
  ratio_to_sphere: number | null;
  optimal_ratios: string;
  lambda_opt: number | null;
  steps: DerivationStep[];
}

export interface ShapeComparisonResult {
  v0: number;
  closed: ShapeComparisonEntry[];
  open_top: ShapeComparisonEntry[];
}

export async function analyzeRealCans(cans: RealCanInput[]): Promise<RealCanAnalysis[]> {
  return callWorker<RealCanAnalysis[]>("analyze_real_cans", { cans });
}

export async function compareShapes(v0: number): Promise<ShapeComparisonResult> {
  const key = `shapes:${v0.toFixed(4)}`;
  return callWorker<ShapeComparisonResult>("compare_shapes", { v0 }, key);
}
