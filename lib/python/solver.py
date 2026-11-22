"""
CanOptimizer — Core Symbolic & Numerical Math Engine (Pyodide / Python)

This module is executed inside a browser Web Worker via Pyodide (SymPy + SciPy + NumPy)
and is also usable directly from standard Python (e.g., in notebooks/lagrange_can.ipynb).

Mathematical Problem (MTH-111 Multivariable Calculus, Salim Habib University):
    Minimize total surface area (or weighted material cost) of a closed cylindrical can:
        f(r, h) = 2*pi*r*h + k * 2*pi*r^2
    subject to the fixed-volume equality constraint:
        g(r, h) = pi*r^2*h = V0
    where:
        - r > 0 : cylinder radius in cm
        - h > 0 : cylinder height in cm
        - V0 > 0: target volume in cm^3 (1 mL = 1 cm^3)
        - k > 0 : cost weight of top & bottom ends relative to side wall (k = 1 is standard area)

All closed-form expressions and numeric optima are derived symbolically by SymPy —
nothing is hardcoded.
"""

from functools import lru_cache
import json
from typing import Dict, List, Optional, Tuple

import numpy as np
import sympy as sp
from scipy.optimize import minimize


# ---------------------------------------------------------------------------
# 1. Symbolic Lagrange Multiplier Derivation (SymPy)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=4)
def _derive_lagrange_symbolically(weighted: bool = False) -> Dict[str, sp.Expr]:
    """
    Derive the complete Lagrange multiplier solution symbolically using SymPy.

    Plain-language step-by-step mapping:
      Step 1: Declare positive real symbols r, h, V0 (and k if weighted) and multiplier lambda.
      Step 2: Define the objective f(r, h) and constraint g(r, h) = pi*r^2*h.
      Step 3: Differentiate symbolically to obtain gradients grad(f) and grad(g).
      Step 4: Form the three Lagrange equations:
                (1) df/dr = lambda * dg/dr
                (2) df/dh = lambda * dg/dh
                (3) pi * r^2 * h = V0
      Step 5: Solve equation (2) for lambda in terms of r.
      Step 6: Substitute lambda into equation (1) and solve for h in terms of r.
      Step 7: Substitute h(r) into the constraint (3) and solve for the positive real root r*.
      Step 8: Back-substitute r* to obtain h*, lambda*, and minimum surface area A_min.
      Step 9: Eliminate h into A(r) and compute A''(r*) > 0 to confirm a strict minimum.
    """
    r, h, V0 = sp.symbols("r h V_0", positive=True, real=True)
    lam = sp.symbols("lambda", real=True)
    k = sp.symbols("k", positive=True, real=True)

    if weighted:
        f_expr = 2 * sp.pi * r * h + k * 2 * sp.pi * r**2
    else:
        f_expr = 2 * sp.pi * r**2 + 2 * sp.pi * r * h

    g_expr = sp.pi * r**2 * h

    # Step 3: Gradients via symbolic partial differentiation
    df_dr = sp.diff(f_expr, r)
    df_dh = sp.diff(f_expr, h)
    dg_dr = sp.diff(g_expr, r)
    dg_dh = sp.diff(g_expr, h)

    # Step 4: Lagrange system of 3 equations
    eq1 = sp.Eq(df_dr, lam * dg_dr)
    eq2 = sp.Eq(df_dh, lam * dg_dh)
    eq3 = sp.Eq(g_expr, V0)

    # Step 5: Solve equation (2) for lambda
    lam_from_eq2 = sp.simplify(sp.solve(eq2, lam)[0])

    # Step 6: Substitute lambda into equation (1) and solve for h(r)
    eq1_no_lam = sp.simplify(eq1.subs(lam, lam_from_eq2))
    h_in_terms_of_r = sp.simplify(sp.solve(eq1_no_lam, h)[0])

    # Step 7: Substitute h(r) into constraint (3) and solve for positive real r*
    eq3_in_r = sp.simplify(eq3.subs(h, h_in_terms_of_r))
    r_opt_sym = sp.simplify(sp.solve(eq3_in_r, r)[0])

    # Step 8: Back-substitute to get h*, lambda*, and A_min
    h_opt_sym = sp.simplify(h_in_terms_of_r.subs(r, r_opt_sym))
    lam_opt_sym = sp.simplify(lam_from_eq2.subs(r, r_opt_sym))
    area_min_sym = sp.simplify(f_expr.subs({r: r_opt_sym, h: h_opt_sym}))

    # Step 9: Eliminate h into one-variable A(r) and check second derivative A''(r*) > 0
    h_from_constraint = sp.solve(eq3, h)[0]
    area_1d_sym = sp.simplify(f_expr.subs(h, h_from_constraint))
    d2A_dr2_sym = sp.simplify(sp.diff(area_1d_sym, r, 2))
    d2A_at_opt_sym = sp.simplify(d2A_dr2_sym.subs(r, r_opt_sym))

    return {
        "r": r,
        "h": h,
        "V0": V0,
        "k": k,
        "lam": lam,
        "f_expr": f_expr,
        "g_expr": g_expr,
        "df_dr": df_dr,
        "df_dh": df_dh,
        "dg_dr": dg_dr,
        "dg_dh": dg_dh,
        "eq1": eq1,
        "eq2": eq2,
        "eq3": eq3,
        "lam_from_eq2": lam_from_eq2,
        "eq1_no_lam": eq1_no_lam,
        "h_in_terms_of_r": h_in_terms_of_r,
        "eq3_in_r": eq3_in_r,
        "r_opt_sym": r_opt_sym,
        "h_opt_sym": h_opt_sym,
        "lam_opt_sym": lam_opt_sym,
        "area_min_sym": area_min_sym,
        "area_1d_sym": area_1d_sym,
        "d2A_dr2_sym": d2A_dr2_sym,
        "d2A_at_opt_sym": d2A_at_opt_sym,
    }


