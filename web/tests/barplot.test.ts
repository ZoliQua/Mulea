import { describe, it, expect } from 'vitest';
import { barplotLayout } from '../src/barplot.ts';
import type { AnalysisResult } from '../src/appTypes.ts';

function res(scores: number[]): AnalysisResult {
  return {
    method: 'eFDR', meta: { nTerms: scores.length, nTargetDropped: 0, poolSize: 100 }, warnings: [],
    rows: scores.map((s, i) => ({ ontology_id: `T${i}`, ontology_name: `T${i}`, p_value: s, eFDR: s })),
  };
}

describe('barplotLayout', () => {
  it('keeps significant terms, longer bar = more significant', () => {
    const layout = barplotLayout(res([0.001, 0.01, 0.2]), { topN: 10, width: 400, rowHeight: 18, threshold: 0.05 });
    expect(layout.items.map((i) => i.id)).toEqual(['T0', 'T1']);
    expect(layout.items[0]!.barWidth).toBeGreaterThan(layout.items[1]!.barWidth);
  });
  it('handles score 0 without Infinity and is empty when none significant', () => {
    const withZero = barplotLayout(res([0]), { topN: 10, width: 400, rowHeight: 18, threshold: 0.05 });
    expect(Number.isFinite(withZero.items[0]!.barWidth)).toBe(true);
    const none = barplotLayout(res([0.5]), { topN: 10, width: 400, rowHeight: 18, threshold: 0.05 });
    expect(none.items).toHaveLength(0);
  });
});
