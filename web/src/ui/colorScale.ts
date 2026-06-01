const RAMP_LO = '#3f74d6', RAMP_MID = '#9b5fc4', RAMP_HI = '#e2574f';

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

/** 3-stop diverging ramp: lo→mid for t∈[0,.5], mid→hi for t∈[.5,1]. Clamps t to [0,1]. Pure. */
export function rampColor3(t: number, lo = RAMP_LO, mid = RAMP_MID, hi = RAMP_HI): string {
  const u = Math.max(0, Math.min(1, t));
  return u < 0.5 ? rampColor(u / 0.5, lo, mid) : rampColor((u - 0.5) / 0.5, mid, hi);
}

/** Significance → [0,1]: stronger (smaller score) → 1, saturating around 1e-6. Pure. */
export function scoreT(score: number): number {
  const v = Math.max(-Math.log10(Math.max(score, 1e-10)), 0);
  return Math.max(0, Math.min(1, v / 6));
}

function currentRamp(): [string, string, string] {
  if (typeof document === 'undefined' || typeof getComputedStyle === 'undefined') return [RAMP_LO, RAMP_MID, RAMP_HI];
  const cs = getComputedStyle(document.documentElement);
  return [
    cs.getPropertyValue('--ramp-lo').trim() || RAMP_LO,
    cs.getPropertyValue('--ramp-mid').trim() || RAMP_MID,
    cs.getPropertyValue('--ramp-hi').trim() || RAMP_HI,
  ];
}

/** Map a significance score to the diverging ramp colour (theme-aware via --ramp-lo/-mid/-hi). */
export function scoreToColor(score: number): string {
  const [lo, mid, hi] = currentRamp();
  return rampColor3(scoreT(score), lo, mid, hi);
}
