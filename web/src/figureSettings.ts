import type { CSSProperties } from 'react';
import type { SortOrder } from './lollipop.ts';

export type FontFamily = 'sans' | 'serif' | 'mono';
export type Palette = 'default' | 'colorblind';
export type { SortOrder };

export interface FigureSettings {
  fontFamily: FontFamily;
  labelFontSize: number;
  scale: number;
  accentColor: string;
  outlineColor: string;
  outlineWidth: number;
  vennTransparency: number;
  titleText: string;
  titleFontSize: number;
  sortOrder: SortOrder;
}

export const DEFAULT_SETTINGS: FigureSettings = {
  fontFamily: 'sans',
  labelFontSize: 11,
  scale: 1,
  accentColor: '#2f7d5d',
  outlineColor: '#1f2933',
  outlineWidth: 0,
  vennTransparency: 0.18,
  titleText: '',
  titleFontSize: 14,
  sortOrder: 'score',
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
  const vars: Record<string, string> = {
    '--fig-font': fontStack(s.fontFamily),
    '--fig-accent': s.accentColor,
    '--fig-outline': s.outlineColor,
    '--fig-outline-w': String(s.outlineWidth),
  };
  // Only override the label size when the user changed it, so each figure keeps its own
  // CSS default size (table 13 / charts 10–11 / venn 13) until explicitly customised.
  if (s.labelFontSize !== DEFAULT_SETTINGS.labelFontSize) vars['--fig-label'] = `${s.labelFontSize}px`;
  return vars as CSSProperties;
}
