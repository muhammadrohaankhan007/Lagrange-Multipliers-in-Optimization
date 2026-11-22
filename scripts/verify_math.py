"""
Independent correctness verification script for CanOptimizer (MTH-111).

Recomputes the exact closed-form cylinder optimum WITHOUT using solver.py:
    r      = (V0 / (2 * pi))^(1/3)
    h      = 2 * r
    A_min  = 6 * pi * r^2
    lambda = 2 / r

Then compares these independent values against lib/python/solver.py for:
  1. Standard problem across V0 = 250, 330, 355, 500, 1000 cm^3
  2. Weighted-cost extension: k = 1 matches standard result, and h/d = k for other k values
  3. Real Cans calculation against a hand-computed example (d = 6.62 cm, h = 12.27 cm, V = 355 mL)
"""

import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib" / "python"))

import solver  # noqa: E402

VOLUMES = [250.0, 330.0, 355.0, 500.0, 1000.0]
K_VALUES = [0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 4.0]


def independent_closed_form(v0: float) -> dict:
    r = (v0 / (2.0 * math.pi)) ** (1.0 / 3.0)
    h = 2.0 * r
    area = 6.0 * math.pi * (r ** 2)
    lam = 2.0 / r
    return {"r": r, "h": h, "area": area, "lambda": lam}