def solve_lagrange(v0: float, k_val: float = 1.0) -> Dict:
    """
    Solve the cylindrical can optimization problem symbolically with SymPy and
    evaluate all quantities numerically for volume V0 (cm^3) and cost weight k.
    """
    v0 = float(v0)
    k_val = float(k_val)
    if v0 <= 0:
        raise ValueError("Volume V0 must be strictly positive.")
    if k_val <= 0:
        raise ValueError("Weight k must be strictly positive.")

    weighted = not np.isclose(k_val, 1.0, rtol=0.0, atol=1e-12)
    sym = _derive_lagrange_symbolically(weighted=weighted)

    subs_map = {sym["V0"]: sp.Float(v0, 30)}
    if weighted:
        subs_map[sym["k"]] = sp.Float(k_val, 30)

    r_opt = float(sym["r_opt_sym"].subs(subs_map).evalf(20))
    h_opt = float(sym["h_opt_sym"].subs(subs_map).evalf(20))
    lam_opt = float(sym["lam_opt_sym"].subs(subs_map).evalf(20))
    area_min = float(sym["area_min_sym"].subs(subs_map).evalf(20))
    d2A_at_opt = float(sym["d2A_at_opt_sym"].subs(subs_map).evalf(20))
    d_opt = 2.0 * r_opt

    steps = [
        {
            "step_number": 1,
            "title": "Objective Function & Volume Constraint",
            "explanation": (
                "State the surface area objective f(r, h) to minimize and the fixed-volume "
                "equality constraint g(r, h) = V0 for a closed right circular cylinder."
                if not weighted
                else f"State the weighted material cost f(r, h) with end-cost weight k = {k_val:.2f} "
                     "and the fixed-volume equality constraint g(r, h) = V0."
            ),
            "latex": (
                rf"f(r, h) = {sp.latex(sym['f_expr'])}, \qquad "
                rf"g(r, h) = {sp.latex(sym['g_expr'])} = V_0"
            ),
        },
        {
            "step_number": 2,
            "title": "Compute Gradients ∇f and ∇g",
            "explanation": (
                "SymPy computes partial derivatives with respect to r and h. At a constrained "
                "extremum, the level curve of f is tangent to the constraint curve g = V0, so ∇f = λ∇g."
            ),
            "latex": (
                rf"\nabla f(r, h) = \left\langle {sp.latex(sym['df_dr'])},\; {sp.latex(sym['df_dh'])} \right\rangle, "
                rf"\qquad \nabla g(r, h) = \left\langle {sp.latex(sym['dg_dr'])},\; {sp.latex(sym['dg_dh'])} \right\rangle"
            ),
        },
        {
            "step_number": 3,
            "title": "Form the Three Lagrange Equations",
            "explanation": (
                "Match each component of ∇f = λ∇g and include the volume constraint g(r, h) = V0."
            ),
            "latex": (
                r"\begin{aligned}"
                rf"(1)\quad & {sp.latex(sym['eq1'])} \\ "
                rf"(2)\quad & {sp.latex(sym['eq2'])} \\ "
                rf"(3)\quad & {sp.latex(sym['eq3'])}"
                r"\end{aligned}"
            ),
        },
        {
            "step_number": 4,
            "title": "Eliminate the Multiplier λ",
            "explanation": (
                "Because r > 0, solve equation (2) for λ directly, then substitute into equation (1)."
            ),
            "latex": (
                rf"\text{{From (2):}}\quad \lambda = {sp.latex(sym['lam_from_eq2'])} "
                rf"\quad\Longrightarrow\quad {sp.latex(sym['eq1_no_lam'])}"
            ),
        },
        {
            "step_number": 5,
            "title": "Relation Between Height h and Radius r",
            "explanation": (
                "Solving the λ-free equation for h shows that the optimal standard can has "
                "height equal to its diameter (h = 2r = d)."
                if not weighted
                else "Solving the λ-free equation for h shows that the optimal aspect ratio scales "
                     "linearly with k: h = 2kr (so h/d = k)."
            ),
            "latex": (
                rf"h = {sp.latex(sym['h_in_terms_of_r'])} "
                + (r"\quad\Longleftrightarrow\quad \frac{h}{d} = 1" if not weighted else r"\quad\Longleftrightarrow\quad \frac{h}{d} = k")
            ),
        },
        {
            "step_number": 6,
            "title": f"Closed-Form & Numeric Optimum for V₀ = {v0:g} cm³",
            "explanation": (
                "Substitute h(r) into constraint (3) to solve for the positive root r*, then "
                "back-substitute to obtain h*, λ*, and the minimum area A_min."
            ),
            "latex": (
                r"\begin{aligned}"
                rf"r^* &= {sp.latex(sym['r_opt_sym'])} \approx {r_opt:.6f}\text{{ cm}} \\ "
                rf"h^* &= {sp.latex(sym['h_opt_sym'])} \approx {h_opt:.6f}\text{{ cm}} \\ "
                rf"\lambda^* &= {sp.latex(sym['lam_opt_sym'])} \approx {lam_opt:.6f}\text{{ cm}}^{{-1}} \\ "
                rf"A_{{\min}} &= {sp.latex(sym['area_min_sym'])} \approx {area_min:.6f}\text{{ cm}}^2"
                r"\end{aligned}"
            ),
        },
        {
            "step_number": 7,
            "title": "Second-Derivative Test (Strict Minimum)",
            "explanation": (
                "Eliminating h via h = V0/(πr²) yields A(r). Confirming A''(r*) > 0 guarantees "
                "that (r*, h*) is a strict global minimum."
            ),
            "latex": (
                rf"A(r) = {sp.latex(sym['area_1d_sym'])}, \qquad "
                rf"A''(r^*) = {sp.latex(sym['d2A_at_opt_sym'])} \approx {d2A_at_opt:.4f} > 0"
            ),
        },
    ]

    return {
        "v0": v0,
        "k": k_val,
        "r_opt": r_opt,
        "h_opt": h_opt,
        "d_opt": d_opt,
        "lambda_opt": lam_opt,
        "area_min": area_min,
        "h_over_d_opt": h_opt / d_opt,
        "second_derivative_at_opt": d2A_at_opt,
        "is_strict_minimum": d2A_at_opt > 0,
        "symbolic_r_latex": sp.latex(sym["r_opt_sym"]),
        "symbolic_h_latex": sp.latex(sym["h_opt_sym"]),
        "symbolic_lambda_latex": sp.latex(sym["lam_opt_sym"]),
        "symbolic_area_latex": sp.latex(sym["area_min_sym"]),
        "steps": steps,
    }


# ---------------------------------------------------------------------------
# 2. Numerical Verification via SciPy SLSQP
# ---------------------------------------------------------------------------

