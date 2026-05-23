import type { AnalysisResult, ResultRow } from './appTypes.ts';

export interface LollipopItem { id: string; label: string; value: number; x: number; y: number }
export interface LollipopLayout {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  axisMax: number;
  items: LollipopItem[];
}
export type SortOrder = 'score' | 'name' | 'hits';
export interface LollipopOptions { topN: number; width: number; rowHeight: number; threshold: number; sortOrder?: SortOrder }

/** Score used for the lollipop: eFDR if present, else adjusted p-value, else raw p-value. */
export function rowScore(row: ResultRow): number {
  return row.eFDR ?? row.adjusted_p_value ?? row.p_value;
}

/** Re-order an already-selected set of rows for display (selection stays by significance). Pure, non-mutating. */
export function reorderBySort(rows: ResultRow[], order: SortOrder): ResultRow[] {
  if (order === 'name') return [...rows].sort((a, b) => a.ontology_name.localeCompare(b.ontology_name));
  if (order === 'hits') return [...rows].sort((a, b) => (b.hits?.length ?? 0) - (a.hits?.length ?? 0));
  return [...rows].sort((a, b) => rowScore(a) - rowScore(b));
}

/** Pure layout for a horizontal lollipop of the top-N significant terms (ascending score). */
export function lollipopLayout(result: AnalysisResult, opts: LollipopOptions): LollipopLayout {
  const labelW = 120;
  const padX = 12;
  const padTop = 16;
  const plot = { x: labelW + padX, y: padTop, width: Math.max(40, opts.width - labelW - padX * 2), height: 0 };

  const selected = result.rows
    .filter((r) => rowScore(r) < opts.threshold)
    .sort((a, b) => rowScore(a) - rowScore(b))
    .slice(0, opts.topN);
  const sig = reorderBySort(selected, opts.sortOrder ?? 'score')
    .map((r) => ({ id: r.ontology_id, label: r.ontology_name, value: rowScore(r) }));

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
