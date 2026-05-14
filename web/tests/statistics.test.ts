import { describe, it, expect } from 'vitest';
import { hypergeometricPValue, hypergeometricPmf, pAdjust } from '../src/statistics.ts';

describe('hypergeometricPValue', () => {
  it('matches a hand-derived value', () => {
    // P(X>=4) with pop=10, successes=5, draws=4 = C(5,4)C(5,0)/C(10,4) = 5/210
    expect(hypergeometricPValue(4, 5, 10, 4)).toBeCloseTo(5 / 210, 12);
  });
  it('is 1 when there is no overlap or empty select', () => {
    expect(hypergeometricPValue(0, 5, 10, 4)).toBeCloseTo(1, 12);
    expect(hypergeometricPValue(0, 5, 10, 0)).toBeCloseTo(1, 12);
  });
  it('is 0 for an impossible overlap (more common than drawn)', () => {
    // commonInSelect=5 exceeds selectSize=4 → impossible → 0
    expect(hypergeometricPValue(5, 5, 10, 4)).toBe(0);
  });
  it('returns EXACTLY 1 for zero overlap (no float drift)', () => {
    expect(hypergeometricPValue(0, 5, 10, 4)).toBe(1);
    expect(hypergeometricPValue(0, 148, 7381, 241)).toBe(1); // realistic-scale no-overlap term
  });
});

describe('hypergeometricPmf', () => {
  it('matches a hand value', () => {
    // P(X=2) pop=4, successes=2, draws=2 = C(2,2)C(2,0)/C(4,2) = 1/6
    expect(hypergeometricPmf(2, 2, 4, 2)).toBeCloseTo(1 / 6, 12);
  });
  it('is 0 outside the support', () => {
    expect(hypergeometricPmf(3, 2, 4, 2)).toBe(0);
  });
});

describe('pAdjust', () => {
  it('bonferroni multiplies by n and caps at 1', () => {
    expect(pAdjust([0.01, 0.02], 'bonferroni')).toEqual([0.02, 0.04]);
    expect(pAdjust([0.6, 0.7], 'bonferroni')).toEqual([1, 1]);
  });
  it('BH matches R and preserves input order', () => {
    const out = pAdjust([0.5, 0.01, 0.005], 'BH');
    expect(out[0]).toBeCloseTo(0.5, 12);
    expect(out[1]).toBeCloseTo(0.015, 12);
    expect(out[2]).toBeCloseTo(0.015, 12);
  });
});
