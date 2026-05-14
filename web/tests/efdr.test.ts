import { describe, it, expect } from 'vitest';
import { rObsRanks, setBasedEnrichmentTest } from '../src/efdr.ts';
import type { GmtTerm } from '../src/types.ts';

describe('rObsRanks', () => {
  it('matches R rank(ties="max")', () => {
    expect(rObsRanks([0.5, 0.1, 0.9])).toEqual([2, 1, 3]);
    expect(rObsRanks([0.1, 0.1, 0.2])).toEqual([2, 2, 3]);
    expect(rObsRanks([0.3, 0.1, 0.1, 0.5])).toEqual([3, 2, 2, 4]);
  });
});

const handGmt: GmtTerm[] = [
  { ontology_id: 'A', ontology_name: 'A', list_of_values: ['g1', 'g2'] },
  { ontology_id: 'B', ontology_name: 'B', list_of_values: ['g1', 'g2', 'g3'] },
];

describe('setBasedEnrichmentTest (exact)', () => {
  it('matches the hand-derived example', () => {
    const res = setBasedEnrichmentTest(handGmt, ['g1', 'g2'], ['g1', 'g2', 'g3', 'g4']);
    expect(Object.keys(res[0]!)).toEqual([
      'ontology_id', 'ontology_name',
      'nr_common_with_tested_elements', 'nr_common_with_background_elements',
      'p_value', 'eFDR',
    ]);
    const a = res.find((r) => r.ontology_id === 'A')!;
    const b = res.find((r) => r.ontology_id === 'B')!;
    expect(a.p_value).toBeCloseTo(1 / 6, 12);
    expect(b.p_value).toBeCloseTo(0.5, 12);
    expect(a.eFDR).toBeCloseTo(1 / 6, 12);
    expect(b.eFDR).toBeCloseTo(1 / 3, 12);
  });
  it('is deterministic and bounded in [0,1]', () => {
    const a = setBasedEnrichmentTest(handGmt, ['g1', 'g2'], ['g1', 'g2', 'g3', 'g4']);
    const b = setBasedEnrichmentTest(handGmt, ['g1', 'g2'], ['g1', 'g2', 'g3', 'g4']);
    expect(a.map((r) => r.eFDR)).toEqual(b.map((r) => r.eFDR));
    for (const r of a) {
      expect(r.eFDR).toBeGreaterThanOrEqual(0);
      expect(r.eFDR).toBeLessThanOrEqual(1);
    }
  });
});
