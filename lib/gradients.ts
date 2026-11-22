/**
 * Single shared TypeScript definition of f(r, h), g(r, h), and their gradients
 * grad(f) and grad(g) for responsive slider/click interaction in the Tangency Demo
 * and 3D Can tabs.
 *
 * NOTE: The optimum (r*, h*, A_min, lambda*) is NEVER computed here — it always
 * comes from the SymPy solver in the Pyodide Web Worker.
 */

export interface Vec2 {
  r: number;
  h: number;
}

export interface RadiusLimits {
  min: number;
  max: number;
  step: number;
  defaultNonOptimal: number;
}

/** Shared slider bounds for r along the constraint curve h = V0 / (pi * r^2). */
export function getConstraintRadiusLimits(rOpt: number): RadiusLimits {
  const min = Number(Math.max(0.25, 0.45 * rOpt).toFixed(3));
  const max = Number((1.85 * rOpt).toFixed(3));
  const step = Number(((max - min) / 300).toFixed(4));
  const defaultNonOptimal = Number((0.72 * rOpt).toFixed(3));
  return { min, max, step: Math.max(0.001, step), defaultNonOptimal };
}

/** Constraint height h(r) = V0 / (pi * r^2) in cm. */
export function heightOnConstraint(r: number, v0: number): number {
  return v0 / (Math.PI * r * r);
}

/** Surface area objective f(r, h) = 2*pi*r^2 + 2*pi*r*h in cm^2. */
export function surfaceArea(r: number, h: number): number {
  return 2.0 * Math.PI * r * r + 2.0 * Math.PI * r * h;
}

/** Volume constraint g(r, h) = pi*r^2*h in cm^3. */
export function cylinderVolume(r: number, h: number): number {
  return Math.PI * r * r * h;
}

/** Gradient of surface area: grad f(r, h) = <4*pi*r + 2*pi*h, 2*pi*r> (units: cm). */
export function gradF(r: number, h: number): Vec2 {
  return {
    r: 4.0 * Math.PI * r + 2.0 * Math.PI * h,
    h: 2.0 * Math.PI * r,
  };
}

/** Gradient of volume constraint: grad g(r, h) = <2*pi*r*h, pi*r^2> (units: cm^2). */
export function gradG(r: number, h: number): Vec2 {
  return {
    r: 2.0 * Math.PI * r * h,
    h: Math.PI * r * r,
  };
}

export interface TangencyMetrics {
  r: number;
  h: number;
  area: number;
  gf: Vec2;
  gg: Vec2;
  normF: number;
  normG: number;
  angleDeg: number;
  cross2D: number;
  lambdaEstimate: number;
  aligned: boolean;
}

export const ALIGNMENT_TOLERANCE_DEG = 0.5;

export function evaluateTangencyAtRadius(
  r: number,
  v0: number,
  toleranceDeg: number = ALIGNMENT_TOLERANCE_DEG
): TangencyMetrics {
  const h = heightOnConstraint(r, v0);
  const area = surfaceArea(r, h);
  const gf = gradF(r, h);
  const gg = gradG(r, h);
  const normF = Math.hypot(gf.r, gf.h);
  const normG = Math.hypot(gg.r, gg.h);
  const dot = gf.r * gg.r + gf.h * gg.h;
  const cosTheta = Math.min(1.0, Math.max(-1.0, dot / (normF * normG || 1)));
  const angleDeg = (Math.acos(cosTheta) * 180.0) / Math.PI;
  const cross2D = gf.r * gg.h - gf.h * gg.r;
  const lambdaEstimate = normG > 0 ? normF / normG : 0;

  return {
    r,
    h,
    area,
    gf,
    gg,
    normF,
    normG,
    angleDeg,
    cross2D,
    lambdaEstimate,
    aligned: angleDeg <= toleranceDeg,
  };
}
