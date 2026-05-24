import { describe, it, expect } from 'vitest';
import { runComparison } from '../src/comparison.ts';

const GMT = 'T1\tterm one\tg1\tg2\tg3\tg4\nT2\tterm two\tg1\tg2\tg5\tg6';
const BG = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'];

describe('runComparison names', () => {
  it('returns a names map covering every id in the three significant sets', () => {
    const r = runComparison({ gmtText: GMT, target: ['g1', 'g2', 'g3', 'g4'], background: BG, minNrOfElements: 3, maxNrOfElements: 400 });
    const ids = new Set([...r.efdr, ...r.bh, ...r.bonferroni]);
    for (const id of ids) expect(typeof r.names[id]).toBe('string');
    if (r.names['T1']) expect(r.names['T1']).toBe('term one');
  });
});
