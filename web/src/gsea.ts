import type { GmtTerm } from './types.ts';
import { enrichmentScoreWeightedDetail } from './gseaWeighting.ts';

export type ScoreType = 'std' | 'pos' | 'neg';

/**
 * Ranked-list GSEA — the paper's method (weighted Kolmogorov–Smirnov enrichment score + a
 * permutation test, via fgsea). The ES and leading edge are deterministic and match fgsea exactly;
 * NES and the p-value come from a classic gene-permutation null, so they are tolerance-parity with
 * fgsea's multilevel p (see VALIDATION.md).
 *
 * Ties: ~92% of the example logFC values tie. fgsea (R `order`) breaks ties by input order with a
 * stable sort; we do the same (stable descending), so the ES is reproducible and matches fgsea.
 */

export interface RankedItem { gene: string; score: number }

export interface GseaRow {
  ontology_id: string;
  ontology_name: string;
  size: number;
  es: number;
  nes: number;
  p_value: number;
  adjusted_p_value: number;
  /**
   * mulea's progressive rank-based empirical FDR (Turek et al. 2024), extended from ORA to GSEA on
   * the NES statistic. This is NOT a replacement for fgsea's permutation FDR (BH on the multilevel
   * p, reported as `adjusted_p_value`): it is the same resampling-rank eFDR mulea applies in ORA,
   * computed here from the gene-permutation null already drawn for the NES. eFDR_j =
   * min(R_exp_j / R_obs_j, 1) where R_obs_j counts observed terms with |NES_i| ≥ |NES_j| and R_exp_j
   * is the per-permutation mean count of pooled null |NES| reaching |NES_j|. See PARITY.md.
   */
  efdr: number;
  leading_edge: string[];
}

/** Parse a two-column `gene<TAB>score` ranked list (a header line is auto-detected and skipped). */
export function parseRanked(text: string): RankedItem[] {
  const out: RankedItem[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const [gene, raw] = t.split(/\t|,|\s+/);
    const score = Number(raw);
    if (!gene || !Number.isFinite(score)) continue; // skips the header row
    out.push({ gene, score });
  }
  return out;
}

/** Stable descending sort by score; ties keep input order (matches R `order(decreasing=TRUE)`). */
export function rankedSorted(items: RankedItem[]): RankedItem[] {
  return items.map((it, i) => ({ it, i })).sort((a, b) => b.it.score - a.it.score || a.i - b.i).map((x) => x.it);
}

/**
 * Weighted KS enrichment score (gseaParam=1, scoreType="std") for a boolean membership mask.
 * Uses fgsea's hit-only accumulation (evaluate the deviation only at hit positions) rather than a
 * full N-step running sum, so the floating-point result matches fgsea to ~1e-12 instead of drifting
 * ~1e-6 from accumulating the miss step N times.
 */
export function enrichmentScore(
  absScores: number[],
  inSet: boolean[],
): { es: number; peak: number; nr: number; nh: number } {
  const n = absScores.length;
  const hitPos: number[] = [];
  const hitW: number[] = [];
  let nr = 0;
  for (let i = 0; i < n; i++) if (inSet[i]) { hitPos.push(i); hitW.push(absScores[i]!); nr += absScores[i]!; }
  const nh = hitPos.length;
  if (nh === 0 || nr === 0 || nh === n) return { es: 0, peak: -1, nr, nh };
  const missDen = n - nh;
  let cum = 0;
  let top = 0; let bottom = 0;
  let topPeak = -1; let botPeak = -1;
  for (let k = 0; k < nh; k++) {
    const pos = hitPos[k]!;               // 0-indexed position in the ranked list
    const misses = pos - k;               // misses strictly before this hit
    const before = cum / nr - misses / missDen;   // dip just before this hit
    if (before < bottom) { bottom = before; botPeak = pos; }
    cum += hitW[k]!;
    const after = cum / nr - misses / missDen;     // peak just after this hit
    if (after > top) { top = after; topPeak = pos; }
  }
  // scoreType "std": the larger absolute deviation, signed.
  if (top >= -bottom) return { es: top, peak: topPeak, nr, nh };
  return { es: bottom, peak: botPeak, nr, nh };
}

/** Leading-edge genes: the set members driving the ES up to (ES>0) or from (ES<0) the peak. */
function leadingEdge(genes: string[], inSet: boolean[], es: number, peak: number): string[] {
  const out: string[] = [];
  if (peak < 0) return out;
  if (es >= 0) { for (let i = 0; i <= peak; i++) if (inSet[i]) out.push(genes[i]!); }
  else { for (let i = genes.length - 1; i >= peak; i--) if (inSet[i]) out.push(genes[i]!); }
  return out;
}

