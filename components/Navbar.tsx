"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Menu, Moon, Presentation, RotateCw, Sun, X } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import type { SolverStage, SolverStatus } from "@/lib/solver-client";

interface NavbarProps {
  solverStatus?: SolverStatus;
  onRetrySolver?: () => void;
  onToggleDemo?: () => void;
  demoOpen?: boolean;
}

const STAGE_PROGRESS: Record<SolverStage, number> = {
  idle: 10,
  loading_runtime: 30,
  loading_packages: 65,
  loading_solver: 85,
  warming_up: 95,
  ready: 100,
  error: 0,
};

function CylinderMark() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-[var(--nav-accent)]"
    >
      {/* Top ellipse */}
      <ellipse
        cx="11.5"
        cy="6"
        rx="5.5"
        ry="2.2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {/* Vertical cylinder walls */}
      <path
        d="M6 6v11c0 1.22 2.46 2.2 5.5 2.2s5.5-.98 5.5-2.2V6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Subtle tangent contour line */}
      <path
        d="M15.5 20.5L21 15"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeDasharray="2 2"
        opacity="0.7"
      />
    </svg>
  );
}

function MathEngineStatusPill({
  status,
  onRetry,
  compact = false,
}: {
  status: SolverStatus;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const tooltip = "SymPy and SciPy run in your browser, so there is no server.";
  const pct = STAGE_PROGRESS[status.stage] ?? 0;

  if (status.stage === "error") {
    return (
      <div aria-live="polite" title={tooltip}>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full border border-rose-300/80 dark:border-rose-800/80 bg-rose-50/70 dark:bg-rose-950/40 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100/80 dark:hover:bg-rose-950/70 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0b1120]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" aria-hidden="true" />
          <span>Math engine error. Retry</span>
          <RotateCw className="w-3 h-3 shrink-0" aria-hidden="true" />
        </button>
      </div>
    );
  }

  const isReady = status.stage === "ready";

  return (
    <div
      role="status"
      aria-live="polite"
      title={tooltip}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--nav-border)] bg-transparent px-2.5 py-1 text-xs text-[var(--nav-muted)] select-none"
    >
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isReady
            ? "bg-emerald-500"
            : "bg-amber-500 animate-pulse motion-reduce:animate-none"
        }`}
      />
      <span className="whitespace-nowrap">
        {isReady ? (
          "Math engine ready"
        ) : compact ? (
          <>
            <span className="hidden lg:inline">Loading math engine… {pct}%</span>
            <span className="lg:hidden">Loading… {pct}%</span>
          </>
        ) : (
          `Loading math engine… ${pct}%`
        )}
      </span>
    </div>
  );
}

export function Navbar({
  solverStatus,
  onRetrySolver,
  onToggleDemo,
  demoOpen = false,
}: NavbarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme, hasShuLogo } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMenuOpen]);

  const isOptimizer = pathname === "/";
  const isHardware = pathname === "/hardware";
  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--nav-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f8fafc] dark:focus-visible:ring-offset-[#0b1120]";

  return (
    <>
      <a
        href="#main-content"
        className={`sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 rounded-md bg-[var(--nav-accent)] px-3 py-2 text-xs font-medium text-white dark:text-slate-950 ${focusRing}`}
      >
        Skip to content
      </a>

      <header
        className={`sticky top-0 z-30 border-b border-[var(--nav-border)] bg-[var(--nav-bg)] backdrop-blur-sm transition-shadow duration-150 motion-reduce:transition-none ${
          scrolled ? "shadow-[0_1px_8px_rgba(15,23,42,0.06)] dark:shadow-[0_1px_10px_rgba(0,0,0,0.35)]" : ""
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Left: Brand block */}
          <div className="flex items-center gap-3 min-w-0">
            {hasShuLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/shu-logo.png"
                alt="Salim Habib University"
                className="h-6 w-auto shrink-0 object-contain"
              />
            )}
            <Link
              href="/"
              title="MTH-111 Multivariable Calculus · Salim Habib University"
              className={`inline-flex items-center gap-2.5 min-w-0 rounded-md py-1 pr-1 group ${focusRing}`}
            >
              <CylinderMark />
              <div className="leading-tight min-w-0">
                <div className="text-[15px] font-medium tracking-[-0.02em] text-[var(--nav-text)] truncate">
                  CanOptimizer
                </div>
                <div className="hidden sm:block text-[11px] text-[var(--nav-muted)] truncate">
                  Lagrange Multipliers in Optimization
                </div>
              </div>
            </Link>
          </div>

          {/* Right: Status + Desktop/Tablet Navigation + Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-4">
            {solverStatus && (
              <div className="hidden sm:flex items-center">
                <MathEngineStatusPill
                  status={solverStatus}
                  onRetry={onRetrySolver}
                  compact
                />
              </div>
            )}

            {/* Desktop (>=1024px) & Tablet (640-1023px) Nav */}
            <nav
              aria-label="Primary navigation"
              className="hidden sm:flex items-center gap-1 lg:gap-2 h-16"
            >
              {/* Primary: Optimizer */}
              <Link
                href="/"
                aria-current={isOptimizer ? "page" : undefined}
                className={`inline-flex items-center h-full px-2 text-sm font-medium border-b-2 transition-colors duration-150 motion-reduce:transition-none ${focusRing} ${
                  isOptimizer
                    ? "border-[var(--nav-accent)] text-[var(--nav-text)]"
                    : "border-transparent text-[var(--nav-muted)] hover:text-[var(--nav-text)]"
                }`}
              >
                Optimizer
              </Link>

              {/* Secondary: Demo Guide */}
              {onToggleDemo ? (
                <button
                  type="button"
                  onClick={onToggleDemo}
                  aria-expanded={demoOpen}
                  aria-label="Demo Guide"
                  title="Demo Guide"
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 motion-reduce:transition-none ${focusRing} ${
                    demoOpen
                      ? "text-[var(--nav-accent)] bg-[var(--nav-accent-subtle)]"
                      : "text-[var(--nav-muted)] hover:text-[var(--nav-text)]"
                  }`}
                >
                  <Presentation className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="hidden lg:inline">Demo Guide</span>
                </button>
              ) : (
                <Link
                  href="/?demo=1"
                  aria-label="Demo Guide"
                  title="Demo Guide"
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[var(--nav-muted)] hover:text-[var(--nav-text)] transition-colors duration-150 motion-reduce:transition-none ${focusRing}`}
                >
                  <Presentation className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="hidden lg:inline">Demo Guide</span>
                </Link>
              )}

              {/* Thin vertical divider separating optional hardware module */}
              <span
                aria-hidden="true"
                className="mx-1 h-4 w-px bg-[var(--nav-border)] shrink-0"
              />

              {/* Tertiary: ESP32 (optional) */}
              <Link
                href="/hardware"
                aria-current={isHardware ? "page" : undefined}
                aria-label="ESP32 (optional)"
                title="ESP32 (optional)"
                className={`inline-flex items-center gap-1.5 h-full px-2 text-xs sm:text-sm border-b-2 transition-colors duration-150 motion-reduce:transition-none ${focusRing} ${
                  isHardware
                    ? "border-[var(--nav-accent)] text-[var(--nav-text)] font-medium"
                    : "border-transparent text-[var(--nav-muted)] hover:text-[var(--nav-text)]"
                }`}
              >
                <Cpu className="w-4 h-4 shrink-0 opacity-80" aria-hidden="true" />
                <span className="hidden lg:inline">ESP32</span>
                <span className="hidden lg:inline-flex items-center rounded border border-[var(--nav-border)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--nav-muted)] leading-none">
                  Optional
                </span>
              </Link>
            </nav>

            {/* Theme toggle (min 36x36px hit area) */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={themeLabel}
              title={themeLabel}
              className={`inline-flex items-center justify-center w-9 h-9 rounded-md border border-[var(--nav-border)] text-[var(--nav-muted)] hover:text-[var(--nav-text)] hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors duration-150 motion-reduce:transition-none ${focusRing}`}
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            {/* Mobile menu toggle (<640px) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className={`sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-[var(--nav-border)] text-[var(--nav-muted)] hover:text-[var(--nav-text)] transition-colors duration-150 motion-reduce:transition-none ${focusRing}`}
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Menu className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile collapsed navigation drawer (<640px) */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-menu"
            className="sm:hidden border-t border-[var(--nav-border)] bg-[var(--nav-bg)] px-4 py-3 space-y-2"
          >
            {solverStatus && (
              <div className="pb-1">
                <MathEngineStatusPill status={solverStatus} onRetry={onRetrySolver} />
              </div>
            )}
            <nav aria-label="Mobile navigation" className="flex flex-col space-y-1">
              <Link
                href="/"
                aria-current={isOptimizer ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${focusRing} ${
                  isOptimizer
                    ? "text-[var(--nav-accent)] bg-[var(--nav-accent-subtle)]"
                    : "text-[var(--nav-muted)] hover:text-[var(--nav-text)]"
                }`}
              >
                Optimizer
              </Link>

              {onToggleDemo ? (
                <button
                  type="button"
                  onClick={() => {
                    onToggleDemo();
                    setMobileMenuOpen(false);
                  }}
                  aria-expanded={demoOpen}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors duration-150 ${focusRing} ${
                    demoOpen
                      ? "text-[var(--nav-accent)] bg-[var(--nav-accent-subtle)]"
                      : "text-[var(--nav-muted)] hover:text-[var(--nav-text)]"
                  }`}
                >
                  <Presentation className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Demo Guide</span>
                </button>
              ) : (
                <Link
                  href="/?demo=1"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--nav-muted)] hover:text-[var(--nav-text)] transition-colors duration-150 ${focusRing}`}
                >
                  <Presentation className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Demo Guide</span>
                </Link>
              )}

              <div className="my-1 border-t border-[var(--nav-border)]" />

              <Link
                href="/hardware"
                aria-current={isHardware ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors duration-150 ${focusRing} ${
                  isHardware
                    ? "text-[var(--nav-accent)] bg-[var(--nav-accent-subtle)] font-medium"
                    : "text-[var(--nav-muted)] hover:text-[var(--nav-text)]"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Cpu className="w-4 h-4 shrink-0 opacity-80" aria-hidden="true" />
                  <span>ESP32</span>
                </span>
                <span className="rounded border border-[var(--nav-border)] px-1.5 py-0.5 text-[10px] text-[var(--nav-muted)]">
                  Optional
                </span>
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
