"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Lightbulb } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export interface PlotlyChartProps {
  title: string;
  subtitle?: string;
  takeaway?: string;
  ariaLabel?: string;
  data: Record<string, unknown>[];
  layout?: Record<string, unknown>;
  filename?: string;
  height?: number;
  onPointClick?: (point: { x: number; y: number }) => void;
}

type PlotlyModule = {
  newPlot: (
    root: HTMLElement,
    data: Record<string, unknown>[],
    layout: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<void>;
  react: (
    root: HTMLElement,
    data: Record<string, unknown>[],
    layout: Record<string, unknown>,
    config?: Record<string, unknown>
  ) => Promise<void>;
  downloadImage: (
    root: HTMLElement,
    opts: { format: string; filename: string; width?: number; height?: number; scale?: number }
  ) => Promise<void>;
  purge: (root: HTMLElement) => void;
};

export function PlotlyChart({
  title,
  subtitle,
  takeaway,
  ariaLabel,
  data,
  layout = {},
  filename = "canoptimizer-chart",
  height = 420,
  onPointClick,
}: PlotlyChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plotlyRef = useRef<PlotlyModule | null>(null);
  const clickCallbackRef = useRef(onPointClick);
  clickCallbackRef.current = onPointClick;
  const { theme } = useTheme();
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderPlot() {
      if (!containerRef.current) return;
      if (!plotlyRef.current) {
        const mod = await import("plotly.js-dist-min");
        plotlyRef.current = (mod.default ?? mod) as unknown as PlotlyModule;
      }
      if (cancelled || !containerRef.current || !plotlyRef.current) return;

      const isDark = theme === "dark";
      const paperBg = isDark ? "#0f172a" : "#ffffff";
      const plotBg = isDark ? "#1e293b" : "#f8fafc";
      const fontColor = isDark ? "#f1f5f9" : "#0f172a";
      const tickColor = isDark ? "#cbd5e1" : "#334155";
      const gridColor = isDark ? "#334155" : "#cbd5e1";

      const baseAxis = {
        gridcolor: gridColor,
        zerolinecolor: gridColor,
        linecolor: gridColor,
        tickfont: { color: tickColor, size: 11 },
        titlefont: { color: fontColor, size: 12 },
      };

      const mergedLayout: Record<string, unknown> = {
        autosize: true,
        height,
        margin: { t: 28, r: 24, b: 64, l: 64 },
        paper_bgcolor: paperBg,
        plot_bgcolor: plotBg,
        font: { color: fontColor, family: "Inter, system-ui, sans-serif", size: 12 },
        legend: {
          font: { color: fontColor, size: 11 },
          bgcolor: "rgba(0,0,0,0)",
        },
        ...layout,
      };

      mergedLayout.xaxis = {
        ...baseAxis,
        ...(typeof layout.xaxis === "object" && layout.xaxis
          ? (layout.xaxis as Record<string, unknown>)
          : {}),
      };

      mergedLayout.yaxis = {
        ...baseAxis,
        ...(typeof layout.yaxis === "object" && layout.yaxis
          ? (layout.yaxis as Record<string, unknown>)
          : {}),
      };

      if (typeof layout.legend === "object" && layout.legend) {
        mergedLayout.legend = {
          font: { color: fontColor, size: 11 },
          bgcolor: "rgba(0,0,0,0)",
          ...(layout.legend as Record<string, unknown>),
        };
      }

      if (typeof layout.scene === "object" && layout.scene) {
        const sc = layout.scene as Record<string, unknown>;
        mergedLayout.scene = {
          ...sc,
          bgcolor: plotBg,
          xaxis: {
            ...baseAxis,
            backgroundcolor: plotBg,
            ...(typeof sc.xaxis === "object" && sc.xaxis ? sc.xaxis : {}),
          },
          yaxis: {
            ...baseAxis,
            backgroundcolor: plotBg,
            ...(typeof sc.yaxis === "object" && sc.yaxis ? sc.yaxis : {}),
          },
          zaxis: {
            ...baseAxis,
            backgroundcolor: plotBg,
            ...(typeof sc.zaxis === "object" && sc.zaxis ? sc.zaxis : {}),
          },
        };
      }

      // Ensure colorbar fonts match light/dark theme on contour/surface traces
      const themedData = data.map((trace) => {
        if (trace.colorbar && typeof trace.colorbar === "object") {
          return {
            ...trace,
            colorbar: {
              ...(trace.colorbar as Record<string, unknown>),
              tickfont: { color: tickColor },
              titlefont: { color: fontColor },
            },
          };
        }
        return trace;
      });

      const config = {
        responsive: true,
        displaylogo: false,
        toImageButtonOptions: {
          format: "png",
          filename,
          scale: 2,
        },
      };

      await plotlyRef.current.react(containerRef.current, themedData, mergedLayout, config);

      const el = containerRef.current as HTMLDivElement & {
        on?: (ev: string, fn: (data: { points?: Array<{ x?: unknown; y?: unknown }> }) => void) => void;
        removeAllListeners?: (ev: string) => void;
      };
      if (el.removeAllListeners) {
        el.removeAllListeners("plotly_click");
      }
      if (el.on && clickCallbackRef.current) {
        el.on("plotly_click", (ev) => {
          const pt = ev?.points?.[0];
          if (!pt) return;
          const x = Number(pt.x);
          const y = Number(pt.y);
          if (Number.isFinite(x) && Number.isFinite(y) && clickCallbackRef.current) {
            clickCallbackRef.current({ x, y });
          }
        });
      }
    }

    renderPlot();

    return () => {
      cancelled = true;
    };
  }, [data, layout, theme, height, filename]);

  useEffect(() => {
    return () => {
      if (containerRef.current && plotlyRef.current) {
        plotlyRef.current.purge(containerRef.current);
      }
    };
  }, []);

  const handleDownloadPng = async () => {
    if (!containerRef.current || !plotlyRef.current) return;
    setExporting(true);
    try {
      await plotlyRef.current.downloadImage(containerRef.current, {
        format: "png",
        filename,
        width: 1100,
        height: 680,
        scale: 2,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <figure className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && (
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={exporting}
          aria-label={`Download ${title} as PNG`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? "Exporting..." : "PNG"}
        </button>
      </div>
      <div className="p-2">
        <div
          ref={containerRef}
          role="img"
          aria-label={ariaLabel || title}
          className="w-full"
          style={{ minHeight: height }}
        />
      </div>
      {takeaway && (
        <figcaption className="flex items-start gap-2 px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-xs text-slate-700 dark:text-slate-300">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-slate-900 dark:text-slate-100">
              Takeaway:
            </strong>{" "}
            {takeaway}
          </span>
        </figcaption>
      )}
    </figure>
  );
}
