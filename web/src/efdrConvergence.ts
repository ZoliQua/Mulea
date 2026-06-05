import { setBasedEnrichmentTest } from './efdr.ts';
import { setBasedEnrichmentTestMc } from './efdrMc.ts';
import type { GmtTerm } from './types.ts';

/**
 * Empirical convergence of the WASM Monte-Carlo eFDR to the deterministic analytic eFDR.
 *
 * The analytic path (`setBasedEnrichmentTest`) is the S→∞ limit of the resampling estimator
 * (see PARITY.md derivation). Per the CLT the Monte-Carlo error should fall like O(1/√steps);
 * these helpers measure that and let a test/benchmark fit the exponent.
 */

export interface ConvergencePoint {
  steps: number;
  /** median over seeds of max_j |eFDR_mc − eFDR_exact| */
  maxAbs: number;
  /** median over seeds of sqrt(mean_j (eFDR_mc − eFDR_exact)^2) */
  rms: number;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

/** Error of one Monte-Carlo run vs the analytic reference, over the finite-valued terms. */
function errorVsExact(mc: number[], exact: number[]): { maxAbs: number; rms: number } {
  let maxAbs = 0;
  let sumSq = 0;
  let n = 0;
  for (let i = 0; i < mc.length; i++) {
    const a = mc[i]!;
    const b = exact[i]!;
    if (Number.isFinite(a) && Number.isFinite(b)) {
      const d = Math.abs(a - b);
      if (d > maxAbs) maxAbs = d;
      sumSq += d * d;
      n++;
    }
  }
  return { maxAbs, rms: n > 0 ? Math.sqrt(sumSq / n) : 0 };
}

/** Measure MC-vs-analytic error at one `steps` value, taking the median over `seeds` runs. */
export async function measureConvergencePoint(
  gmt: GmtTerm[],
  target: string[],
  background: string[],
  steps: number,
  seeds: number[],
): Promise<ConvergencePoint> {
  const exact = setBasedEnrichmentTest(gmt, target, background).map((r) => r.eFDR);
  const maxAbsRuns: number[] = [];
  const rmsRuns: number[] = [];
  for (const seed of seeds) {
    const mc = (await setBasedEnrichmentTestMc(gmt, target, background, steps, seed)).map((r) => r.eFDR);
    const e = errorVsExact(mc, exact);
    maxAbsRuns.push(e.maxAbs);
    rmsRuns.push(e.rms);
  }
  return { steps, maxAbs: median(maxAbsRuns), rms: median(rmsRuns) };
}

/** Ordinary least-squares slope of log10(y) on log10(x); the predicted convergence slope is −0.5. */
export function fitLogLogSlope(points: Array<{ x: number; y: number }>): number {
  const pts = points.filter((p) => p.x > 0 && p.y > 0);
  const n = pts.length;
  if (n < 2) return NaN;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const p of pts) {
    const lx = Math.log10(p.x);
    const ly = Math.log10(p.y);
    sx += lx; sy += ly; sxx += lx * lx; sxy += lx * ly;
  }
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
}
