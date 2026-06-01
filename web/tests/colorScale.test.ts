import { describe, it, expect } from 'vitest';
import { rampColor3, scoreT } from '../src/ui/colorScale.ts';

describe('rampColor3 (diverging)', () => {
  const LO = '#3f74d6', MID = '#9b5fc4', HI = '#e2574f';
  it('hits the three stops at t=0, 0.5, 1', () => {
    expect(rampColor3(0, LO, MID, HI)).toBe('rgb(63,116,214)');
    expect(rampColor3(0.5, LO, MID, HI)).toBe('rgb(155,95,196)');
    expect(rampColor3(1, LO, MID, HI)).toBe('rgb(226,87,79)');
  });
  it('interpolates within the lower half', () => {
    expect(rampColor3(0.25, LO, MID, HI)).toBe('rgb(109,106,205)');
  });
  it('clamps out-of-range t to the endpoints', () => {
    expect(rampColor3(-1, LO, MID, HI)).toBe('rgb(63,116,214)');
    expect(rampColor3(2, LO, MID, HI)).toBe('rgb(226,87,79)');
  });
  it('scoreT still maps strong scores toward 1', () => {
    expect(scoreT(1)).toBe(0);
    expect(scoreT(1e-6)).toBe(1);
  });
});
