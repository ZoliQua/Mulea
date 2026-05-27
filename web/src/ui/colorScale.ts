const RAMP_LO = '#bcddcb', RAMP_HI = '#1d5c41';

function hexToRgb(h: string): [number, number, number] {
  const m = h.replace('#', '').trim();
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

/** Lerp between two hex colours, returning an rgb() string. Pure. */
export function rampColor(t: number, lo = RAMP_LO, hi = RAMP_HI): string {
  const A = hexToRgb(lo), B = hexToRgb(hi);
  const c = (i: 0 | 1 | 2) => Math.round(A[i] + (B[i] - A[i]) * t);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}

/** Significance → [0,1]: stronger (smaller score) → 1, saturating around 1e-6. Pure. */
export function scoreT(score: number): number {
  const v = Math.max(-Math.log10(Math.max(score, 1e-10)), 0);
  return Math.max(0, Math.min(1, v / 6));
}

function currentRamp(): [string, string] {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return [RAMP_LO, RAMP_HI];
  const cs = getComputedStyle(document.documentElement);
  return [cs.getPropertyValue('--ramp-lo').trim() || RAMP_LO, cs.getPropertyValue('--ramp-hi').trim() || RAMP_HI];
}

/** Map a significance score to a green sequential ramp colour (theme-aware via --ramp-lo/-hi). */
export function scoreToColor(score: number): string {
  const [lo, hi] = currentRamp();
  return rampColor(scoreT(score), lo, hi);
}
