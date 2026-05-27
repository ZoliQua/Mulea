import { describe, it, expect } from 'vitest';
import { scoreT, rampColor } from '../src/ui/colorScale.ts';

describe('scoreT', () => {
  it('maps stronger significance (smaller score) toward 1, saturating at 1e-6', () => {
    expect(scoreT(1)).toBe(0);
    expect(scoreT(1e-3)).toBeCloseTo(0.5, 5);
    expect(scoreT(1e-6)).toBe(1);
    expect(scoreT(1e-9)).toBe(1);
  });
});

describe('rampColor', () => {
  it('lerps from lo at t=0 to hi at t=1', () => {
    expect(rampColor(0, '#000000', '#ffffff')).toBe('rgb(0,0,0)');
    expect(rampColor(1, '#000000', '#ffffff')).toBe('rgb(255,255,255)');
    expect(rampColor(0.5, '#000000', '#ffffff')).toBe('rgb(128,128,128)');
  });
});
