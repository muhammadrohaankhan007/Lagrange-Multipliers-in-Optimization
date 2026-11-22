"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface EngineWaitingSkeletonProps {
  title?: string;
}

export function EngineWaitingSkeleton({ title }: EngineWaitingSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl border border-[#e2e8f0] bg-white p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)] space-y-5"
    >
      <div className="flex items-center gap-2.5 text-sm font-medium text-[#334155]">
        <Loader2
          className="w-4 h-4 text-[#0f766e] animate-spin motion-reduce:animate-none shrink-0"
          aria-hidden="true"
        />
        <span>{title || "Waiting for the math engine…"}</span>
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-[#f1f5f9]" />
        ))}
      </div>
      <div aria-hidden="true" className="space-y-2.5">
        <div className="h-4 w-2/3 rounded bg-[#f1f5f9]" />
        <div className="h-4 w-5/6 rounded bg-[#f1f5f9]" />
        <div className="h-40 w-full rounded-lg bg-[#f1f5f9]" />
      </div>
    </div>
  );
}