def verify_numerically(
    v0: float,
    tolerance: float = 1e-4,
    k_val: float = 1.0,
    starting_points: Optional[List[Tuple[str, float, float]]] = None,
) -> Dict:
    """
    Independently verify the SymPy optimum by running SciPy's SLSQP constrained
    optimizer from 6 diverse starting points with equality constraint pi*r^2*h - V0 = 0.
    """
    v0 = float(v0)
    k_val = float(k_val)
    tolerance = float(tolerance)
    analytical = solve_lagrange(v0, k_val=k_val)

    # Nondimensionalize r = L*u, h = L*v with L = V0^(1/3) so the equality
    # constraint pi*u^2*v - 1 = 0 and objective are O(1) for every volume V0.
    length_scale = v0 ** (1.0 / 3.0)
    area_scale = length_scale ** 2

    def objective(x: np.ndarray) -> float:
        r_val, h_val = x
        return float(2.0 * np.pi * r_val * h_val + k_val * 2.0 * np.pi * (r_val ** 2))

    def objective_dimless(u_vec: np.ndarray) -> float:
        u, v = u_vec
        return float(2.0 * np.pi * u * v + k_val * 2.0 * np.pi * (u ** 2))

    def objective_dimless_jac(u_vec: np.ndarray) -> np.ndarray:
        u, v = u_vec
        return np.array(
            [
                2.0 * np.pi * v + k_val * 4.0 * np.pi * u,
                2.0 * np.pi * u,
            ],
            dtype=float,
        )

    def volume_constraint(x: np.ndarray) -> float:
        r_val, h_val = x
        return float(np.pi * (r_val ** 2) * h_val - v0)

    def volume_constraint_dimless(u_vec: np.ndarray) -> float:
        u, v = u_vec
        return float(np.pi * (u ** 2) * v - 1.0)

    def volume_constraint_dimless_jac(u_vec: np.ndarray) -> np.ndarray:
        u, v = u_vec
        return np.array(
            [
                2.0 * np.pi * u * v,
                np.pi * (u ** 2),
            ],
            dtype=float,
        )

    if starting_points is None:
        scale = (v0 / 355.0) ** (1.0 / 3.0)
        starting_points = [
            ("Tall & Narrow", 1.5 * scale, 50.0 * scale),
            ("Short & Wide", 8.0 * scale, 1.8 * scale),
            ("Small Guess", 1.0 * scale, 2.0 * scale),
            ("Large Guess", 12.0 * scale, 25.0 * scale),
            ("Real Soda Can", 3.3 * scale, 12.2 * scale),
            ("Near Optimum", 0.9 * analytical["r_opt"], 1.15 * analytical["h_opt"]),
        ]

    runs = []
    bounds = [(1e-4, None), (1e-4, None)]
    constraints = [
        {"type": "eq", "fun": volume_constraint_dimless, "jac": volume_constraint_dimless_jac}
    ]

    for label, r0, h0 in starting_points:
        u0 = np.array([r0 / length_scale, h0 / length_scale], dtype=float)
        res = minimize(
            objective_dimless,
            x0=u0,
            method="SLSQP",
            jac=objective_dimless_jac,
            bounds=bounds,
            constraints=constraints,
            options={"ftol": 1e-13, "maxiter": 500},
        )
        total_nit = int(res.nit)
        # If SLSQP's BFGS approximation stalled early on the curved manifold,
        # one warm-started SLSQP polish resets the Hessian cleanly to I.
        for _ in range(2):
            gf = objective_dimless_jac(res.x)
            gg = volume_constraint_dimless_jac(res.x)
            kkt_gap = abs(gf[0] / gg[0] - gf[1] / gg[1]) if abs(gg[0]) > 1e-12 and abs(gg[1]) > 1e-12 else 1.0
            if kkt_gap < 1e-8 and abs(volume_constraint_dimless(res.x)) < 1e-10:
                break
            res = minimize(
                objective_dimless,
                x0=res.x,
                method="SLSQP",
                jac=objective_dimless_jac,
                bounds=bounds,
                constraints=constraints,
                options={"ftol": 1e-14, "maxiter": 500},
            )
            total_nit += int(res.nit)

        r_num = float(res.x[0] * length_scale)
        h_num = float(res.x[1] * length_scale)
        x_phys = np.array([r_num, h_num], dtype=float)
        area_num = float(objective(x_phys))
        diff_r = abs(r_num - analytical["r_opt"])
        diff_h = abs(h_num - analytical["h_opt"])
        diff_area = abs(area_num - analytical["area_min"])
        residual = abs(volume_constraint(x_phys))
        passed = bool(
            res.success
            and diff_r <= tolerance
            and diff_h <= tolerance
            and diff_area <= tolerance
        )
        runs.append(
            {
                "label": label,
                "method": "SciPy SLSQP",
                "start_r": round(float(r0), 4),
                "start_h": round(float(h0), 4),
                "r_num": r_num,
                "h_num": h_num,
                "area_num": area_num,
                "diff_r": diff_r,
                "diff_h": diff_h,
                "diff_area": diff_area,
                "constraint_residual": residual,
                "iterations": total_nit,
                "success": bool(res.success),
                "passed": passed,
            }
        )

    return {
        "v0": v0,
        "k": k_val,
        "tolerance": tolerance,
        "analytical_r": analytical["r_opt"],
        "analytical_h": analytical["h_opt"],
        "analytical_area": analytical["area_min"],
        "all_passed": all(r["passed"] for r in runs),
        "runs": runs,
    }


# ---------------------------------------------------------------------------
# 3. Interactive Visualization Data Generators
# ---------------------------------------------------------------------------

