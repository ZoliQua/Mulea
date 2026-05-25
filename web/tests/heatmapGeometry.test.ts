import { describe, it, expect } from 'vitest';
import { heatmapLayout } from '../src/heatmap.ts';
import type { AnalysisResult } from '../src/appTypes.ts';

const res = (): AnalysisResult => ({
  method: 'eFDR', meta: { nTerms: 2, nTargetDropped: 0, poolSize: 100 }, warnings: [],
  rows: [
    { ontology_id: 'A', ontology_name: 'alpha', p_value: 0.001, eFDR: 0.001, hits: ['g1', 'g2'] },
    { ontology_id: 'B', ontology_name: 'beta', p_value: 0.002, eFDR: 0.002, hits: ['g2', 'g3'] },
  ],
});

describe('heatmapLayout geometry (P4a)', () => {
  it('reserves top space for gene column labels and widens the label column', () => {
    const l = heatmapLayout(res(), { topN: 30, cellW: 12, cellH: 16, threshold: 0.05 });
    expect(l.colLabelH).toBeGreaterThan(0);
    expect(l.labelW).toBeGreaterThanOrEqual(140);
    expect(l.rows[0]!.y).toBeGreaterThanOrEqual(l.colLabelH);
    expect(l.cols.map((c) => c.gene)).toEqual(['g1', 'g2', 'g3']);
    expect(l.cols[0]!.x).toBeGreaterThanOrEqual(l.labelW);
    expect(l.height).toBeGreaterThanOrEqual(l.colLabelH + 2 * 16);
  });
});
