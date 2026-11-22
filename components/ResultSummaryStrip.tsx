"use client";

import React from "react";
import type { AnalyticalSolution } from "@/lib/solver-client";

interface ResultSummaryStripProps {
  solution: AnalyticalSolution | null;
  caption?: string;
}

export function ResultSummaryStrip({ solution, caption }: ResultSummaryStripProps) {
  const items = [
    {
      label: "Optimal Radius r*",
      unit: "cm",
      value: solution ? solution.r_opt.toFixed(4) : "—",
    },
    {
      label: "Optimal Height h*",
      unit: "cm",
      value: solution ? solution.h_opt.toFixed(4) : "—",
    },
    {
      label: "Minimum Area A_min",
      unit: "cm²",
      value: solution ? solution.area_min.toFixed(4) : "—",
    },
    {
      label: "Lagrange Multiplier λ*",
      unit: "1/cm",
      value: solution ? solution.lambda_opt.toFixed(5) : "—",
    },
  ];

  return (
    <section
      aria-label="Optimal cylinder result summary"
      className="rounded-xl border border-[#e2e8f0] bg-white p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
    >
      {caption && (
        <div className="text-xs font-medium text-[#475569] mb-3">{caption}</div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 lg:divide-x divide-[#e2e8f0]">
        {items.map((item, idx) => (
          <div key={item.label} className={idx > 0 ? "pt-3 sm:pt-0 lg:pl-4" : ""}>
            <div className="text-xs text-[#475569]">
              {item.label}{" "}
              <span className="font-mono text-[11px] text-[#475569]">({item.unit})</span>
            </div>
            <div className="mt-1 font-mono text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-[#0f172a]">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
