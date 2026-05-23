import { describe, it, expect } from 'vitest';
import { reorderBySort, lollipopLayout } from '../src/lollipop.ts';
import { barplotLayout } from '../src/barplot.ts';
import { heatmapLayout } from '../src/heatmap.ts';
import type { AnalysisResult, ResultRow } from '../src/appTypes.ts';

function rows(): ResultRow[] {
  return [
    { ontology_id: 'A', ontology_name: 'zeta', p_value: 0.001, eFDR: 0.001, hits: ['g1'] },
    { ontology_id: 'B', ontology_name: 'alpha', p_value: 0.002, eFDR: 0.002, hits: ['g1', 'g2', 'g3'] },
    { ontology_id: 'C', ontology_name: 'mu', p_value: 0.003, eFDR: 0.003, hits: ['g1', 'g2'] },
  ];
}
const res = (): AnalysisResult => ({ method: 'eFDR', meta: { nTerms: 3, nTargetDropped: 0, poolSize: 100 }, warnings: [], rows: rows() });

describe('reorderBySort', () => {
  it('score keeps ascending score order', () => {
    expect(reorderBySort(rows(), 'score').map((r) => r.ontology_id)).toEqual(['A', 'B', 'C']);
  });
  it('name sorts alphabetically by ontology_name', () => {
    expect(reorderBySort(rows(), 'name').map((r) => r.ontology_name)).toEqual(['alpha', 'mu', 'zeta']);
  });
  it('hits sorts by descending hit count', () => {
    expect(reorderBySort(rows(), 'hits').map((r) => r.ontology_id)).toEqual(['B', 'C', 'A']);
  });
  it('does not mutate its input', () => {
    const r = rows();
    reorderBySort(r, 'name');
    expect(r.map((x) => x.ontology_id)).toEqual(['A', 'B', 'C']);
  });
});

describe('layouts honour sortOrder (same set, re-ordered)', () => {
  it('lollipop reorders by name', () => {
    const items = lollipopLayout(res(), { topN: 20, width: 460, rowHeight: 20, threshold: 0.05, sortOrder: 'name' }).items;
    expect(items.map((i) => i.label)).toEqual(['alpha', 'mu', 'zeta']);
  });
  it('barplot reorders by hits', () => {
    const items = barplotLayout(res(), { topN: 20, width: 460, rowHeight: 22, threshold: 0.05, sortOrder: 'hits' }).items;
    expect(items.map((i) => i.id)).toEqual(['B', 'C', 'A']);
  });
  it('heatmap reorders rows by name; default (omitted) stays score', () => {
    expect(heatmapLayout(res(), { topN: 30, cellW: 12, cellH: 16, threshold: 0.05, sortOrder: 'name' }).rows.map((r) => r.label)).toEqual(['alpha', 'mu', 'zeta']);
    expect(heatmapLayout(res(), { topN: 30, cellW: 12, cellH: 16, threshold: 0.05 }).rows.map((r) => r.id)).toEqual(['A', 'B', 'C']);
  });
});
