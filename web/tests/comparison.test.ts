import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runComparison } from '../src/comparison.ts';

describe('runComparison', () => {
  it('computes the three significant sets; bonferroni ⊆ bh', () => {
    const c = runComparison({
      gmtText: 'T1\tt1\tg1\tg2\tg3\tg4\tg5\nT2\tt2\tg6\tg7\tg8\tg9\tg10',
      target: ['g1', 'g2', 'g3', 'g4', 'g6'],
      background: Array.from({ length: 20 }, (_, i) => `g${i + 1}`),
      minNrOfElements: 0,
      maxNrOfElements: 999,
    });
    expect(c.bh).toEqual(['T1']);
    expect(c.bonferroni).toEqual(['T1']);
    expect(c.efdr).toContain('T1');
    expect(c.efdr).not.toContain('T2');
    expect(c.bonferroni.every((x) => c.bh.includes(x))).toBe(true);
  });

  it('all three sets are non-empty on the bundled E. coli example, bonferroni ⊆ bh', () => {
    const repo = join(import.meta.dirname, '..', '..');
    const ex = join(repo, 'inst', 'extdata');
    const lines = (p: string) => readFileSync(p, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const c = runComparison({
      gmtText: readFileSync(join(ex, 'Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt'), 'utf8'),
      target: lines(join(ex, 'target_set.txt')),
      background: lines(join(ex, 'background_set.txt')),
      minNrOfElements: 3,
      maxNrOfElements: 400,
    });
    expect(c.efdr.length).toBeGreaterThan(0);
    expect(c.bh.length).toBeGreaterThan(0);
    expect(c.bonferroni.length).toBeGreaterThan(0);
    expect(c.bonferroni.every((x) => c.bh.includes(x))).toBe(true);
  });
});
