import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, effectiveSettings } from '../src/figureSettings.ts';

describe('effectiveSettings', () => {
  it('returns the defaults when nothing is overridden', () => {
    expect(effectiveSettings({}, {})).toEqual(DEFAULT_SETTINGS);
  });
  it('applies a global override', () => {
    expect(effectiveSettings({ labelFontSize: 16 }, {}).labelFontSize).toBe(16);
  });
  it('lets a per-figure override win over the global and the default', () => {
    const s = effectiveSettings({ accentColor: '#111111', scale: 1.5 }, { accentColor: '#222222' });
    expect(s.accentColor).toBe('#222222');
    expect(s.scale).toBe(1.5);
    expect(s.fontFamily).toBe(DEFAULT_SETTINGS.fontFamily);
  });
});