def generate_visualizations(v0: float, k_val: float = 1.0) -> Dict:
    """
    Build numerical arrays for all four Plotly visualizations:
      1. Contour plot of f(r, h) with constraint curve g(r, h) = V0 and optimum.
      2. Gradient vectors grad(f) and grad(g) at (r*, h*) showing collinearity.
      3. One-variable plot A(r) after eliminating h with minimum marked.
      4. 3D surface f(r, h) with the constraint curve lifted onto it.
    """
    v0 = float(v0)
    k_val = float(k_val)
    sol = solve_lagrange(v0, k_val=k_val)
    r_opt = sol["r_opt"]
    h_opt = sol["h_opt"]
    lam_opt = sol["lambda_opt"]
    area_min = sol["area_min"]

    r_min = max(0.35 * r_opt, 0.25)
    r_max = 2.1 * r_opt
    h_min = max(0.25 * h_opt, 0.25)
    h_max = 2.3 * h_opt

    # 1. Contour grid
    r_grid = np.linspace(r_min, r_max, 65)
    h_grid = np.linspace(h_min, h_max, 65)
    R, H = np.meshgrid(r_grid, h_grid)
    Z_contour = 2.0 * np.pi * R * H + k_val * 2.0 * np.pi * (R ** 2)

    # Constraint curve h = V0 / (pi * r^2) clipped to plot window
    r_curve_dense = np.linspace(r_min, r_max, 220)
    h_curve_dense = v0 / (np.pi * (r_curve_dense ** 2))
    mask = (h_curve_dense >= h_min) & (h_curve_dense <= h_max)
    r_constraint = r_curve_dense[mask]
    h_constraint = h_curve_dense[mask]
    area_constraint = (
        2.0 * np.pi * r_constraint * h_constraint
        + k_val * 2.0 * np.pi * (r_constraint ** 2)
    )

    # 2. Gradient vectors at (r*, h*) evaluated from SymPy partial derivatives
    weighted = not np.isclose(k_val, 1.0, rtol=0.0, atol=1e-12)
    sym = _derive_lagrange_symbolically(weighted=weighted)
    subs_pt = {sym["r"]: r_opt, sym["h"]: h_opt}
    if weighted:
        subs_pt[sym["k"]] = k_val

    grad_f = [
        float(sym["df_dr"].subs(subs_pt).evalf()),
        float(sym["df_dh"].subs(subs_pt).evalf()),
    ]
    grad_g = [
        float(sym["dg_dr"].subs(subs_pt).evalf()),
        float(sym["dg_dh"].subs(subs_pt).evalf()),
    ]
    lam_grad_g = [lam_opt * grad_g[0], lam_opt * grad_g[1]]

    norm_f = float(np.linalg.norm(grad_f))
    norm_g = float(np.linalg.norm(grad_g))
    cos_sim = float(np.dot(grad_f, grad_g) / (norm_f * norm_g))
    angle_deg = float(np.degrees(np.arccos(np.clip(cos_sim, -1.0, 1.0))))

    # 3. One-variable curve A(r)
    r_1d = np.linspace(max(0.4 * r_opt, 0.2), 2.2 * r_opt, 180)
    area_1d = k_val * 2.0 * np.pi * (r_1d ** 2) + (2.0 * v0) / r_1d

    # 4. 3D Surface grid
    r_3d = np.linspace(r_min, r_max, 36)
    h_3d = np.linspace(h_min, h_max, 36)
    R3, H3 = np.meshgrid(r_3d, h_3d)
    Z_3d = 2.0 * np.pi * R3 * H3 + k_val * 2.0 * np.pi * (R3 ** 2)

    return {
        "v0": v0,
        "k": k_val,
        "optimum": {
            "r": r_opt,
            "h": h_opt,
            "area": area_min,
            "lambda": lam_opt,
        },
        "contour": {
            "r": r_grid.tolist(),
            "h": h_grid.tolist(),
            "z": Z_contour.tolist(),
            "constraint_r": r_constraint.tolist(),
            "constraint_h": h_constraint.tolist(),
        },
        "gradients": {
            "r_opt": r_opt,
            "h_opt": h_opt,
            "grad_f": grad_f,
            "grad_g": grad_g,
            "lambda_grad_g": lam_grad_g,
            "lambda": lam_opt,
            "cosine_similarity": cos_sim,
            "angle_degrees": angle_deg,
        },
        "one_variable": {
            "r": r_1d.tolist(),
            "area": area_1d.tolist(),
            "r_opt": r_opt,
            "area_min": area_min,
        },
        "surface_3d": {
            "r": r_3d.tolist(),
            "h": h_3d.tolist(),
            "z": Z_3d.tolist(),
            "constraint_r": r_constraint.tolist(),
            "constraint_h": h_constraint.tolist(),
            "constraint_area": area_constraint.tolist(),
        },
    }


# ---------------------------------------------------------------------------
# 4. Interpreting Lambda: Sensitivity Sweep dA_min / dV0 == lambda
# ---------------------------------------------------------------------------

def sweep_volume(
    v0: float,
    v_min: float = 100.0,
    v_max: float = 1000.0,
    num_points: int = 45,
    k_val: float = 1.0,
) -> Dict:
    """
    Sweep target volume V0 across [v_min, v_max] to verify the shadow-price /
    envelope-theorem meaning of the Lagrange multiplier:
        d(A_min) / d(V0) = lambda*(V0)
    """
    v0 = float(v0)
    v_min = float(v_min)
    v_max = float(v_max)
    k_val = float(k_val)
    num_points = int(num_points)

    lo = min(v_min, max(10.0, 0.5 * v0))
    hi = max(v_max, 1.3 * v0)

    volumes = np.linspace(lo, hi, num_points)
    areas = []
    lambdas = []
    for vol in volumes:
        s = solve_lagrange(float(vol), k_val=k_val)
        areas.append(s["area_min"])
        lambdas.append(s["lambda_opt"])

    areas_arr = np.array(areas, dtype=float)
    numerical_slopes = np.gradient(areas_arr, volumes)

    # Central finite difference right at the selected V0
    dv = max(1e-3, 1e-4 * v0)
    s_center = solve_lagrange(v0, k_val=k_val)
    s_plus = solve_lagrange(v0 + dv, k_val=k_val)
    s_minus = solve_lagrange(v0 - dv, k_val=k_val)
    dA_dV_at_v0 = (s_plus["area_min"] - s_minus["area_min"]) / (2.0 * dv)
    abs_err = abs(dA_dV_at_v0 - s_center["lambda_opt"])
    rel_err = abs_err / abs(s_center["lambda_opt"]) if s_center["lambda_opt"] != 0 else 0.0

    return {
        "v0": v0,
        "k": k_val,
        "area_min_at_v0": s_center["area_min"],
        "lambda_at_v0": s_center["lambda_opt"],
        "numerical_slope_at_v0": float(dA_dV_at_v0),
        "abs_error": float(abs_err),
        "rel_error": float(rel_err),
        "delta_v_used": float(dv),
        "volumes": volumes.tolist(),
        "areas": areas,
        "lambdas": lambdas,
        "numerical_slopes": numerical_slopes.tolist(),
    }


# ---------------------------------------------------------------------------
# 5. Weighted Cost Extension Sweep
# ---------------------------------------------------------------------------

def sweep_weight(
    v0: float,
    k_val: float = 1.0,
    k_min: float = 0.25,
    k_max: float = 4.0,
    num_points: int = 35,
) -> Dict:
    """
    Sweep the top/bottom cost weight k in f(r, h) = 2*pi*r*h + k*2*pi*r^2
    and return both the current SymPy solution and curves across k.
    """
    v0 = float(v0)
    k_val = float(k_val)
    current = solve_lagrange(v0, k_val=k_val)
    k_values = np.linspace(float(k_min), float(k_max), int(num_points))
    r_vals, h_vals, cost_vals, ratio_vals = [], [], [], []
    for kv in k_values:
        s = solve_lagrange(v0, k_val=float(kv))
        r_vals.append(s["r_opt"])
        h_vals.append(s["h_opt"])
        cost_vals.append(s["area_min"])
        ratio_vals.append(s["h_over_d_opt"])

    return {
        "v0": v0,
        "k": k_val,
        "current": current,
        "sweep": {
            "k": k_values.tolist(),
            "r_opt": r_vals,
            "h_opt": h_vals,
            "cost_min": cost_vals,
            "h_over_d": ratio_vals,
        },
    }


