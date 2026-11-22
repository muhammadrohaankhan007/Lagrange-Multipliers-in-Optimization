import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "CanOptimizer — Lagrange Multipliers in Optimization (MTH-111)",
  description:
    "Interactive multivariable calculus web application solving the optimal cylindrical can problem live with SymPy & SciPy via Pyodide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hasShuLogo = fs.existsSync(path.join(process.cwd(), "public", "shu-logo.png"));

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <ThemeProvider hasShuLogo={hasShuLogo}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
