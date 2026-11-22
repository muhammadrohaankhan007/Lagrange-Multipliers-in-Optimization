"""
Verify that the TypeScript gradient definitions in lib/gradients.ts match
SymPy's symbolic partial derivatives in lib/python/solver.py at 5 sample points.
"""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "lib" / "python"))

import solver  # noqa: E402

SAMPLE_POINTS = [
    (2.0, 28.25),
    (3.0, 12.56),
    (3.837215, 7.674430),
    (5.0, 4.52),
    (6.5, 2.67),
]


def main() -> None:
    sym = solver._derive_lagrange_symbolically(weighted=False)

    # Execute lib/gradients.ts directly in Node 24 (native TypeScript execution)
    node_code = f"""
import {{ gradF, gradG }} from './lib/gradients.ts';
const pts = {json.dumps(SAMPLE_POINTS)};
const out = pts.map(([r, h]) => ({{ r, h, gf: gradF(r, h), gg: gradG(r, h) }}));
console.log(JSON.stringify(out));
"""
    proc = subprocess.run(
        ["node", "--experimental-strip-types", "--input-type=module", "-e", node_code],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    ts_results = json.loads(proc.stdout.strip())

    print("=== Feature 2: TypeScript lib/gradients.ts vs SymPy solver.py (5 Sample Points) ===")
    max_err = 0.0
    for item in ts_results:
        r_val = float(item["r"])
        h_val = float(item["h"])
        subs = {sym["r"]: r_val, sym["h"]: h_val}

        sym_gf_r = float(sym["df_dr"].subs(subs).evalf(20))
        sym_gf_h = float(sym["df_dh"].subs(subs).evalf(20))
        sym_gg_r = float(sym["dg_dr"].subs(subs).evalf(20))
        sym_gg_h = float(sym["dg_dh"].subs(subs).evalf(20))

        err_fr = abs(item["gf"]["r"] - sym_gf_r)
        err_fh = abs(item["gf"]["h"] - sym_gf_h)
        err_gr = abs(item["gg"]["r"] - sym_gg_r)
        err_gh = abs(item["gg"]["h"] - sym_gg_h)
        point_max = max(err_fr, err_fh, err_gr, err_gh)
        max_err = max(max_err, point_max)

        print(
            f"(r={r_val:8.4f}, h={h_val:7.4f}) | "
            f"grad_f=({sym_gf_r:7.3f}, {sym_gf_h:6.3f}) | "
            f"grad_g=({sym_gg_r:7.3f}, {sym_gg_h:6.3f}) | "
            f"max|diff|={point_max:.2e}"
        )
        assert point_max < 1e-12

    print(f"Max gradient diff across all 5 points: {max_err:.2e}")
    print("GRADIENT VERIFICATION PASSED.")


if __name__ == "__main__":
    main()