# ---------------------------------------------------------------------------
# 6. Real Can Comparison
# ---------------------------------------------------------------------------

def analyze_real_cans(cans: List[Dict]) -> List[Dict]:
    """
    Compare a list of real-world cans against the SymPy optimal cylinder
    for each can's stated volume.
    """
    results = []
    for can in cans:
        name = str(can["name"])
        d = float(can["diameter_cm"])
        h = float(can["height_cm"])
        vol = float(can["stated_volume_ml"])
        r = d / 2.0
        actual_area = float(2.0 * np.pi * (r ** 2) + 2.0 * np.pi * r * h)
        geom_vol = float(np.pi * (r ** 2) * h)
        opt_stated = solve_lagrange(vol, k_val=1.0)
        opt_geom = solve_lagrange(geom_vol, k_val=1.0)
        opt_area_stated = opt_stated["area_min"]
        opt_area_geom = opt_geom["area_min"]
        excess_stated = ((actual_area - opt_area_stated) / opt_area_stated) * 100.0
        excess_geom = ((actual_area - opt_area_geom) / opt_area_geom) * 100.0
        results.append(
            {
                "id": can.get("id"),
                "name": name,
                "diameter_cm": d,
                "radius_cm": r,
                "height_cm": h,
                "stated_volume_ml": vol,
                "geometric_volume_cm3": geom_vol,
                "h_over_d": h / d,
                "optimal_h_over_d": opt_stated["h_over_d_opt"],
                "actual_area_cm2": actual_area,
                "optimal_area_geom_cm2": opt_area_geom,
                "percent_excess_geom": float(excess_geom),
                "optimal_area_cm2": opt_area_stated,
                "optimal_r_cm": opt_stated["r_opt"],
                "optimal_h_cm": opt_stated["h_opt"],
                "percent_excess": float(excess_stated),
            }
        )
    return results


# ---------------------------------------------------------------------------
# 7. Feature 1: Multi-Shape Comparison (SymPy Lagrange Multipliers)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _derive_box_closed_symbolically() -> Dict[str, sp.Expr]:
    """
    Derive the minimum-surface-area closed rectangular box for fixed volume V0
    using 3-variable Lagrange multipliers:
        f(x, y, z) = 2*(x*y + y*z + x*z)
        g(x, y, z) = x*y*z = V0
    """
    x, y, z, V0 = sp.symbols("x y z V_0", positive=True, real=True)
    lam = sp.symbols("lambda", real=True)

    f_expr = 2 * (x * y + y * z + x * z)
    g_expr = x * y * z

    df_dx, df_dy, df_dz = sp.diff(f_expr, x), sp.diff(f_expr, y), sp.diff(f_expr, z)
    dg_dx, dg_dy, dg_dz = sp.diff(g_expr, x), sp.diff(g_expr, y), sp.diff(g_expr, z)

    eq1 = sp.Eq(df_dx, lam * dg_dx)
    eq2 = sp.Eq(df_dy, lam * dg_dy)
    eq3 = sp.Eq(df_dz, lam * dg_dz)
    eq4 = sp.Eq(g_expr, V0)

    # Solve eq1, eq2, eq3 for lambda and equate to obtain x = y = z
    lam_from_1 = sp.simplify(sp.solve(eq1, lam)[0])
    lam_from_2 = sp.simplify(sp.solve(eq2, lam)[0])
    lam_from_3 = sp.simplify(sp.solve(eq3, lam)[0])

    y_in_x = sp.simplify(sp.solve(sp.Eq(lam_from_1, lam_from_2), y)[0])
    z_in_x = sp.simplify(sp.solve(sp.Eq(lam_from_1, lam_from_3), z)[0])

    eq4_in_x = sp.simplify(eq4.subs({y: y_in_x, z: z_in_x}))
    x_opt_sym = sp.simplify(sp.solve(eq4_in_x, x)[0])
    y_opt_sym = sp.simplify(y_in_x.subs(x, x_opt_sym))
    z_opt_sym = sp.simplify(z_in_x.subs(x, x_opt_sym))
    lam_opt_sym = sp.simplify(lam_from_1.subs({x: x_opt_sym, y: y_opt_sym, z: z_opt_sym}))
    area_min_sym = sp.simplify(f_expr.subs({x: x_opt_sym, y: y_opt_sym, z: z_opt_sym}))

    return {
        "x": x, "y": y, "z": z, "V0": V0, "lam": lam,
        "f_expr": f_expr, "g_expr": g_expr,
        "df_dx": df_dx, "df_dy": df_dy, "df_dz": df_dz,
        "dg_dx": dg_dx, "dg_dy": dg_dy, "dg_dz": dg_dz,
        "eq1": eq1, "eq2": eq2, "eq3": eq3, "eq4": eq4,
        "lam_from_1": lam_from_1, "lam_from_2": lam_from_2, "lam_from_3": lam_from_3,
        "y_in_x": y_in_x, "z_in_x": z_in_x,
        "x_opt_sym": x_opt_sym, "y_opt_sym": y_opt_sym, "z_opt_sym": z_opt_sym,
        "lam_opt_sym": lam_opt_sym, "area_min_sym": area_min_sym,
    }


@lru_cache(maxsize=1)
def _derive_sphere_symbolically() -> Dict[str, sp.Expr]:
    """
    For a sphere, g(r) = (4/3)*pi*r^3 = V0 has only one variable r, so the volume
    constraint alone fixes r uniquely with no free optimization variables.
    """
    r, V0 = sp.symbols("r V_0", positive=True, real=True)
    f_expr = 4 * sp.pi * r**2
    g_expr = sp.Rational(4, 3) * sp.pi * r**3
    eq_vol = sp.Eq(g_expr, V0)
    r_opt_sym = sp.simplify(sp.solve(eq_vol, r)[0])
    area_min_sym = sp.simplify(f_expr.subs(r, r_opt_sym))
    dA_dV_sym = sp.simplify(sp.diff(area_min_sym, V0))
    return {
        "r": r, "V0": V0,
        "f_expr": f_expr, "g_expr": g_expr, "eq_vol": eq_vol,
        "r_opt_sym": r_opt_sym, "area_min_sym": area_min_sym, "dA_dV_sym": dA_dV_sym,
    }