/** Deterministic ES + leading edge per term (no permutation). NES/p are added by `gsea`. */
export function gseaScores(
  gmt: GmtTerm[], ranked: RankedItem[], gseaParam = 1, scoreType: ScoreType = 'std',
): Array<{ term: GmtTerm; size: number; es: number; peak: number; leading_edge: string[] }> {
  const sorted = rankedSorted(ranked);
  const genes = sorted.map((s) => s.gene);
  const signed = sorted.map((s) => s.score);
  const index = new Map(genes.map((g, i) => [g, i]));
  return gmt.map((term) => {
    const inSet = new Array<boolean>(genes.length).fill(false);
    let size = 0;
    for (const g of term.list_of_values) { const i = index.get(g); if (i !== undefined) { inSet[i] = true; size++; } }
    const { es, peak } = enrichmentScoreWeightedDetail(signed, inSet, gseaParam, scoreType);
    return { term, size, es, peak, leading_edge: leadingEdge(genes, inSet, es, peak) };
  });
}

/** Full running-enrichment curve for one term (for the running-ES plot). */
export function runningEnrichment(termGenes: string[], ranked: RankedItem[]): {
  curve: number[]; hitIndices: number[]; es: number; peak: number; n: number;
} {
  const sorted = rankedSorted(ranked);
  const absScores = sorted.map((s) => Math.abs(s.score));
  const n = sorted.length;
  const set = new Set(termGenes);
  const inSet = sorted.map((s) => set.has(s.gene));
  let nr = 0; let nh = 0;
  for (let i = 0; i < n; i++) if (inSet[i]) { nr += absScores[i]!; nh++; }
  const curve = new Array<number>(n);
  const hitIndices: number[] = [];
  if (nh === 0 || nr === 0 || nh === n) { curve.fill(0); return { curve, hitIndices, es: 0, peak: -1, n }; }
  const missStep = 1 / (n - nh);
  let run = 0; let es = 0; let peak = -1;
  for (let i = 0; i < n; i++) {
    run += inSet[i] ? absScores[i]! / nr : -missStep;
    curve[i] = run;
    if (inSet[i]) hitIndices.push(i);
    if (Math.abs(run) > Math.abs(es)) { es = run; peak = i; }
  }
  return { curve, hitIndices, es, peak, n };
}

/** Deterministic seeded PRNG (mulberry32) — reproducible permutation null. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ES from an (unsorted) set of hit positions — used for the permutation null (weighted, scoreType). */
function esFromPositions(signedScores: number[], positions: number[], gseaParam: number, scoreType: ScoreType): number {
  const n = signedScores.length;
  const nh = positions.length;
  if (nh === 0 || nh === n) return 0;
  const w = (s: number): number => { const a = Math.abs(s); return gseaParam === 1 ? a : Math.pow(a, gseaParam); };
  const sorted = [...positions].sort((a, b) => a - b);
  let nr = 0;
  for (const p of sorted) nr += w(signedScores[p]!);
  if (nr === 0) return 0;
  const missDen = n - nh;
  let cum = 0; let top = 0; let bottom = 0;
  for (let k = 0; k < nh; k++) {
    const misses = sorted[k]! - k;
    const before = cum / nr - misses / missDen;
    if (before < bottom) bottom = before;
    cum += w(signedScores[sorted[k]!]!);
    const after = cum / nr - misses / missDen;
    if (after > top) top = after;
  }
  if (scoreType === 'pos') return top;
  if (scoreType === 'neg') return bottom;
  return top >= -bottom ? top : bottom;
}

/** Index of the first element ≥ x in an ascending array (so `len - lowerBound` counts values ≥ x). */
function lowerBound(sorted: number[], x: number): number {
  let lo = 0; let hi = sorted.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (sorted[mid]! < x) lo = mid + 1; else hi = mid; }
  return lo;
}

/** Floyd's algorithm: `k` distinct integers in [0, n) using the given PRNG. */
function sampleDistinct(n: number, k: number, rand: () => number): number[] {
  const set = new Set<number>();
  for (let i = n - k; i < n; i++) {
    const j = Math.floor(rand() * (i + 1));
    set.add(set.has(j) ? i : j);
  }
  return [...set];
}

export interface GseaOptions { permutations?: number; seed?: number; gseaParam?: number; scoreType?: ScoreType }

/**
 * Ranked-list GSEA. ES + leading edge are exact (match fgsea::calcGseaStat); NES and the p-value
 * come from a classic gene-permutation null (default 1000 permutations, seeded), so they are
 * tolerance-parity with fgsea's multilevel p. BH across terms.
 */
