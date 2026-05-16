import type { AnalysisResult } from './appTypes.ts';
import { rowScore } from './lollipop.ts';

export interface HeatRow { id: string; label: string; y: number; score: number }
export interface HeatCol { gene: string; x: number }
export interface HeatCell { r: number; c: number; on: boolean; score: number }
export interface HeatmapLayout {
  width: number; height: number; labelW: number; cellW: number; cellH: number;
  rows: HeatRow[]; cols: HeatCol[]; cells: HeatCell[];
}
export interface HeatmapOptions { topN: number; cellW: number; cellH: number; threshold: number }

/** Grid heatmap: significant terms (rows) × the union of their hit genes (columns). */
export function heatmapLayout(result: AnalysisResult, opts: HeatmapOptions): HeatmapLayout {
  const labelW = 110, padTop = 16;
  const sig = result.rows
    .filter((r) => rowScore(r) < opts.threshold)
    .sort((a, b) => rowScore(a) - rowScore(b))
    .slice(0, opts.topN);

  const colOrder: string[] = [];
  const seen = new Set<string>();
  for (const r of sig) for (const g of r.hits ?? []) if (!seen.has(g)) { seen.add(g); colOrder.push(g); }

  const rows: HeatRow[] = sig.map((r, i) => ({ id: r.ontology_id, label: r.ontology_name, y: padTop + i * opts.cellH, score: rowScore(r) }));
  const cols: HeatCol[] = colOrder.map((g, j) => ({ gene: g, x: labelW + j * opts.cellW }));
  const cells: HeatCell[] = [];
  sig.forEach((r, i) => {
    const hits = new Set(r.hits ?? []);
    colOrder.forEach((g, j) => cells.push({ r: i, c: j, on: hits.has(g), score: rowScore(r) }));
  });

  return {
    width: labelW + colOrder.length * opts.cellW,
    height: padTop + sig.length * opts.cellH,
    labelW, cellW: opts.cellW, cellH: opts.cellH, rows, cols, cells,
  };
}
