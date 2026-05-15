import { describe, it, expect } from 'vitest';
import { lollipopLayout } from '../src/lollipop.ts';
import type { AnalysisResult } from '../src/appTypes.ts';

function res(n: number): AnalysisResult {
  return {
    method: 'eFDR',
    meta: { nTerms: n, nTargetDropped: 0, poolSize: 100 },
    warnings: [],
    rows: Array.from({ length: n }, (_, i) => ({
      ontology_id: `T${i}`, ontology_name: `T${i}`, p_value: 0.001 * (i + 1), eFDR: 0.001 * (i + 1),
    })),
  };
}

describe('lollipopLayout', () => {
  it('keeps only significant terms (score < 0.05), up to topN, sorted ascending', () => {
    const layout = lollipopLayout(res(100), { topN: 10, width: 400, rowHeight: 18, threshold: 0.05 });
    expect(layout.items.length).toBe(10); // 49 significant, capped at topN=10
    expect(layout.items[0]!.id).toBe('T0'); // smallest score first
    for (const it of layout.items) {
      expect(it.x).toBeGreaterThanOrEqual(layout.plot.x);
      expect(it.x).toBeLessThanOrEqual(layout.plot.x + layout.plot.width + 1e-9);
    }
  });

  it('returns an empty layout when nothing is significant', () => {
    const none: AnalysisResult = { ...res(3), rows: res(3).rows.map((r) => ({ ...r, eFDR: 0.9 })) };
    const layout = lollipopLayout(none, { topN: 10, width: 400, rowHeight: 18, threshold: 0.05 });
    expect(layout.items).toHaveLength(0);
  });
});
