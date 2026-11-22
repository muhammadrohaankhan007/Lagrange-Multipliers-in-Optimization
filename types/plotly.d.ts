declare module "plotly.js-dist-min" {
  const Plotly: {
    newPlot: (
      root: HTMLElement,
      data: Record<string, unknown>[],
      layout?: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<void>;
    react: (
      root: HTMLElement,
      data: Record<string, unknown>[],
      layout?: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<void>;
    downloadImage: (
      root: HTMLElement,
      opts: { format: string; filename: string; width?: number; height?: number; scale?: number }
    ) => Promise<void>;
    purge: (root: HTMLElement) => void;
  };
  export default Plotly;
}
