import type { AnalysisResult } from './appTypes.ts';
import { rowScore } from './lollipop.ts';

export interface BarplotItem { id: string; label: string; value: number; barWidth: number; y: number }
export interface BarplotLayout {
  width: number; height: number;
  plot: { x: number; y: number; width: number; height: number };
  axisMax: number; items: BarplotItem[];
}
export interface BarplotOptions { topN: number; width: number; rowHeight: number; threshold: number }

const SCORE_FLOOR = 1e-10; // caps -log10 at 10 so eFDR==0 terms don't blow up the axis

/** Horizontal bar chart of the top-N significant terms; bar length = -log10(score). */
export function barplotLayout(result: AnalysisResult, opts: BarplotOptions): BarplotLayout {
  const labelW = 120, padX = 12, padTop = 16;
  const plot = { x: labelW + padX, y: padTop, width: Math.max(40, opts.width - labelW - padX * 2), height: 0 };

  const sig = result.rows
    .map((r) => ({ id: r.ontology_id, label: r.ontology_name, score: rowScore(r) }))
    .filter((r) => r.score < opts.threshold)
    .sort((a, b) => a.score - b.score)
    .slice(0, opts.topN)
    .map((r) => ({ ...r, value: -Math.log10(Math.max(r.score, SCORE_FLOOR)) }));

  const axisMax = Math.max(1e-9, ...sig.map((s) => s.value));
  const items: BarplotItem[] = sig.map((s, i) => ({
    id: s.id, label: s.label, value: s.value,
    barWidth: (s.value / axisMax) * plot.width,
    y: padTop + i * opts.rowHeight,
  }));

  plot.height = sig.length * opts.rowHeight;
  return { width: opts.width, height: padTop * 2 + plot.height, plot, axisMax, items };
}
