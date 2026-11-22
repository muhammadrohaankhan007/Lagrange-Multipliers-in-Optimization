/* eslint-disable no-restricted-globals */
/**
 * Pyodide Web Worker for CanOptimizer.
 *
 * Loads Pyodide + SymPy + SciPy + NumPy off the main UI thread so the browser
 * never freezes, then loads /solver.py (synced from /lib/python/solver.py).
 * If Pyodide fails to load, reports a clear error — never falls back to hardcoded math.
 */

const PYODIDE_VERSION = "0.27.4";
const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodideReadyPromise = null;

function postStatus(stage, message) {
  self.postMessage({ type: "status", stage, message });
}

async function initPyodide() {
  if (pyodideReadyPromise) {
    return pyodideReadyPromise;
  }

  pyodideReadyPromise = (async () => {
    try {
      postStatus("loading_runtime", "Loading Pyodide WebAssembly runtime...");
      importScripts(`${PYODIDE_INDEX_URL}pyodide.js`);

      const pyodide = await self.loadPyodide({
        indexURL: PYODIDE_INDEX_URL,
      });

      postStatus("loading_packages", "Loading NumPy, SymPy, and SciPy packages...");
      await pyodide.loadPackage(["numpy", "sympy", "scipy"]);

      postStatus("loading_solver", "Loading /lib/python/solver.py...");
      const response = await fetch("/solver.py", { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`Failed to fetch /solver.py (HTTP ${response.status})`);
      }
      const solverCode = await response.text();
      await pyodide.runPythonAsync(solverCode);

      // Warm up symbolic derivation cache once during init
      postStatus("warming_up", "Initializing SymPy symbolic Lagrange engine...");
      pyodide.runPython("_derive_lagrange_symbolically(False)");

      postStatus("ready", "Pyodide (SymPy + SciPy) ready");
      return pyodide;
    } catch (err) {
      pyodideReadyPromise = null;
      const msg = err instanceof Error ? err.message : String(err);
      postStatus("error", `Pyodide initialization failed: ${msg}`);
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
