"use client";

import React, { useMemo } from "react";
import katex from "katex";

interface MathBlockProps {
  latex: string;
  display?: boolean;
  className?: string;
}

export function MathBlock({ latex, display = true, className = "" }: MathBlockProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: display,
        throwOnError: false,
        strict: false,
      });
    } catch {
      return latex;
    }
  }, [latex, display]);

  if (display) {
    return (
      <div
        className={`overflow-x-auto py-1 ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
