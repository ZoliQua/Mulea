import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hypergeometricPValue, effectSize } from '../src/statistics.ts';
import { ora } from '../src/ora.ts';
import type { GmtTerm } from '../src/types.ts';

/**
 * Parse the R-generated golden fixture
 * python/tests/fixtures/hypergeom_directions_reference.csv (k,m,N,n,over,under,two_sided).
 */
function loadFixture(): {
  k: number;
  m: number;
  N: number;
  n: number;
  over: number;
  under: number;
  two_sided: number;
}[] {
  const path = fileURLToPath(
    new URL('../../python/tests/fixtures/hypergeom_directions_reference.csv', import.meta.url),
  );
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  const header = lines[0]!.replace(/"/g, '').split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map(Number);
    const row: Record<string, number> = {};
    header.forEach((h, i) => (row[h] = cells[i]!));
    return {
      k: row.k!,
      m: row.m!,
      N: row.N!,
      n: row.n!,
      over: row.over!,
      under: row.under!,
      two_sided: row.two_sided!,
    };
  });
}

describe('hypergeometric directions vs R phyper/fisher.test', () => {
  const fixture = loadFixture();

  it('loaded the 6-case fixture', () => {
    expect(fixture).toHaveLength(6);
  });

  for (const c of fixture) {
    // statistics.ts parameterization: (commonInSelect=k, commonInPool=m, poolSize=N, selectSize=n)
    it(`over P(X>=k) matches R for (k=${c.k}, m=${c.m}, N=${c.N}, n=${c.n})`, () => {
      expect(hypergeometricPValue(c.k, c.m, c.N, c.n, 'over')).toBeCloseTo(c.over, 9);
    });
    it(`under P(X<=k) matches R for (k=${c.k}, m=${c.m}, N=${c.N}, n=${c.n})`, () => {
      expect(hypergeometricPValue(c.k, c.m, c.N, c.n, 'under')).toBeCloseTo(c.under, 9);
    });
    it(`two-sided matches R fisher.test for (k=${c.k}, m=${c.m}, N=${c.N}, n=${c.n})`, () => {
      expect(hypergeometricPValue(c.k, c.m, c.N, c.n, 'two-sided')).toBeCloseTo(c.two_sided, 9);
    });
  }

  it("default direction is 'over' and is bit-identical to the explicit 'over'", () => {
    for (const c of fixture) {
      expect(hypergeometricPValue(c.k, c.m, c.N, c.n)).toBe(
        hypergeometricPValue(c.k, c.m, c.N, c.n, 'over'),
      );
    }
  });
});

describe('effectSize (hand-checked against R)', () => {
  it('computes fold enrichment and odds-ratio CI for a no-zero-cell table', () => {
    // k=4, n=5, K=5, N=20 → 2x2 a=4,b=1,c=1,d=11 (no Haldane correction).
    // R: fe=3.2, log_odds_ratio=4.025352, CI=[2.826685, 1109.427].
    const es = effectSize(4, 5, 20, 5);
    expect(es.fold_enrichment).toBeCloseTo(3.2, 9);
    expect(es.log_odds_ratio).toBeCloseTo(4.025352, 6);
    expect(es.or_ci_low).toBeCloseTo(2.826685, 4);
    expect(es.or_ci_high).toBeCloseTo(1109.427, 1);
  });

  it('applies the Haldane–Anscombe 0.5 correction when a cell is zero', () => {
    // k=0 → a=0 triggers +0.5 on every cell. With m=5,N=10,n=4:
    // a=0.5,b=4.5,c=5.5,d=1.5 → logOR=log((0.5*1.5)/(4.5*5.5))=log(0.030303)
    const es = effectSize(0, 5, 10, 4);
    expect(Number.isFinite(es.log_odds_ratio)).toBe(true);
    expect(es.log_odds_ratio).toBeCloseTo(Math.log((0.5 * 1.5) / (4.5 * 5.5)), 12);
    expect(es.fold_enrichment).toBe(0); // k=0 → 0 overlap fraction
    expect(es.or_ci_low).toBeLessThan(es.or_ci_high);
  });
});

describe('ora threads direction and effect sizes', () => {
  const gmt: GmtTerm[] = [
    { ontology_id: 'T1', ontology_name: 't1', list_of_values: ['g1', 'g2', 'g3', 'g4', 'g5'] },
  ];
  const background = Array.from({ length: 20 }, (_, i) => `g${i + 1}`);
  const target = ['g1', 'g2', 'g3', 'g4', 'g6']; // 4 of 5 in T1, select size 5

  it("default ora direction is 'over' with effect-size columns", () => {
    const row = ora(gmt, target, background, 'BH')[0]!;
    expect(row.direction).toBe('over');
    expect(row.p_value).toBeCloseTo(hypergeometricPValue(4, 5, 20, 5, 'over'), 12);
    expect(row.fold_enrichment).toBeCloseTo(3.2, 9);
    expect(row.log_odds_ratio).toBeCloseTo(4.025352, 6);
  });

  it("'under' direction yields the depletion p-value", () => {
    const row = ora(gmt, target, background, 'BH', 'under')[0]!;
    expect(row.direction).toBe('under');
    expect(row.p_value).toBeCloseTo(hypergeometricPValue(4, 5, 20, 5, 'under'), 12);
  });

  it("'two-sided' direction yields the Fisher two-sided p-value", () => {
    const row = ora(gmt, target, background, 'BH', 'two-sided')[0]!;
    expect(row.direction).toBe('two-sided');
    expect(row.p_value).toBeCloseTo(hypergeometricPValue(4, 5, 20, 5, 'two-sided'), 12);
  });
});
