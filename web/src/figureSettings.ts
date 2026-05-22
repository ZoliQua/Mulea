import type { CSSProperties } from 'react';

export type FontFamily = 'sans' | 'serif' | 'mono';
export type Palette = 'default' | 'colorblind';

export interface FigureSettings {
  fontFamily: FontFamily;
  labelFontSize: number;
  scale: number;
  accentColor: string;
  outlineColor: string;
  outlineWidth: number;
  vennTransparency: number;
}

export const DEFAULT_SETTINGS: FigureSettings = {
  fontFamily: 'sans',
  labelFontSize: 11,
  scale: 1,
  accentColor: '#2f7d5d',
  outlineColor: '#1f2933',
  outlineWidth: 0,
  vennTransparency: 0.18,
};

/** Merge a global partial then a per-figure partial over the defaults (per-figure wins). Pure. */
export function effectiveSettings(global: Partial<FigureSettings>, perFigure: Partial<FigureSettings>): FigureSettings {
  return { ...DEFAULT_SETTINGS, ...global, ...perFigure };
}

export function fontStack(f: FontFamily): string {
  return f === 'serif' ? 'Georgia, "Times New Roman", serif'
    : f === 'mono' ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
    : 'system-ui, -apple-system, sans-serif';
}

/** CSS custom properties to set on a figure's SVG/table root so the token CSS picks them up. */
export function figureVars(s: FigureSettings): CSSProperties {
  return {
    '--fig-font': fontStack(s.fontFamily),
    '--fig-label': `${s.labelFontSize}px`,
    '--fig-accent': s.accentColor,
    '--fig-outline': s.outlineColor,
    '--fig-outline-w': String(s.outlineWidth),
  } as CSSProperties;
}
