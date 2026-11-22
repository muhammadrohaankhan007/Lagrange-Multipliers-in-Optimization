# How the Math Maps to the Code (MTH-111 Presentation Guide)

This document maps each step of the multivariable calculus derivation directly to the exact functions in [`lib/python/solver.py`](../lib/python/solver.py) and the browser worker pipeline.

---

## 1. Architecture at a Glance

```text
React UI (app/page.tsx)
   └── Typed Client (lib/solver-client.ts)
          └── Web Worker (public/pyodide-worker.js)
                 └── Pyodide (WebAssembly Python: SymPy + SciPy + NumPy)
                        └── lib/python/solver.py
```

- **Zero hardcoded answers:** Every closed-form formula, LaTeX derivation step, and numerical optimum is computed live by Python inside the user's browser.
- **Non-blocking UI:** Pyodide runs in a Web Worker, so heavy symbolic algebra and SciPy optimization never freeze scrolling or sliders.

---

## 2. Step-by-Step Calculus → Code Mapping

| Calculus Step | Mathematical Expression | Code in `lib/python/solver.py` |
| --- | --- | --- |
| **1. Define variables** | $r > 0,\; h > 0,\; V_0 > 0,\; \lambda \in \mathbb{R}$ | `r, h, V0 = sp.symbols("r h V_0", positive=True, real=True)` |
| **2. Objective & constraint** | $f(r,h) = 2\pi r^2 + 2\pi r h$, $g(r,h) = \pi r^2 h = V_0$ | `f_expr = 2*sp.pi*r**2 + 2*sp.pi*r*h`, `g_expr = sp.pi*r**2*h` |
| **3. Gradients** | $\nabla f = \langle 4\pi r + 2\pi h,\; 2\pi r \rangle$, $\nabla g = \langle 2\pi r h,\; \pi r^2 \rangle$ | `sp.diff(f_expr, r)`, `sp.diff(f_expr, h)`, `sp.diff(g_expr, r)`, `sp.diff(g_expr, h)` |
| **4. Lagrange system** | $\nabla f = \lambda \nabla g$ and $g(r,h) = V_0$ | `eq1 = sp.Eq(df_dr, lam * dg_dr)`, `eq2 = sp.Eq(df_dh, lam * dg_dh)`, `eq3 = sp.Eq(g_expr, V0)` |
| **5. Eliminate $\lambda$** | From (2): $\lambda = \frac{2}{r}$, substitute into (1) | `lam_from_eq2 = sp.solve(eq2, lam)[0]`, `eq1.subs(lam, lam_from_eq2)` |
| **6. Geometric ratio** | $h = 2r = d$ (or $h = 2kr$ for weighted ends) | `h_in_terms_of_r = sp.solve(eq1_no_lam, h)[0]` |
| **7. Solve for $r^*, h^*, \lambda^*, A_{\min}$** | $r^* = \sqrt[3]{\frac{V_0}{2\pi}}$, $h^* = 2r^*$, $\lambda^* = \frac{2}{r^*}$ | `sp.solve(eq3_in_r, r)[0]` and `.subs(subs_map).evalf(20)` |
| **8. Second-derivative test** | $A(r) = 2\pi r^2 + \frac{2V_0}{r}$, $A''(r^*) = 12\pi > 0$ | `d2A_dr2_sym = sp.diff(area_1d_sym, r, 2)` |
| **9. Numerical check** | Minimize $f(r,h)$ s.t. $\pi r^2 h - V_0 = 0$ from 6 starts | `scipy.optimize.minimize(..., method="SLSQP", constraints=...)` in `verify_numerically()` |
| **10. Sensitivity of $\lambda$** | $\frac{d A_{\min}}{d V_0} = \lambda^*(V_0)$ (Envelope Theorem) | Central finite difference `(A(V0+dv) - A(V0-dv)) / (2*dv)` in `sweep_volume()` |

---

## 3. Key Takeaways for the Presentation

1. **Tangency & Parallel Gradients:** In the Visualizations tab, the red constraint curve $g(r,h) = V_0$ kisses the optimal level curve of $f(r,h)$ tangentially, and the angle between $\nabla f(r^*, h^*)$ and $\nabla g(r^*, h^*)$ is $0.000000^\circ$.
2. **Meaning of $\lambda$:** For a 355 mL can, $\lambda^* \approx 0.521\text{ cm}^{-1}$, meaning each extra 1 mL of beverage volume requires roughly $0.521\text{ cm}^2$ of extra aluminum at the optimum.
3. **Why Real Cans Have $h/d \approx 1.85$ Instead of $1.0$:** In the Weighted Cost tab, setting the top/bottom end cost multiplier $k \approx 1.85$ shifts the optimal cylinder to $h^*/d^* = k = 1.85$ — matching real beverage cans closely alongside structural, ergonomic, and manufacturing hypotheses.

---

## 4. Extended Interactive Features

- **Shape Comparison (`compare_shapes` in `lib/python/solver.py`):** Applies SymPy Lagrange multipliers to a 3-variable closed box ($f = 2(xy+yz+xz),\; g = xyz = V_0 \implies x=y=z$), an open-top cylinder ($h = r$), an open-top square-base box ($h = x/2$), and a sphere (where $g(r) = \frac{4}{3}\pi r^3 = V_0$ fixes $r$ with zero free variables). Closed and open-top shapes are kept in separate tables and never ranked against each other.
- **Tangency Demo (`lib/gradients.ts` + `TangencyDemoTab.tsx`):** Evaluates $\nabla f = \langle 4\pi r + 2\pi h,\; 2\pi r \rangle$ and $\nabla g = \langle 2\pi r h,\; \pi r^2 \rangle$ along $h = V_0/(\pi r^2)$ for responsive sliding/clicking while using the SymPy optimum $(r^*, h^*)$ as the reference target. Verified against SymPy partial derivatives in `scripts/verify_gradients.py`.
- **3D Can (`Can3DTab.tsx` + `Can3DScene.tsx`):** Dynamically loaded with `next/dynamic(..., { ssr: false })` using Three.js and React Three Fiber. Scales an optional real can to the same volume $V_0$ while preserving its aspect ratio $\rho = h/d$ via $r_{\text{scaled}} = \sqrt[3]{V_0 / (2\pi\rho)},\; h_{\text{scaled}} = 2\rho r_{\text{scaled}}$.
