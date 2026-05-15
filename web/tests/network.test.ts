import { describe, it, expect } from 'vitest';
import { networkLayout } from '../src/network.ts';
import type { AnalysisResult } from '../src/appTypes.ts';

const result: AnalysisResult = {
  method: 'eFDR', meta: { nTerms: 3, nTargetDropped: 0, poolSize: 100 }, warnings: [],
  rows: [
    { ontology_id: 'A', ontology_name: 'A', p_value: 0.001, eFDR: 0.001, hits: ['g1', 'g2'] },
    { ontology_id: 'B', ontology_name: 'B', p_value: 0.002, eFDR: 0.002, hits: ['g2', 'g3'] },
    { ontology_id: 'C', ontology_name: 'C', p_value: 0.003, eFDR: 0.003, hits: ['g9'] },
  ],
};
const opts = { topN: 50, width: 300, height: 300, threshold: 0.05 };

describe('networkLayout', () => {
  it('adds an edge with the right weight when terms share hit genes', () => {
    const layout = networkLayout(result, opts);
    expect(layout.nodes.map((n) => n.id).sort()).toEqual(['A', 'B', 'C']);
    const ab = layout.edges.find((e) => (e.a === 'A' && e.b === 'B') || (e.a === 'B' && e.b === 'A'));
    expect(ab?.weight).toBe(1);
    expect(layout.edges.some((e) => e.a === 'C' || e.b === 'C')).toBe(false);
  });
  it('is deterministic (no RNG)', () => {
    expect(networkLayout(result, opts)).toEqual(networkLayout(result, opts));
  });
  it('places nodes within the canvas bounds', () => {
    for (const n of networkLayout(result, opts).nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0); expect(n.x).toBeLessThanOrEqual(opts.width);
      expect(n.y).toBeGreaterThanOrEqual(0); expect(n.y).toBeLessThanOrEqual(opts.height);
    }
  });
});