def main() -> None:
    print("=== 1. Independent Closed-Form vs solver.py (SymPy) ===")
    max_diffs = {"r": 0.0, "h": 0.0, "area": 0.0, "lambda": 0.0}
    for v0 in VOLUMES:
        ref = independent_closed_form(v0)
        got = solver.solve_lagrange(v0, k_val=1.0)
        dr = abs(got["r_opt"] - ref["r"])
        dh = abs(got["h_opt"] - ref["h"])
        da = abs(got["area_min"] - ref["area"])
        dl = abs(got["lambda_opt"] - ref["lambda"])
        max_diffs["r"] = max(max_diffs["r"], dr)
        max_diffs["h"] = max(max_diffs["h"], dh)
        max_diffs["area"] = max(max_diffs["area"], da)
        max_diffs["lambda"] = max(max_diffs["lambda"], dl)
        print(
            f"V0={v0:6.1f} cm^3 | "
            f"dr={dr:.2e} cm | dh={dh:.2e} cm | dA={da:.2e} cm^2 | dlam={dl:.2e} 1/cm"
        )
        assert dr < 1e-12 and dh < 1e-12 and da < 1e-11 and dl < 1e-12

    print(
        f"Max diffs across all 5 volumes: "
        f"dr={max_diffs['r']:.2e}, dh={max_diffs['h']:.2e}, "
        f"dA={max_diffs['area']:.2e}, dlam={max_diffs['lambda']:.2e}"
    )

    print("\n=== 2. Weighted-Cost Check (k=1 matches standard; h/d == k) ===")
    std_355 = solver.solve_lagrange(355.0, k_val=1.0)
    w_k1 = solver.sweep_weight(355.0, k_val=1.0)["current"]
    diff_k1_r = abs(w_k1["r_opt"] - std_355["r_opt"])
    diff_k1_h = abs(w_k1["h_opt"] - std_355["h_opt"])
    diff_k1_a = abs(w_k1["area_min"] - std_355["area_min"])
    print(
        f"k=1.0 vs standard: dr={diff_k1_r:.2e}, dh={diff_k1_h:.2e}, dA={diff_k1_a:.2e}"
    )
    assert diff_k1_r < 1e-12 and diff_k1_h < 1e-12 and diff_k1_a < 1e-12

    for k_val in K_VALUES:
        sol_k = solver.solve_lagrange(355.0, k_val=k_val)
        ratio = sol_k["h_opt"] / (2.0 * sol_k["r_opt"])
        err = abs(ratio - k_val)
        print(
            f"k={k_val:4.2f} | r*={sol_k['r_opt']:.6f} cm | h*={sol_k['h_opt']:.6f} cm | "
            f"h*/d*={ratio:.8f} | |h*/d* - k|={err:.2e}"
        )
        assert err < 1e-12

    print("\n=== 3. Real Cans Hand-Computed Verification (Shape-Only & Stated-Volume) ===")
    # Hand-computed example: 355 mL standard soda can (d = 6.62 cm, h = 12.27 cm, V = 355 mL)
    d_hand = 6.62
    h_hand = 12.27
    v_hand = 355.0
    r_hand = d_hand / 2.0  # 3.31 cm
    hd_hand = h_hand / d_hand
    geom_v_hand = math.pi * (d_hand ** 2) * h_hand / 4.0
    area_hand = 2.0 * math.pi * (r_hand ** 2) + 2.0 * math.pi * r_hand * h_hand
    # 1. Shape-only comparison (optimum for geometric volume pi*d^2*h/4)
    opt_geom_hand = independent_closed_form(geom_v_hand)["area"]
    excess_geom_hand = ((area_hand - opt_geom_hand) / opt_geom_hand) * 100.0
    # 2. Stated-volume comparison (optimum for stated volume V0)
    opt_stated_hand = independent_closed_form(v_hand)["area"]
    excess_stated_hand = ((area_hand - opt_stated_hand) / opt_stated_hand) * 100.0

    got_can = solver.analyze_real_cans(
        [
            {
                "id": "hand-check",
                "name": "355 mL Hand Check",
                "diameter_cm": d_hand,
                "height_cm": h_hand,
                "stated_volume_ml": v_hand,
            }
        ]
    )[0]

    print(
        f"Hand-computed: h/d={hd_hand:.6f}, V_geom={geom_v_hand:.4f} cm^3, "
        f"A_actual={area_hand:.6f} cm^2"
    )
    print(
        f"  1) Shape-only (Geom. V):   hand A_opt={opt_geom_hand:.6f} cm^2 (+{excess_geom_hand:.6f}%) | "
        f"solver A_opt={got_can['optimal_area_geom_cm2']:.6f} cm^2 (+{got_can['percent_excess_geom']:.6f}%)"
    )
    print(
        f"  2) Stated-volume (355 mL): hand A_opt={opt_stated_hand:.6f} cm^2 (+{excess_stated_hand:.6f}%) | "
        f"solver A_opt={got_can['optimal_area_cm2']:.6f} cm^2 (+{got_can['percent_excess']:.6f}%)"
    )
    print(
        f"Differences:   d(h/d)={abs(got_can['h_over_d'] - hd_hand):.2e}, "
        f"d(A_actual)={abs(got_can['actual_area_cm2'] - area_hand):.2e}, "
        f"d(A_opt_geom)={abs(got_can['optimal_area_geom_cm2'] - opt_geom_hand):.2e}, "
        f"d(excess_geom)={abs(got_can['percent_excess_geom'] - excess_geom_hand):.2e}%, "
        f"d(A_opt_stated)={abs(got_can['optimal_area_cm2'] - opt_stated_hand):.2e}, "
        f"d(excess_stated)={abs(got_can['percent_excess'] - excess_stated_hand):.2e}%"
    )
    assert abs(got_can["h_over_d"] - hd_hand) < 1e-12
    assert abs(got_can["actual_area_cm2"] - area_hand) < 1e-11
    assert abs(got_can["optimal_area_geom_cm2"] - opt_geom_hand) < 1e-11
    assert abs(got_can["percent_excess_geom"] - excess_geom_hand) < 1e-10
    assert abs(got_can["optimal_area_cm2"] - opt_stated_hand) < 1e-11
    assert abs(got_can["percent_excess"] - excess_stated_hand) < 1e-10

    print("\n=== 4. Feature 1: Shape Comparison Independent Closed-Form Checks ===")
    for v0 in VOLUMES:
        res = solver.compare_shapes(v0)
        closed_by_id = {s["id"]: s for s in res["closed"]}
        open_by_id = {s["id"]: s for s in res["open_top"]}

        # Independent closed-form formulas
        sph_r = (3.0 * v0 / (4.0 * math.pi)) ** (1.0 / 3.0)
        sph_a = 4.0 * math.pi * (sph_r ** 2)

        cyl_a = independent_closed_form(v0)["area"]

        box_x = v0 ** (1.0 / 3.0)
        box_a = 6.0 * (box_x ** 2)

        oc_r = (v0 / math.pi) ** (1.0 / 3.0)
        oc_a = 3.0 * math.pi * (oc_r ** 2)

        ob_x = (2.0 * v0) ** (1.0 / 3.0)
        ob_a = 3.0 * (ob_x ** 2)

        d_sph = abs(closed_by_id["sphere"]["area_min"] - sph_a)
        d_cyl = abs(closed_by_id["closed_cylinder"]["area_min"] - cyl_a)
        d_box = abs(closed_by_id["closed_box"]["area_min"] - box_a)
        d_oc = abs(open_by_id["open_cylinder"]["area_min"] - oc_a)
        d_ob = abs(open_by_id["open_box_square"]["area_min"] - ob_a)

        assert d_sph < 1e-11 and d_cyl < 1e-11 and d_box < 1e-11
        assert d_oc < 1e-11 and d_ob < 1e-11
        # Assert sphere has strictly smallest area among closed shapes
        assert (
            closed_by_id["sphere"]["area_min"]
            < closed_by_id["closed_cylinder"]["area_min"]
            < closed_by_id["closed_box"]["area_min"]
        )
        print(
            f"V0={v0:6.1f} | Sphere={closed_by_id['sphere']['area_min']:.4f} < "
            f"Cyl={closed_by_id['closed_cylinder']['area_min']:.4f} < "
            f"Cube={closed_by_id['closed_box']['area_min']:.4f} cm^2 | "
            f"OpenCyl={open_by_id['open_cylinder']['area_min']:.4f}, "
            f"OpenBox={open_by_id['open_box_square']['area_min']:.4f} cm^2 | "
            f"max|dA|={max(d_sph, d_cyl, d_box, d_oc, d_ob):.2e}"
        )

    print("\nALL INDEPENDENT CORRECTNESS CHECKS PASSED.")


if __name__ == "__main__":
    main()