export function gsea(gmt: GmtTerm[], ranked: RankedItem[], opts: GseaOptions = {}): GseaRow[] {
  const permutations = opts.permutations ?? 1000;
  const gseaParam = opts.gseaParam ?? 1;
  const scoreType = opts.scoreType ?? 'std';
  const rand = mulberry32(opts.seed ?? 42);
  const sorted = rankedSorted(ranked);
  const signedScores = sorted.map((s) => s.score);
  const n = signedScores.length;
  const scores = gseaScores(gmt, ranked, gseaParam, scoreType);

  // First pass: per term, draw the gene-permutation null once and retain each permutation's null ES
  // alongside the same-sign means needed to normalise both the observed ES (→ NES) and every null ES
  // (→ null NES). Retaining the raw null ES per (term, perm) lets the second pass build the pooled
  // null-NES distribution the rank-based eFDR needs (cf. ORA's pooled hypergeometric null mass).
  const pvals = scores.map((s) => {
    if (s.size === 0 || s.es === 0) return { nes: 0, p: 1, nullEs: [] as number[], posMean: 0, negMean: 0 };
    let posCount = 0; let negCount = 0; let posSum = 0; let negSum = 0;
    let asExtreme = 0;
    const nullEs = new Array<number>(permutations);
    for (let k = 0; k < permutations; k++) {
      const es = esFromPositions(signedScores, sampleDistinct(n, s.size, rand), gseaParam, scoreType);
      nullEs[k] = es;
      if (es >= 0) { posCount++; posSum += es; } else { negCount++; negSum += -es; }
      if (s.es >= 0) { if (es >= s.es) asExtreme++; } else if (es <= s.es) asExtreme++;
    }
    const denom = s.es >= 0 ? posCount : negCount;
    const posMean = posCount ? posSum / posCount : 0;
    const negMean = negCount ? negSum / negCount : 0;
    const meanAbs = s.es >= 0 ? posMean : negMean;
    const nes = meanAbs > 0 ? s.es / meanAbs : 0;
    const p = (1 + asExtreme) / (1 + denom);
    return { nes, p, nullEs, posMean, negMean };
  });

  // Second pass — mulea's progressive rank-based eFDR (Turek et al. 2024), extended from ORA's
  // p-value rank to the GSEA NES statistic. Normalise each retained null ES the SAME way as the
  // observed NES — divide by the same-sign mean |null ES| of its own term — to get a null NES, then
  // pool every |null NES| across all (term, perm) and sort once. For each observed term j:
  //   R_obs_j = #{ observed i : |NES_i| ≥ |NES_j| }
  //   R_exp_j = (1/permutations) · #{ (term i, perm s) : |nullNES_i^s| ≥ |NES_j| }   (binary search)
  //   eFDR_j  = min(R_exp_j / R_obs_j, 1)
  // This is the resampling FDR mulea reports, NOT fgsea's BH-on-p adjusted_p_value.
  const nullAbsNes: number[] = [];
  for (const v of pvals) {
    if (v.nullEs.length === 0) continue;
    for (const e of v.nullEs) {
      const m = e >= 0 ? v.posMean : v.negMean;
      if (m > 0) nullAbsNes.push(Math.abs(e) / m); // |null NES|; same normalisation as the NES
    }
  }
  nullAbsNes.sort((a, b) => a - b);

  const absNes = pvals.map((v) => Math.abs(v.nes));
  const efdr = absNes.map((an) => {
    if (!(an > 0)) return 1; // NES==0 (empty/zero-ES term) — least extreme, eFDR clamps to 1
    let rObs = 0;
    for (const x of absNes) if (x >= an) rObs++;
    const ge = nullAbsNes.length - lowerBound(nullAbsNes, an); // #{ |nullNES| ≥ an }
    const rExp = ge / permutations;
    return Math.min(rExp / rObs, 1);
  });

  // BH across terms
  const ps = pvals.map((x) => x.p);
  const order = ps.map((_, i) => i).sort((a, b) => ps[a]! - ps[b]!);
  const adj = new Array<number>(ps.length);
  let prev = 1;
  for (let r = ps.length - 1; r >= 0; r--) {
    const i = order[r]!;
    prev = Math.min(prev, (ps[i]! * ps.length) / (r + 1));
    adj[i] = prev;
  }

  return scores.map((s, i) => ({
    ontology_id: s.term.ontology_id,
    ontology_name: s.term.ontology_name,
    size: s.size,
    es: s.es,
    nes: pvals[i]!.nes,
    p_value: pvals[i]!.p,
    adjusted_p_value: adj[i]!,
    efdr: efdr[i]!,
    leading_edge: s.leading_edge,
  }));
}
