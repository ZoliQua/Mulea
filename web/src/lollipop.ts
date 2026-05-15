import type { AnalysisResult, ResultRow } from './appTypes.ts';

export interface LollipopItem { id: string; label: string; value: number; x: number; y: number }
export interface LollipopLayout {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  axisMax: number;
  items: LollipopItem[];
}
export interface LollipopOptions { topN: number; width: number; rowHeight: number; threshold: number }

/** Score used for the lollipop: eFDR if present, else adjusted p-value, else raw p-value. */
export function rowScore(row: ResultRow): number {
  return row.eFDR ?? row.adjusted_p_value ?? row.p_value;
}

/** Pure layout for a horizontal lollipop of the top-N significant terms (ascending score). */
export function lollipopLayout(result: AnalysisResult, opts: LollipopOptions): LollipopLayout {
  const labelW = 120;
  const padX = 12;
  const padTop = 16;
  const plot = { x: labelW + padX, y: padTop, width: Math.max(40, opts.width - labelW - padX * 2), height: 0 };

  const sig = result.rows
    .map((r) => ({ id: r.ontology_id, label: r.ontology_name, value: rowScore(r) }))
    .filter((r) => r.value < opts.threshold)
    .sort((a, b) => a.value - b.value)
    .slice(0, opts.topN);

  const axisMax = Math.max(opts.threshold, ...sig.map((s) => s.value));
  const items: LollipopItem[] = sig.map((s, i) => ({
    id: s.id,
    label: s.label,
    value: s.value,
    x: plot.x + (axisMax > 0 ? (s.value / axisMax) * plot.width : 0),
    y: padTop + i * opts.rowHeight + opts.rowHeight / 2,
  }));

  plot.height = sig.length * opts.rowHeight;
  return { width: opts.width, height: padTop * 2 + plot.height, plot, axisMax, items };
}
