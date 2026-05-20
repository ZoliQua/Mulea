/** Map a significance score to a theme-aware CSS variable reference (resolved per light/dark theme). */
export function scoreToColor(score: number): string {
  return score < 0.001 ? 'var(--score-strong)' : score < 0.01 ? 'var(--score-mid)' : 'var(--score-weak)';
}
