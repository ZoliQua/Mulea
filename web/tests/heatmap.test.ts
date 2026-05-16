import { describe, it, expect } from 'vitest';
import { heatmapLayout } from '../src/heatmap.ts';
import type { AnalysisResult } from '../src/appTypes.ts';

const result: AnalysisResult = {
  method: 'eFDR', meta: { nTerms: 2, nTargetDropped: 0, poolSize: 100 }, warnings: [],
  rows: [
    { ontology_id: 'A', ontology_name: 'A', p_value: 0.001, eFDR: 0.001, hits: ['g1', 'g2'] },
    { ontology_id: 'B', ontology_name: 'B', p_value: 0.002, eFDR: 0.002, hits: ['g2', 'g3'] },
    { ontology_id: 'C', ontology_name: 'C', p_value: 0.9, eFDR: 0.9, hits: ['g4'] },
  ],
};
const opts = { topN: 50, cellW: 12, cellH: 14, threshold: 0.05 };

describe('heatmapLayout', () => {
  it('rows are significant terms; columns are the union of their hit genes', () => {
    const h = heatmapLayout(result, opts);
    expect(h.rows.map((r) => r.id)).toEqual(['A', 'B']);
    expect(h.cols.map((c) => c.gene)).toEqual(['g1', 'g2', 'g3']);
  });
  it('cell.on reflects gene-in-term membership', () => {
    const h = heatmapLayout(result, opts);
    const cell = (r: number, gene: string) => h.cells.find((x) => x.r === r && h.cols[x.c]!.gene === gene)!;
    expect(cell(0, 'g1').on).toBe(true);
    expect(cell(0, 'g3').on).toBe(false);
    expect(cell(1, 'g2').on).toBe(true);
  });
  it('is empty when nothing is significant', () => {
    const none: AnalysisResult = { ...result, rows: result.rows.map((r) => ({ ...r, eFDR: 0.9 })) };
    expect(heatmapLayout(none, opts).rows).toHaveLength(0);
  });
});