@lru_cache(maxsize=1)
def _derive_cylinder_open_symbolically() -> Dict[str, sp.Expr]:
    """
    Derive the minimum-surface-area open-top cylinder for fixed volume V0:
        f(r, h) = pi*r^2 + 2*pi*r*h
        g(r, h) = pi*r^2*h = V0
    """
    r, h, V0 = sp.symbols("r h V_0", positive=True, real=True)
    lam = sp.symbols("lambda", real=True)

    f_expr = sp.pi * r**2 + 2 * sp.pi * r * h
    g_expr = sp.pi * r**2 * h

    df_dr, df_dh = sp.diff(f_expr, r), sp.diff(f_expr, h)
    dg_dr, dg_dh = sp.diff(g_expr, r), sp.diff(g_expr, h)

    eq1 = sp.Eq(df_dr, lam * dg_dr)
    eq2 = sp.Eq(df_dh, lam * dg_dh)
    eq3 = sp.Eq(g_expr, V0)

    lam_from_eq2 = sp.simplify(sp.solve(eq2, lam)[0])
    eq1_no_lam = sp.simplify(eq1.subs(lam, lam_from_eq2))
    h_in_terms_of_r = sp.simplify(sp.solve(eq1_no_lam, h)[0])
    eq3_in_r = sp.simplify(eq3.subs(h, h_in_terms_of_r))
    r_opt_sym = sp.simplify(sp.solve(eq3_in_r, r)[0])
    h_opt_sym = sp.simplify(h_in_terms_of_r.subs(r, r_opt_sym))
    lam_opt_sym = sp.simplify(lam_from_eq2.subs(r, r_opt_sym))
    area_min_sym = sp.simplify(f_expr.subs({r: r_opt_sym, h: h_opt_sym}))

    return {
        "r": r, "h": h, "V0": V0, "lam": lam,
        "f_expr": f_expr, "g_expr": g_expr,
        "df_dr": df_dr, "df_dh": df_dh, "dg_dr": dg_dr, "dg_dh": dg_dh,
        "eq1": eq1, "eq2": eq2, "eq3": eq3,
        "lam_from_eq2": lam_from_eq2, "eq1_no_lam": eq1_no_lam,
        "h_in_terms_of_r": h_in_terms_of_r,
        "r_opt_sym": r_opt_sym, "h_opt_sym": h_opt_sym,
        "lam_opt_sym": lam_opt_sym, "area_min_sym": area_min_sym,
    }


@lru_cache(maxsize=1)
def _derive_box_open_square_symbolically() -> Dict[str, sp.Expr]:
    """
    Derive the minimum-surface-area open-top box with a square base (x by x, height h):
        f(x, h) = x^2 + 4*x*h
        g(x, h) = x^2*h = V0
    """
    x, h, V0 = sp.symbols("x h V_0", positive=True, real=True)
    lam = sp.symbols("lambda", real=True)

    f_expr = x**2 + 4 * x * h
    g_expr = x**2 * h

    df_dx, df_dh = sp.diff(f_expr, x), sp.diff(f_expr, h)
    dg_dx, dg_dh = sp.diff(g_expr, x), sp.diff(g_expr, h)

    eq1 = sp.Eq(df_dx, lam * dg_dx)
    eq2 = sp.Eq(df_dh, lam * dg_dh)
    eq3 = sp.Eq(g_expr, V0)

    lam_from_eq2 = sp.simplify(sp.solve(eq2, lam)[0])
    eq1_no_lam = sp.simplify(eq1.subs(lam, lam_from_eq2))
    h_in_terms_of_x = sp.simplify(sp.solve(eq1_no_lam, h)[0])
    eq3_in_x = sp.simplify(eq3.subs(h, h_in_terms_of_x))
    x_opt_sym = sp.simplify(sp.solve(eq3_in_x, x)[0])
    h_opt_sym = sp.simplify(h_in_terms_of_x.subs(x, x_opt_sym))
    lam_opt_sym = sp.simplify(lam_from_eq2.subs(x, x_opt_sym))
    area_min_sym = sp.simplify(f_expr.subs({x: x_opt_sym, h: h_opt_sym}))

    return {
        "x": x, "h": h, "V0": V0, "lam": lam,
        "f_expr": f_expr, "g_expr": g_expr,
        "df_dx": df_dx, "df_dh": df_dh, "dg_dx": dg_dx, "dg_dh": dg_dh,
        "eq1": eq1, "eq2": eq2, "eq3": eq3,
        "lam_from_eq2": lam_from_eq2, "eq1_no_lam": eq1_no_lam,
        "h_in_terms_of_x": h_in_terms_of_x,
        "x_opt_sym": x_opt_sym, "h_opt_sym": h_opt_sym,
        "lam_opt_sym": lam_opt_sym, "area_min_sym": area_min_sym,
    }


