"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DemoTabId } from "@/components/DemoGuidePanel";

export interface TabItem {
  id: DemoTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: "core" | "extras";
}

interface TabBarProps {
  tabs: TabItem[];
  activeTab: DemoTabId;
  onSelectTab: (id: DemoTabId) => void;
}

export function TabBar({ tabs, activeTab, onSelectTab }: TabBarProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateOverflow();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateOverflow, { passive: true });
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateOverflow);
      ro.disconnect();
    };
  }, [updateOverflow, tabs.length]);

  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    if (!activeEl) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    activeEl.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      inline: "nearest",
      block: "nearest",
    });
  }, [activeTab]);

  const scrollByAmount = (direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction * Math.max(180, el.clientWidth * 0.55),
      behavior: reduced ? "auto" : "smooth",
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const target = tabs[nextIndex];
      onSelectTab(target.id);
      tabRefs.current[target.id]?.focus();
    }
  };

  const coreTabs = tabs.filter((t) => t.group === "core");
  const extraTabs = tabs.filter((t) => t.group === "extras");

  return (
    <div className="relative border-b border-[#e2e8f0]">
      {canScrollLeft && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#f8fafc] via-[#f8fafc]/90 to-transparent"
          />
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            aria-label="Scroll tabs left"
            className="absolute left-0.5 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-7 h-7 rounded-full border border-[#cbd5e1] bg-white text-[#475569] hover:text-[#0f172a] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
        </>
      )}

      {canScrollRight && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#f8fafc] via-[#f8fafc]/90 to-transparent"
          />
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            aria-label="Scroll tabs right"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-7 h-7 rounded-full border border-[#cbd5e1] bg-white text-[#475569] hover:text-[#0f172a] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] transition-colors"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </>
      )}

      <div
        ref={scrollRef}
        role="tablist"
        aria-label="CanOptimizer sections"
        className="no-scrollbar flex items-center gap-1 overflow-x-auto scroll-smooth snap-x snap-proximity py-0.5"
      >
        {coreTabs.map((tab) => {
          const idx = tabs.findIndex((t) => t.id === tab.id);
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`snap-start inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f766e] transition-colors duration-150 ${
                active
                  ? "border-[#0f766e] text-[#0f172a]"
                  : "border-transparent text-[#475569] hover:text-[#0f172a]"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${active ? "text-[#0f766e]" : "opacity-75"}`}
                aria-hidden="true"
              />
              {tab.label}
            </button>
          );
        })}

        {extraTabs.length > 0 && (
          <div
            aria-hidden="true"
            className="flex items-center gap-2 pl-2 pr-1 shrink-0 select-none"
          >
            <span className="h-4 w-px bg-[#cbd5e1]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#475569]">
              Extras
            </span>
          </div>
        )}

        {extraTabs.map((tab) => {
          const idx = tabs.findIndex((t) => t.id === tab.id);
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelectTab(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`snap-start inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-sm font-medium border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0f766e] transition-colors duration-150 ${
                active
                  ? "border-[#0f766e] text-[#0f172a]"
                  : "border-transparent text-[#475569] hover:text-[#0f172a]"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${active ? "text-[#0f766e]" : "opacity-75"}`}
                aria-hidden="true"
              />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
