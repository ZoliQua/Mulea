import { describe, it, expect } from 'vitest';
import { efdrStandardError } from '../src/efdrStandardError.ts';

describe('efdrStandardError', () => {
  it('matches the closed form sqrt(eFDR / (steps · rObs))', () => {
    const { se } = efdrStandardError(0.04, 1000, 5);
    expect(se).toBeCloseTo(Math.sqrt(0.04 / (1000 * 5)), 15);
  });

  it('SE shrinks like 1/sqrt(steps): ×100 steps → ÷10 SE', () => {
    const a = efdrStandardError(0.04, 1000, 5).se;
    const b = efdrStandardError(0.04, 100000, 5).se;
    expect(b).toBeLessThan(a);
    expect(a / b).toBeCloseTo(10, 6); // sqrt(100000/1000) = 10
  });

  it('SE is monotonically decreasing in steps', () => {
    const ses = [1000, 3000, 10000, 30000, 100000].map(
      (s) => efdrStandardError(0.05, s, 7).se,
    );
    for (let i = 1; i < ses.length; i++) {
      expect(ses[i]!).toBeLessThan(ses[i - 1]!);
    }
  });

  it('CI brackets the eFDR point estimate', () => {
    const eFDR = 0.03;
    const { ciLow, ciHigh } = efdrStandardError(eFDR, 1000, 4);
    expect(ciLow).toBeLessThanOrEqual(eFDR);
    expect(ciHigh).toBeGreaterThanOrEqual(eFDR);
  });

  it('CI is symmetric (±1.96·se) before clamping', () => {
    const eFDR = 0.5; // well inside [0,1] so no clamping at small se
    const { se, ciLow, ciHigh } = efdrStandardError(eFDR, 1e9, 1000);
    expect(eFDR - ciLow).toBeCloseTo(1.96 * se, 12);
    expect(ciHigh - eFDR).toBeCloseTo(1.96 * se, 12);
  });

  it('clamps the CI to [0, 1]', () => {
    // Large eFDR near 1 with a wide SE: upper bound must clamp to 1, lower to >= 0.
    const { ciLow, ciHigh } = efdrStandardError(0.99, 4, 1);
    expect(ciHigh).toBeLessThanOrEqual(1);
    expect(ciHigh).toBe(1);
    expect(ciLow).toBeGreaterThanOrEqual(0);
  });

  it('eFDR = 0 → se 0 and a degenerate CI at 0', () => {
    const { se, ciLow, ciHigh } = efdrStandardError(0, 1000, 5);
    expect(se).toBe(0);
    expect(ciLow).toBe(0);
    expect(ciHigh).toBe(0);
  });

  it('handles NaN eFDR safely (finite, zeroed)', () => {
    const { se, ciLow, ciHigh } = efdrStandardError(NaN, 1000, 5);
    expect(se).toBe(0);
    expect(ciLow).toBe(0);
    expect(ciHigh).toBe(0);
  });

  it('handles rObs <= 0 safely', () => {
    for (const rObs of [0, -3, NaN]) {
      const { se, ciLow, ciHigh } = efdrStandardError(0.04, 1000, rObs);
      expect(Number.isFinite(se)).toBe(true);
      expect(se).toBe(0);
      // point estimate still finite and bracketed by the collapsed CI
      expect(ciLow).toBe(clamp(0.04));
      expect(ciHigh).toBe(clamp(0.04));
    }
  });

  it('handles steps <= 0 safely', () => {
    for (const steps of [0, -10, NaN]) {
      const { se, ciLow, ciHigh } = efdrStandardError(0.04, steps, 5);
      expect(se).toBe(0);
      expect(ciLow).toBe(0.04);
      expect(ciHigh).toBe(0.04);
    }
  });

  it('always returns finite numbers for arbitrary degenerate inputs', () => {
    const cases: Array<[number, number, number]> = [
      [Infinity, 1000, 5],
      [-0.2, 1000, 5],
      [0.04, Infinity, 5],
      [0.04, 1000, Infinity],
      [NaN, NaN, NaN],
    ];
    for (const [e, s, r] of cases) {
      const out = efdrStandardError(e, s, r);
      expect(Number.isFinite(out.se)).toBe(true);
      expect(Number.isFinite(out.ciLow)).toBe(true);
      expect(Number.isFinite(out.ciHigh)).toBe(true);
      expect(out.ciLow).toBeGreaterThanOrEqual(0);
      expect(out.ciHigh).toBeLessThanOrEqual(1);
    }
  });
});

// mirror the module's clamp for assertions
const clamp = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
