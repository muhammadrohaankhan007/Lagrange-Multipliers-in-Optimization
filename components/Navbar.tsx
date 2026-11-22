"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Menu, Presentation, RotateCw, X } from "lucide-react";
import { useBrand } from "./BrandContext";
import type { SolverStatus } from "@/lib/solver-client";

interface NavbarProps {
  solverStatus?: SolverStatus;
  onRetrySolver?: () => void;
  onToggleDemo?: () => void;
  demoOpen?: boolean;
}

function CylinderMark() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 text-[#0f766e]"
    >
      <ellipse cx="11.5" cy="6" rx="5.5" ry="2.2" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6 6v11c0 1.22 2.46 2.2 5.5 2.2s5.5-.98 5.5-2.2V6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
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
}: {
  status: SolverStatus;
  onRetry?: () => void;
}) {
  const tooltip = "SymPy and SciPy run in your browser, so there is no server.";

  if (status.stage === "error") {
    return (
      <div aria-live="polite" title={tooltip}>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-[#fef2f2] px-2.5 py-1 text-xs font-medium text-[#b91c1c] hover:bg-red-100/70 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#b91c1c] shrink-0" aria-hidden="true" />
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
      className="inline-flex items-center gap-2 rounded-full border border-[#e2e8f0] bg-[#f8fafc] px-2.5 py-1 text-xs text-[#475569] select-none"
    >
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isReady ? "bg-[#047857]" : "bg-[#b45309]"
        }`}
      />
      <span className="whitespace-nowrap">
        {isReady ? "Math engine ready" : "Loading math engine…"}
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
  const { hasShuLogo } = useBrand();
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

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2 focus-visible:ring-offset-white";

  return (
    <>
      <a
        href="#main-content"
        className={`sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 rounded-md bg-[#0f766e] px-3 py-2 text-xs font-medium text-white ${focusRing}`}
      >
        Skip to content
      </a>

      <header
        className={`sticky top-0 z-30 border-b border-[#e2e8f0] bg-[var(--nav-bg)] backdrop-blur-sm transition-shadow duration-150 motion-reduce:transition-none ${
          scrolled ? "shadow-[0_1px_6px_rgba(15,23,42,0.06)]" : ""
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
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
              className={`inline-flex items-center gap-2.5 min-w-0 rounded-md py-1 pr-1 ${focusRing}`}
            >
              <CylinderMark />
              <div className="leading-tight min-w-0">
                <div className="text-[15px] font-medium tracking-[-0.02em] text-[#0f172a] truncate">
                  CanOptimizer
                </div>
                <div className="hidden sm:block text-[11px] text-[#475569] truncate">
                  Lagrange Multipliers in Optimization
                </div>
              </div>
            </Link>
          </div>

          {/* Right: Status + Desktop/Tablet Navigation */}
          <div className="flex items-center gap-2 sm:gap-4">
            {solverStatus && (
              <div className="hidden sm:flex items-center">
                <MathEngineStatusPill status={solverStatus} onRetry={onRetrySolver} />
              </div>
            )}

            <nav
              aria-label="Primary navigation"
              className="hidden sm:flex items-center gap-1 lg:gap-2 h-16"
            >
              <Link
                href="/"
                aria-current={isOptimizer ? "page" : undefined}
                className={`inline-flex items-center h-full px-2 text-sm font-medium border-b-2 transition-colors duration-150 motion-reduce:transition-none ${focusRing} ${
                  isOptimizer
                    ? "border-[#0f766e] text-[#0f172a]"
                    : "border-transparent text-[#475569] hover:text-[#0f172a]"
                }`}
              >
                Optimizer
              </Link>

              {onToggleDemo ? (
                <button
                  type="button"
                  onClick={onToggleDemo}
                  aria-expanded={demoOpen}
                  aria-label="Demo Guide"
                  title="Demo Guide"
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 motion-reduce:transition-none ${focusRing} ${
                    demoOpen
                      ? "text-[#0f766e] bg-[#f0fdfa] font-medium"
                      : "text-[#475569] hover:text-[#0f172a]"
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
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[#475569] hover:text-[#0f172a] transition-colors duration-150 motion-reduce:transition-none ${focusRing}`}
                >
                  <Presentation className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="hidden lg:inline">Demo Guide</span>
                </Link>
              )}

              <span aria-hidden="true" className="mx-1 h-4 w-px bg-[#e2e8f0] shrink-0" />

              <Link
                href="/hardware"
                aria-current={isHardware ? "page" : undefined}
                aria-label="ESP32 (optional)"
                title="ESP32 (optional)"
                className={`inline-flex items-center gap-1.5 h-full px-2 text-sm border-b-2 transition-colors duration-150 motion-reduce:transition-none ${focusRing} ${
                  isHardware
                    ? "border-[#0f766e] text-[#0f172a] font-medium"
                    : "border-transparent text-[#475569] hover:text-[#0f172a]"
                }`}
              >
                <Cpu className="w-4 h-4 shrink-0 opacity-80" aria-hidden="true" />
                <span className="hidden lg:inline">ESP32</span>
                <span className="hidden lg:inline-flex items-center rounded border border-[#cbd5e1] px-1.5 py-0.5 text-[10px] font-normal text-[#475569] leading-none">
                  Optional
                </span>
              </Link>
            </nav>

            {/* Mobile menu toggle (<640px) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className={`sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-md border border-[#e2e8f0] text-[#475569] hover:text-[#0f172a] transition-colors duration-150 motion-reduce:transition-none ${focusRing}`}
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
            className="sm:hidden border-t border-[#e2e8f0] bg-white px-4 py-3 space-y-2"
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
                    ? "text-[#0f766e] bg-[#f0fdfa]"
                    : "text-[#475569] hover:text-[#0f172a]"
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
                      ? "text-[#0f766e] bg-[#f0fdfa] font-medium"
                      : "text-[#475569] hover:text-[#0f172a]"
                  }`}
                >
                  <Presentation className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Demo Guide</span>
                </button>
              ) : (
                <Link
                  href="/?demo=1"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[#475569] hover:text-[#0f172a] transition-colors duration-150 ${focusRing}`}
                >
                  <Presentation className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Demo Guide</span>
                </Link>
              )}

              <div className="my-1 border-t border-[#e2e8f0]" />

              <Link
                href="/hardware"
                aria-current={isHardware ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors duration-150 ${focusRing} ${
                  isHardware
                    ? "text-[#0f766e] bg-[#f0fdfa] font-medium"
                    : "text-[#475569] hover:text-[#0f172a]"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Cpu className="w-4 h-4 shrink-0 opacity-80" aria-hidden="true" />
                  <span>ESP32</span>
                </span>
                <span className="rounded border border-[#cbd5e1] px-1.5 py-0.5 text-[10px] text-[#475569]">
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