def compare_shapes(v0: float) -> Dict:
    """
    Solve and compare surface-area-minimizing shapes for a shared volume V0 (cm^3),
    strictly separated into two fair groups:
      - Closed shapes: Sphere, Closed Cylinder, Closed Box (x, y, z)
      - Open-top shapes: Open-Top Cylinder, Open-Top Square-Base Box
    """
    v0 = float(v0)
    if v0 <= 0:
        raise ValueError("Volume V0 must be strictly positive.")

    v0_sp = sp.Float(v0, 30)

    # 1. Sphere (closed)
    sph = _derive_sphere_symbolically()
    sph_r = float(sph["r_opt_sym"].subs(sph["V0"], v0_sp).evalf(20))
    sph_area = float(sph["area_min_sym"].subs(sph["V0"], v0_sp).evalf(20))
    sph_dA_dV = float(sph["dA_dV_sym"].subs(sph["V0"], v0_sp).evalf(20))
    sphere_entry = {
        "id": "sphere",
        "name": "Sphere",
        "group": "closed",
        "dimensions_summary": f"r = {sph_r:.4f} cm (d = {2.0 * sph_r:.4f} cm)",
        "dimensions": {"r": sph_r, "d": 2.0 * sph_r},
        "area_min": sph_area,
        "ratio_to_sphere": 1.0,
        "optimal_ratios": "No free variable (r fixed by V₀)",
        "lambda_opt": sph_dA_dV,
        "steps": [
            {
                "step_number": 1,
                "title": "Why There Is No Free Variable to Optimize",
                "explanation": (
                    "A sphere is determined by a single parameter: its radius r. Fixing the volume "
                    "V0 completely determines r, leaving zero degrees of freedom for Lagrange multipliers."
                ),
                "latex": rf"f(r) = {sp.latex(sph['f_expr'])}, \qquad g(r) = {sp.latex(sph['eq_vol'])}",
            },
            {
                "step_number": 2,
                "title": f"Solve Volume Equation for r and Surface Area (V₀ = {v0:g} cm³)",
                "explanation": (
                    "SymPy solves the volume constraint directly for the positive real radius r "
                    "and substitutes into 4πr²."
                ),
                "latex": (
                    r"\begin{aligned}"
                    rf"r &= {sp.latex(sph['r_opt_sym'])} \approx {sph_r:.6f}\text{{ cm}} \\ "
                    rf"A &= {sp.latex(sph['area_min_sym'])} \approx {sph_area:.6f}\text{{ cm}}^2"
                    r"\end{aligned}"
                ),
            },
        ],
    }

    # 2. Closed Cylinder (reuse existing SymPy solver)
    cyl = solve_lagrange(v0, k_val=1.0)
    cyl_closed_entry = {
        "id": "closed_cylinder",
        "name": "Closed Cylinder",
        "group": "closed",
        "dimensions_summary": f"r = {cyl['r_opt']:.4f} cm, h = {cyl['h_opt']:.4f} cm",
        "dimensions": {"r": cyl["r_opt"], "h": cyl["h_opt"], "d": cyl["d_opt"]},
        "area_min": cyl["area_min"],
        "ratio_to_sphere": cyl["area_min"] / sph_area,
        "optimal_ratios": f"h/r = {cyl['h_opt'] / cyl['r_opt']:.4f} (h/d = 1)",
        "lambda_opt": cyl["lambda_opt"],
        "steps": cyl["steps"],
    }

    # 3. Closed Box (3-variable Lagrange: x, y, z)
    box = _derive_box_closed_symbolically()
    bx = float(box["x_opt_sym"].subs(box["V0"], v0_sp).evalf(20))
    by = float(box["y_opt_sym"].subs(box["V0"], v0_sp).evalf(20))
    bz = float(box["z_opt_sym"].subs(box["V0"], v0_sp).evalf(20))
    b_lam = float(box["lam_opt_sym"].subs(box["V0"], v0_sp).evalf(20))
    b_area = float(box["area_min_sym"].subs(box["V0"], v0_sp).evalf(20))
    box_closed_entry = {
        "id": "closed_box",
        "name": "Closed Box (3D Cube)",
        "group": "closed",
        "dimensions_summary": f"x = y = z = {bx:.4f} cm",
        "dimensions": {"x": bx, "y": by, "z": bz},
        "area_min": b_area,
        "ratio_to_sphere": b_area / sph_area,
        "optimal_ratios": f"x/y = {bx / by:.4f}, z/x = {bz / bx:.4f} (cube)",
        "lambda_opt": b_lam,
        "steps": [
            {
                "step_number": 1,
                "title": "3-Variable Objective & Volume Constraint",
                "explanation": (
                    "Minimize the total surface area of a closed rectangular box with three free "
                    "dimensions x, y, z > 0 subject to fixed volume xyz = V0."
                ),
                "latex": rf"f(x, y, z) = {sp.latex(box['f_expr'])}, \qquad g(x, y, z) = {sp.latex(box['eq4'])}",
            },
            {
                "step_number": 2,
                "title": "Three Gradient Equations (∇f = λ∇g)",
                "explanation": (
                    "Equating each partial derivative of f with λ times the corresponding partial "
                    "derivative of g gives three equations plus the volume constraint."
                ),
                "latex": (
                    r"\begin{aligned}"
                    rf"(1)\quad & {sp.latex(box['eq1'])} \\ "
                    rf"(2)\quad & {sp.latex(box['eq2'])} \\ "
                    rf"(3)\quad & {sp.latex(box['eq3'])} \\ "
                    rf"(4)\quad & {sp.latex(box['eq4'])}"
                    r"\end{aligned}"
                ),
            },
            {
                "step_number": 3,
                "title": "Eliminate λ → Symmetry Gives a Cube",
                "explanation": (
                    "Solving (1), (2), and (3) for λ and setting them equal forces x = y = z."
                ),
                "latex": (
                    rf"\lambda = {sp.latex(box['lam_from_1'])} = {sp.latex(box['lam_from_2'])} "
                    rf"= {sp.latex(box['lam_from_3'])} \quad\Longrightarrow\quad "
                    rf"y = {sp.latex(box['y_in_x'])},\; z = {sp.latex(box['z_in_x'])}"
                ),
            },
            {
                "step_number": 4,
                "title": f"Closed-Form & Numeric Solution (V₀ = {v0:g} cm³)",
                "explanation": (
                    "Substituting y = x and z = x into xyz = V0 yields the cube edge length, "
                    "multiplier λ*, and minimum surface area."
                ),
                "latex": (
                    r"\begin{aligned}"
                    rf"x^* = y^* = z^* &= {sp.latex(box['x_opt_sym'])} \approx {bx:.6f}\text{{ cm}} \\ "
                    rf"\lambda^* &= {sp.latex(box['lam_opt_sym'])} \approx {b_lam:.6f}\text{{ cm}}^{{-1}} \\ "
                    rf"A_{{\min}} &= {sp.latex(box['area_min_sym'])} \approx {b_area:.6f}\text{{ cm}}^2"
                    r"\end{aligned}"
                ),
            },
        ],
    }

    # 4. Open-Top Cylinder
    oc = _derive_cylinder_open_symbolically()
    oc_r = float(oc["r_opt_sym"].subs(oc["V0"], v0_sp).evalf(20))
    oc_h = float(oc["h_opt_sym"].subs(oc["V0"], v0_sp).evalf(20))
    oc_lam = float(oc["lam_opt_sym"].subs(oc["V0"], v0_sp).evalf(20))
    oc_area = float(oc["area_min_sym"].subs(oc["V0"], v0_sp).evalf(20))
    open_cyl_entry = {
        "id": "open_cylinder",
        "name": "Open-Top Cylinder",
        "group": "open_top",
        "dimensions_summary": f"r = {oc_r:.4f} cm, h = {oc_h:.4f} cm",
        "dimensions": {"r": oc_r, "h": oc_h, "d": 2.0 * oc_r},
        "area_min": oc_area,
        "ratio_to_sphere": None,
        "optimal_ratios": f"h/r = {oc_h / oc_r:.4f} (h/d = 0.5)",
        "lambda_opt": oc_lam,
        "steps": [
            {
                "step_number": 1,
                "title": "Open-Top Objective & Constraint",
                "explanation": (
                    "With no top lid, only one circular base (πr²) plus the side wall (2πrh) "
                    "contributes to surface area."
                ),
                "latex": rf"f(r, h) = {sp.latex(oc['f_expr'])}, \qquad g(r, h) = {sp.latex(oc['eq3'])}",
            },
            {
                "step_number": 2,
                "title": "Lagrange System (∇f = λ∇g)",
                "explanation": "Differentiate f and g with respect to r and h and form the three equations.",
                "latex": (
                    r"\begin{aligned}"
                    rf"(1)\quad & {sp.latex(oc['eq1'])} \\ "
                    rf"(2)\quad & {sp.latex(oc['eq2'])} \\ "
                    rf"(3)\quad & {sp.latex(oc['eq3'])}"
                    r"\end{aligned}"
                ),
            },
            {
                "step_number": 3,
                "title": "Eliminate λ → Height Equals Radius (h = r)",
                "explanation": (
                    "Solving (2) gives λ = 2/r. Substituting into (1) shows that removing the top "
                    "lid halves the optimal height-to-radius ratio from h = 2r to h = r."
                ),
                "latex": (
                    rf"\lambda = {sp.latex(oc['lam_from_eq2'])} \quad\Longrightarrow\quad "
                    rf"{sp.latex(oc['eq1_no_lam'])} \quad\Longrightarrow\quad h = {sp.latex(oc['h_in_terms_of_r'])}"
                ),
            },
            {
                "step_number": 4,
                "title": f"Closed-Form & Numeric Solution (V₀ = {v0:g} cm³)",
                "explanation": "Substitute h = r into πr²h = V0 to solve for r*, h*, λ*, and A_min.",
                "latex": (
                    r"\begin{aligned}"
                    rf"r^* = h^* &= {sp.latex(oc['r_opt_sym'])} \approx {oc_r:.6f}\text{{ cm}} \\ "
                    rf"\lambda^* &= {sp.latex(oc['lam_opt_sym'])} \approx {oc_lam:.6f}\text{{ cm}}^{{-1}} \\ "
                    rf"A_{{\min}} &= {sp.latex(oc['area_min_sym'])} \approx {oc_area:.6f}\text{{ cm}}^2"
                    r"\end{aligned}"
                ),
            },
        ],
    }

    # 5. Open-Top Box (Square Base)
    ob = _derive_box_open_square_symbolically()
    ob_x = float(ob["x_opt_sym"].subs(ob["V0"], v0_sp).evalf(20))
    ob_h = float(ob["h_opt_sym"].subs(ob["V0"], v0_sp).evalf(20))
    ob_lam = float(ob["lam_opt_sym"].subs(ob["V0"], v0_sp).evalf(20))
    ob_area = float(ob["area_min_sym"].subs(ob["V0"], v0_sp).evalf(20))
    open_box_entry = {
        "id": "open_box_square",
        "name": "Open-Top Box (Square Base)",
        "group": "open_top",
        "dimensions_summary": f"x = {ob_x:.4f} cm, h = {ob_h:.4f} cm",
        "dimensions": {"x": ob_x, "h": ob_h},
        "area_min": ob_area,
        "ratio_to_sphere": None,
        "optimal_ratios": f"h/x = {ob_h / ob_x:.4f} (half-cube)",
        "lambda_opt": ob_lam,
        "steps": [
            {
                "step_number": 1,
                "title": "Open-Top Square-Base Objective & Constraint",
                "explanation": (
                    "One square base (x²) plus four side walls (4xh) enclose fixed volume x²h = V0."
                ),
                "latex": rf"f(x, h) = {sp.latex(ob['f_expr'])}, \qquad g(x, h) = {sp.latex(ob['eq3'])}",
            },
            {
                "step_number": 2,
                "title": "Lagrange System (∇f = λ∇g)",
                "explanation": "Set partial derivatives with respect to x and h proportional via λ.",
                "latex": (
                    r"\begin{aligned}"
                    rf"(1)\quad & {sp.latex(ob['eq1'])} \\ "
                    rf"(2)\quad & {sp.latex(ob['eq2'])} \\ "
                    rf"(3)\quad & {sp.latex(ob['eq3'])}"
                    r"\end{aligned}"
                ),
            },
            {
                "step_number": 3,
                "title": "Eliminate λ → Half-Cube Proportions (h = x/2)",
                "explanation": "Solving (2) gives λ = 4/x; substituting into (1) gives h = x/2.",
                "latex": (
                    rf"\lambda = {sp.latex(ob['lam_from_eq2'])} \quad\Longrightarrow\quad "
                    rf"h = {sp.latex(ob['h_in_terms_of_x'])}"
                ),
            },
            {
                "step_number": 4,
                "title": f"Closed-Form & Numeric Solution (V₀ = {v0:g} cm³)",
                "explanation": "Substitute h = x/2 into x²h = V0 to obtain x*, h*, λ*, and A_min.",
                "latex": (
                    r"\begin{aligned}"
                    rf"x^* &= {sp.latex(ob['x_opt_sym'])} \approx {ob_x:.6f}\text{{ cm}} \\ "
                    rf"h^* &= {sp.latex(ob['h_opt_sym'])} \approx {ob_h:.6f}\text{{ cm}} \\ "
                    rf"\lambda^* &= {sp.latex(ob['lam_opt_sym'])} \approx {ob_lam:.6f}\text{{ cm}}^{{-1}} \\ "
                    rf"A_{{\min}} &= {sp.latex(ob['area_min_sym'])} \approx {ob_area:.6f}\text{{ cm}}^2"
                    r"\end{aligned}"
                ),
            },
        ],
    }

    return {
        "v0": v0,
        "closed": [sphere_entry, cyl_closed_entry, box_closed_entry],
        "open_top": [open_cyl_entry, open_box_entry],
    }


