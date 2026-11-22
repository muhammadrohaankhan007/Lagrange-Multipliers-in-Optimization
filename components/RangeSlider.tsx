"use client";

import React, { useEffect, useRef, useState } from "react";

export interface RangeSliderProps {
  id: string;
  label: React.ReactNode;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (nextValue: number) => void;
  unit?: string;
  unitAria?: string;
  optimumValue?: number;
  optimumLabel?: string;
  badgeExtra?: string;
  formatValue?: (v: number) => string;
  formatEnd?: (v: number) => string;
  minLabel?: string;
  maxLabel?: string;
}

export function RangeSlider({
  id,
  label,
  min,
  max,
  step,
  value,
  onChange,
  unit = "",
  unitAria,
  optimumValue,
  optimumLabel = "optimum",
  badgeExtra,
  formatValue,
  formatEnd,
  minLabel,
  maxLabel,
}: RangeSliderProps) {
  const [snapHighlight, setSnapHighlight] = useState(false);
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usingKeyboardRef = useRef(false);

  useEffect(() => {
    return () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    };
  }, []);

  const span = max - min > 0 ? max - min : 1;
  const clamped = Math.min(max, Math.max(min, value));
  const fillPct = ((clamped - min) / span) * 100;

  const hasOptimum =
    typeof optimumValue === "number" &&
    Number.isFinite(optimumValue) &&
    optimumValue >= min &&
    optimumValue <= max;
  const optPct = hasOptimum ? ((optimumValue! - min) / span) * 100 : 0;

  const displayVal = formatValue ? formatValue(clamped) : clamped.toFixed(2);
  const displayMin =
    minLabel ?? (formatEnd ? formatEnd(min) : `${min}${unit ? ` ${unit}` : ""}`);
  const displayMax =
    maxLabel ?? (formatEnd ? formatEnd(max) : `${max}${unit ? ` ${unit}` : ""}`);
  const ariaValueText = `${displayVal}${unitAria ? ` ${unitAria}` : unit ? ` ${unit}` : ""}`;

  const triggerSnapPulse = () => {
    setSnapHighlight(true);
    if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    snapTimerRef.current = setTimeout(() => setSnapHighlight(false), 500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let next = parseFloat(e.target.value);
    if (!Number.isFinite(next)) return;

    if (hasOptimum && !usingKeyboardRef.current) {
      const snapThreshold = span * 0.015;
      if (Math.abs(next - optimumValue!) <= snapThreshold) {
        next = optimumValue!;
        triggerSnapPulse();
      }
    }
    usingKeyboardRef.current = false;
    onChange(Math.min(max, Math.max(min, next)));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isInc = e.key === "ArrowRight" || e.key === "ArrowUp";
    const isDec = e.key === "ArrowLeft" || e.key === "ArrowDown";
    if (!isInc && !isDec) return;

    usingKeyboardRef.current = true;
    if (e.shiftKey) {
      e.preventDefault();
      const bigStep = step * 10;
      const next = isInc ? clamped + bigStep : clamped - bigStep;
      onChange(Math.min(max, Math.max(min, Number(next.toFixed(4)))));
    }
  };

  const isAtOptimum = hasOptimum && Math.abs(clamped - optimumValue!) <= span * 0.002;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <label htmlFor={id} className="font-medium text-[#334155]">
          {label}
        </label>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-0.5 font-mono text-xs tabular-nums font-semibold text-[#0f766e]">
          <span>
            {displayVal}
            {unit ? ` ${unit}` : ""}
          </span>
          {badgeExtra && <span className="text-[#475569] font-normal">{badgeExtra}</span>}
        </span>
      </div>

      <div className="relative h-8 flex items-center select-none">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 h-1 rounded-full bg-[#e2e8f0]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 h-1 rounded-full bg-[#0f766e]"
          style={{ width: `${fillPct}%` }}
        />

        {hasOptimum && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${optPct}%` }}
          >
            <div
              className={`w-0.5 rounded-full transition-all duration-150 ${
                snapHighlight || isAtOptimum ? "h-4 bg-[#b45309]" : "h-2.5 bg-[#b45309]/75"
              }`}
            />
          </div>
        )}

        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={clamped}
          aria-valuetext={ariaValueText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onPointerDown={() => {
            usingKeyboardRef.current = false;
          }}
          className="can-slider relative z-10 w-full h-8 m-0 cursor-pointer"
        />
      </div>

      <div className="relative flex items-center justify-between text-xs font-mono tabular-nums text-[#475569]">
        <span>{displayMin}</span>
        {hasOptimum && (
          <span
            className={`absolute -translate-x-1/2 transition-colors duration-150 ${
              snapHighlight || isAtOptimum ? "text-[#b45309] font-semibold" : "text-[#475569]"
            }`}
            style={{ left: `${Math.min(86, Math.max(14, optPct))}%` }}
          >
            {optimumLabel}
          </span>
        )}
        <span>{displayMax}</span>
      </div>
    </div>
  );
}
