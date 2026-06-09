import { describe, it, expect } from 'vitest';
import { ora } from '../src/ora.ts';
import { hypergeometricPValue } from '../src/statistics.ts';
import type { GmtTerm } from '../src/types.ts';

const gmt: GmtTerm[] = [
  { ontology_id: 'T1', ontology_name: 'term1', list_of_values: ['g1', 'g2', 'g3', 'g4', 'g5'] },
  { ontology_id: 'T2', ontology_name: 'term2', list_of_values: ['g6', 'g7', 'g8', 'g9', 'g10'] },
];

describe('ora', () => {
  it('returns the BH schema with correct hypergeometric p-values', () => {
    const background = Array.from({ length: 20 }, (_, i) => `g${i + 1}`);
    const target = ['g1', 'g2', 'g3', 'g4', 'g6'];
    const res = ora(gmt, target, background, 'BH');
    expect(Object.keys(res[0]!)).toEqual([
      'ontology_id',
      'ontology_name',
      'p_value',
      'adjusted_p_value',
      'direction',
      'fold_enrichment',
      'log_odds_ratio',
      'or_ci_low',
      'or_ci_high',
    ]);
    const t1 = res.find((r) => r.ontology_id === 'T1')!;
    expect(t1.p_value).toBeCloseTo(hypergeometricPValue(4, 5, 20, 5), 12);
    expect(t1.p_value).toBeLessThan(res.find((r) => r.ontology_id === 'T2')!.p_value);
  });
});
