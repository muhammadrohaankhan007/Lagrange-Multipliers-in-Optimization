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
  /** Optional optimum marker position along the track; snaps within 1.5% of range */
  optimumValue?: number;
  optimumLabel?: string;
  /** Optional secondary text shown inside the right-hand value badge */
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

    // Magnetic snap within 1.5% of track range on pointer drags (keep fine keyboard steps free)
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
      {/* Label row + monospace value badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
        <label htmlFor={id} className="font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-0.5 font-mono text-xs font-semibold text-teal-700 dark:text-teal-300">
          <span>
            {displayVal}
            {unit ? ` ${unit}` : ""}
          </span>
          {badgeExtra && (
            <span className="text-slate-500 dark:text-slate-400 font-normal">{badgeExtra}</span>
          )}
        </span>
      </div>

      {/* Track + optimum tick + native range input (min 32px hit area) */}
      <div className="relative h-8 flex items-center select-none">
        {/* Background 4px track */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 h-1 rounded-full bg-slate-200 dark:bg-slate-800"
        />
        {/* Filled progress portion */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 h-1 rounded-full bg-[var(--nav-accent)]"
          style={{ width: `${fillPct}%` }}
        />

        {/* Optimum tick mark */}
        {hasOptimum && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${optPct}%` }}
          >
            <div
              className={`w-0.5 rounded-full transition-all duration-150 ${
                snapHighlight || isAtOptimum
                  ? "h-4 bg-amber-500 scale-y-110"
                  : "h-2.5 bg-amber-500/80 dark:bg-amber-400/80"
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

      {/* Min / Optimum / Max labels row */}
      <div className="relative flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <span>{displayMin}</span>
        {hasOptimum && (
          <span
            className={`absolute -translate-x-1/2 transition-colors duration-150 ${
              snapHighlight || isAtOptimum
                ? "text-amber-600 dark:text-amber-400 font-semibold"
                : "text-slate-500 dark:text-slate-400"
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
