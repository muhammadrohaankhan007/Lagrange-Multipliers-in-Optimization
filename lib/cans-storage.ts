/**
 * localStorage persistence for Real Cans Comparison table,
 * shared between the main app and the optional /hardware page.
 */

import type { RealCanInput } from "./solver-client";

const STORAGE_KEY = "canoptimizer_real_cans_v2";

export const DEFAULT_REAL_CANS: RealCanInput[] = [
  {
    id: "example-355-us",
    name: "Standard 355 mL Soda Can",
    diameter_cm: 6.62,
    height_cm: 12.27,
    stated_volume_ml: 355,
    isExample: true,
  },
  {
    id: "example-330-eu",
    name: "330 mL Standard Can",
    diameter_cm: 6.6,
    height_cm: 11.52,
    stated_volume_ml: 330,
    isExample: true,
  },
  {
    id: "example-250-slim",
    name: "250 mL Energy Slim Can",
    diameter_cm: 5.3,
    height_cm: 13.45,
    stated_volume_ml: 250,
    isExample: true,
  },
  {
    id: "example-500-tall",
    name: "500 mL Tallboy Can",
    diameter_cm: 6.62,
    height_cm: 16.8,
    stated_volume_ml: 500,
    isExample: true,
  },
];

export function loadRealCans(): RealCanInput[] {
  if (typeof window === "undefined") return DEFAULT_REAL_CANS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_REAL_CANS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_REAL_CANS;
    return parsed as RealCanInput[];
  } catch {
    return DEFAULT_REAL_CANS;
  }
}

export function saveRealCans(cans: RealCanInput[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cans));
  } catch {
    // Ignore quota errors
  }
}

export function appendRealCan(can: Omit<RealCanInput, "id">): RealCanInput[] {
  const existing = loadRealCans();
  const next: RealCanInput[] = [
    ...existing,
    {
      ...can,
      isExample: can.isExample ?? false,
      id: `can-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    },
  ];
  saveRealCans(next);
  return next;
}