# ---------------------------------------------------------------------------
# JSON Dispatch Helper for Pyodide Web Worker
# ---------------------------------------------------------------------------

def dispatch_json(action: str, payload_json: str) -> str:
    """
    Single entry point called by the Pyodide Web Worker so all Python dicts/lists
    are serialized cleanly to JSON strings without JS proxy leaks.
    """
    payload = json.loads(payload_json) if payload_json else {}
    if action == "solve_lagrange":
        res = solve_lagrange(payload["v0"], payload.get("k", 1.0))
    elif action == "verify_numerically":
        res = verify_numerically(
            payload["v0"],
            payload.get("tolerance", 1e-4),
            payload.get("k", 1.0),
        )
    elif action == "generate_visualizations":
        res = generate_visualizations(payload["v0"], payload.get("k", 1.0))
    elif action == "sweep_volume":
        res = sweep_volume(
            payload["v0"],
            payload.get("v_min", 100.0),
            payload.get("v_max", 1000.0),
            payload.get("num_points", 45),
            payload.get("k", 1.0),
        )
    elif action == "sweep_weight":
        res = sweep_weight(
            payload["v0"],
            payload.get("k", 1.0),
            payload.get("k_min", 0.25),
            payload.get("k_max", 4.0),
            payload.get("num_points", 35),
        )
    elif action == "analyze_real_cans":
        res = analyze_real_cans(payload["cans"])
    elif action == "compare_shapes":
        res = compare_shapes(payload["v0"])
    else:
        raise ValueError(f"Unknown solver action: {action}")
    return json.dumps(res)
