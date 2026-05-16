import { describe, it, expect } from 'vitest';
import { termDrilldown } from '../src/drilldown.ts';
import type { ResultRow } from '../src/appTypes.ts';

const meta = { nTerms: 10, nTargetDropped: 0, poolSize: 7000 };

describe('termDrilldown', () => {
  it('derives fields from an eFDR row', () => {
    const row: ResultRow = {
      ontology_id: 'LexA', ontology_name: 'LexA', p_value: 8e-10, eFDR: 0,
      nr_common_with_tested_elements: 12, nr_common_with_background_elements: 24, hits: ['lexA', 'recA'],
    };
    const d = termDrilldown(row, meta);
    expect(d.score).toBe(0);
    expect(d.hits).toEqual(['lexA', 'recA']);
    expect(d.nrCommonWithTested).toBe(12);
    expect(d.nrCommonWithBackground).toBe(24);
    expect(d.poolSize).toBe(7000);
  });
  it('falls back to hits.length for the tested overlap on a BH row', () => {
    const row: ResultRow = { ontology_id: 'A', ontology_name: 'A', p_value: 0.01, adjusted_p_value: 0.02, hits: ['g1', 'g2', 'g3'] };
    const d = termDrilldown(row, meta);
    expect(d.nrCommonWithTested).toBe(3);
    expect(d.nrCommonWithBackground).toBeUndefined();
    expect(d.score).toBe(0.02);
  });
});
