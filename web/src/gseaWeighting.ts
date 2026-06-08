/**
 * Configurable weighted-KS enrichment score — the gseaParam / scoreType knobs that
 * fgsea::calcGseaStat exposes, kept numerically identical to fgsea.
 *
 * Generalises `enrichmentScore` in ./gsea.ts (which hard-codes gseaParam=1, scoreType="std"). Same
 * hit-only accumulation (deviation evaluated only at hit positions) so the result matches fgsea to
 * ~1e-12. At gseaParam=1, scoreType="std" it is bit-identical to enrichmentScore.
 *
 * gseaParam: per-gene weight = |score|^gseaParam. 0 = unweighted KS; 1 = GSEA default; >1 sharpens.
 * scoreType: 'std' = larger absolute deviation, signed (two-sided); 'pos' = max positive deviation
 * only (enriched at top); 'neg' = min negative deviation only (enriched at bottom).
 *
 * Pass the *signed* per-gene scores; weights use Math.abs internally.
 */
export interface EsDetail { es: number; peak: number }

export function enrichmentScoreWeightedDetail(
  scores: number[],
  inSet: boolean[],
  gseaParam: number,
  scoreType: 'std' | 'pos' | 'neg',
): EsDetail {
  const n = scores.length;
  const weight = (s: number): number => { const a = Math.abs(s); return gseaParam === 1 ? a : Math.pow(a, gseaParam); };

  const hitPos: number[] = [];
  const hitW: number[] = [];
  let nr = 0;
  for (let i = 0; i < n; i++) {
    if (inSet[i]) { const w = weight(scores[i]!); hitPos.push(i); hitW.push(w); nr += w; }
  }
  const nh = hitPos.length;
  if (nh === 0 || nr === 0 || nh === n) return { es: 0, peak: -1 };

  const missDen = n - nh;
  let cum = 0;
  let top = 0; let bottom = 0;
  let topPeak = -1; let botPeak = -1;
  for (let k = 0; k < nh; k++) {
    const pos = hitPos[k]!;            // 0-indexed position in the ranked list
    const misses = pos - k;            // misses strictly before this hit
    const before = cum / nr - misses / missDen;   // dip just before this hit
    if (before < bottom) { bottom = before; botPeak = pos; }
    cum += hitW[k]!;
    const after = cum / nr - misses / missDen;     // peak just after this hit
    if (after > top) { top = after; topPeak = pos; }
  }

  if (scoreType === 'pos') return { es: top, peak: topPeak };
  if (scoreType === 'neg') return { es: bottom, peak: botPeak };
  return top >= -bottom ? { es: top, peak: topPeak } : { es: bottom, peak: botPeak };
}

/** Weighted-KS enrichment score (value only). */
export function enrichmentScoreWeighted(
  scores: number[],
  inSet: boolean[],
  gseaParam: number,
  scoreType: 'std' | 'pos' | 'neg',
): number {
  return enrichmentScoreWeightedDetail(scores, inSet, gseaParam, scoreType).es;
}
