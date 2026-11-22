"use client";

import React, { useEffect, useRef, useState } from "react";
import { Download, Lightbulb } from "lucide-react";

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

      const paperBg = "#ffffff";
      const plotBg = "#f8fafc";
      const fontColor = "#0f172a";
      const tickColor = "#334155";
      const gridColor = "#e2e8f0";

      const baseAxis = {
        gridcolor: gridColor,
        zerolinecolor: "#cbd5e1",
        linecolor: "#cbd5e1",
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
          bgcolor: "rgba(255,255,255,0)",
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
          bgcolor: "rgba(255,255,255,0)",
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
        on?: (
          ev: string,
          fn: (data: { points?: Array<{ x?: unknown; y?: unknown }> }) => void
        ) => void;
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
  }, [data, layout, height, filename]);

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
    <figure className="rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-b border-[#e2e8f0]">
        <div>
          <h3 className="text-sm font-semibold text-[#0f172a]">{title}</h3>
          {subtitle && <p className="text-xs text-[#475569] mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={exporting}
          aria-label={`Download ${title} as PNG`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#f8fafc] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
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
        <figcaption className="flex items-start gap-2 px-5 py-3 border-t border-[#e2e8f0] bg-[#f8fafc] text-xs text-[#334155]">
          <Lightbulb className="w-3.5 h-3.5 text-[#b45309] shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            <strong className="font-semibold text-[#0f172a]">Takeaway:</strong> {takeaway}
          </span>
        </figcaption>
      )}
    </figure>
  );
}
