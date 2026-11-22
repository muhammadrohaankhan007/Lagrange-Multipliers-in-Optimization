/* eslint-disable no-restricted-globals */
/**
 * Pyodide Web Worker for CanOptimizer.
 *
 * Loads Pyodide + NumPy + SymPy + SciPy off the main UI thread so the browser
 * never freezes, then loads /solver.py (synced from /lib/python/solver.py) and
 * executes a real self-test for V0 = 355 cm^3.
 *
 * Emits real step-by-step progress events as each stage starts and completes.
 * Never fakes progress with timers and never falls back to hardcoded math.
 */

const PYODIDE_VERSION = "0.27.4";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodideReadyPromise = null;

function createInitialSteps() {
  return [
    { id: "runtime", label: "Download Python runtime", state: "waiting" },
    { id: "numpy", label: "Load NumPy", state: "waiting" },
    { id: "sympy", label: "Load SymPy", state: "waiting" },
    { id: "scipy", label: "Load SciPy", state: "waiting" },
    { id: "solver", label: "Load the CanOptimizer solver", state: "waiting" },
    { id: "selftest", label: "Run a quick self-test", state: "waiting" },
  ];
}

function postProgress(stage, message, steps, failedStep = null, rawError = null) {
  self.postMessage({
    type: "status",
    stage,
    message,
    steps: steps.map((s) => ({ ...s })),
    failedStep,
    rawError,
  });
}

async function initPyodide() {
  if (pyodideReadyPromise) {
    return pyodideReadyPromise;
  }

  pyodideReadyPromise = (async () => {
    const steps = createInitialSteps();
    let currentStepId = "runtime";

    const setStep = (id, state) => {
      const target = steps.find((s) => s.id === id);
      if (target) target.state = state;
    };

    try {
      // Step 1: Download Python runtime (Pyodide)
      currentStepId = "runtime";
      setStep("runtime", "active");
      postProgress("loading", "Downloading Python runtime…", steps);
      importScripts(`${PYODIDE_INDEX_URL}pyodide.js`);
      const pyodide = await self.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
      setStep("runtime", "done");

      // Step 2: Load NumPy
      currentStepId = "numpy";
      setStep("numpy", "active");
      postProgress("loading", "Loading NumPy…", steps);
      await pyodide.loadPackage("numpy");
      setStep("numpy", "done");

      // Step 3: Load SymPy
      currentStepId = "sympy";
      setStep("sympy", "active");
      postProgress("loading", "Loading SymPy…", steps);
      await pyodide.loadPackage("sympy");
      setStep("sympy", "done");

      // Step 4: Load SciPy
      currentStepId = "scipy";
      setStep("scipy", "active");
      postProgress("loading", "Loading SciPy…", steps);
      await pyodide.loadPackage("scipy");
      setStep("scipy", "done");

      // Step 5: Load the CanOptimizer solver
      currentStepId = "solver";
      setStep("solver", "active");
      postProgress("loading", "Loading the CanOptimizer solver…", steps);
      const response = await fetch("/solver.py", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Failed to fetch /solver.py (HTTP ${response.status})`);
      }
      const solverCode = await response.text();
      await pyodide.runPythonAsync(solverCode);
      setStep("solver", "done");

      // Step 6: Run a real self-test on default volume V0 = 355 cm^3
      currentStepId = "selftest";
      setStep("selftest", "active");
      postProgress("loading", "Running a quick self-test…", steps);
      const dispatchFn = pyodide.globals.get("dispatch_json");
      const testRaw = dispatchFn("solve_lagrange", JSON.stringify({ v0: 355, k: 1.0 }));
      const testParsed = JSON.parse(testRaw);
      if (
        !testParsed ||
        !Number.isFinite(testParsed.r_opt) ||
        !Number.isFinite(testParsed.h_opt) ||
        !Number.isFinite(testParsed.area_min) ||
        testParsed.r_opt <= 0 ||
        testParsed.area_min <= 0
      ) {
        throw new Error("Self-test returned an invalid solution for V0 = 355 cm³.");
      }
      setStep("selftest", "done");

      postProgress("ready", "Math engine ready", steps);
      return pyodide;
    } catch (err) {
      pyodideReadyPromise = null;
      const rawError = err instanceof Error ? err.stack || err.message : String(err);
      const plainError = err instanceof Error ? err.message : String(err);
      setStep(currentStepId, "failed");
      const failedMeta = steps.find((s) => s.id === currentStepId);
      const failedLabel = failedMeta ? failedMeta.label : currentStepId;
      postProgress(
        "error",
        `Failed during "${failedLabel}": ${plainError}`,
        steps,
        failedLabel,
        rawError
      );
      throw err;
    }
  })();

  return pyodideReadyPromise;
}

self.onmessage = async (event) => {
  const { id, action, payload } = event.data || {};

  if (action === "init") {
    try {
      await initPyodide();
      self.postMessage({ id, ok: true, result: { ready: true } });
    } catch (err) {
      self.postMessage({
        id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
    return;
  }

  try {
    const pyodide = await initPyodide();
    const dispatchFn = pyodide.globals.get("dispatch_json");
    const jsonResult = dispatchFn(action, JSON.stringify(payload || {}));
    const parsed = JSON.parse(jsonResult);
    self.postMessage({ id, ok: true, result: parsed });
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
