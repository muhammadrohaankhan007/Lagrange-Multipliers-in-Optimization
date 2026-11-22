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

  // Automatically scroll active tab into view when activeTab changes
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
    <div className="relative border-b border-slate-200 dark:border-slate-800">
      {/* Left fade + chevron button (only when scrollable left) */}
      {canScrollLeft && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-slate-50 via-slate-50/85 to-transparent dark:from-[#0b1120] dark:via-[#0b1120]/85"
          />
          <button
            type="button"
            onClick={() => scrollByAmount(-1)}
            aria-label="Scroll tabs left"
            className="absolute left-0.5 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-accent)] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
        </>
      )}

      {/* Right fade + chevron button (only when scrollable right) */}
      {canScrollRight && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-slate-50 via-slate-50/85 to-transparent dark:from-[#0b1120] dark:via-[#0b1120]/85"
          />
          <button
            type="button"
            onClick={() => scrollByAmount(1)}
            aria-label="Scroll tabs right"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-7 h-7 rounded-full border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-accent)] transition-colors"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </>
      )}

      {/* Scrollable tablist */}
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
              className={`snap-start inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--nav-accent)] transition-colors duration-150 ${
                active
                  ? "border-[var(--nav-accent)] text-slate-900 dark:text-white"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  active ? "text-[var(--nav-accent)]" : "opacity-80"
                }`}
                aria-hidden="true"
              />
              {tab.label}
            </button>
          );
        })}

        {/* Thin divider + muted Extras label */}
        {extraTabs.length > 0 && (
          <div
            aria-hidden="true"
            className="flex items-center gap-2 pl-2 pr-1 shrink-0 select-none"
          >
            <span className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
              className={`snap-start inline-flex items-center gap-2 whitespace-nowrap px-3.5 py-2.5 text-xs sm:text-sm font-medium border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--nav-accent)] transition-colors duration-150 ${
                active
                  ? "border-[var(--nav-accent)] text-slate-900 dark:text-white"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  active ? "text-[var(--nav-accent)]" : "opacity-80"
                }`}
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
