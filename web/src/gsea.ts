import type { GmtTerm } from './types.ts';

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
export function gseaScores(gmt: GmtTerm[], ranked: RankedItem[]): Array<{
  term: GmtTerm; size: number; es: number; peak: number; leading_edge: string[];
}> {
  const sorted = rankedSorted(ranked);
  const genes = sorted.map((s) => s.gene);
  const absScores = sorted.map((s) => Math.abs(s.score));
  const index = new Map(genes.map((g, i) => [g, i]));
  return gmt.map((term) => {
    const inSet = new Array<boolean>(genes.length).fill(false);
    let size = 0;
    for (const g of term.list_of_values) { const i = index.get(g); if (i !== undefined) { inSet[i] = true; size++; } }
    const { es, peak } = enrichmentScore(absScores, inSet);
    return { term, size, es, peak, leading_edge: leadingEdge(genes, inSet, es, peak) };
  });
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

/** ES from an (unsorted) set of hit positions in the ranked list — used for the permutation null. */
function esFromPositions(absScores: number[], positions: number[]): number {
  const n = absScores.length;
  const nh = positions.length;
  if (nh === 0 || nh === n) return 0;
  const sorted = [...positions].sort((a, b) => a - b);
  let nr = 0;
  for (const p of sorted) nr += absScores[p]!;
  if (nr === 0) return 0;
  const missDen = n - nh;
  let cum = 0; let top = 0; let bottom = 0;
  for (let k = 0; k < nh; k++) {
    const misses = sorted[k]! - k;
    const before = cum / nr - misses / missDen;
    if (before < bottom) bottom = before;
    cum += absScores[sorted[k]!]!;
    const after = cum / nr - misses / missDen;
    if (after > top) top = after;
  }
  return top >= -bottom ? top : bottom;
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

export interface GseaOptions { permutations?: number; seed?: number }

/**
 * Ranked-list GSEA. ES + leading edge are exact (match fgsea::calcGseaStat); NES and the p-value
 * come from a classic gene-permutation null (default 1000 permutations, seeded), so they are
 * tolerance-parity with fgsea's multilevel p. BH across terms.
 */
export function gsea(gmt: GmtTerm[], ranked: RankedItem[], opts: GseaOptions = {}): GseaRow[] {
  const permutations = opts.permutations ?? 1000;
  const rand = mulberry32(opts.seed ?? 42);
  const sorted = rankedSorted(ranked);
  const absScores = sorted.map((s) => Math.abs(s.score));
  const n = absScores.length;
  const scores = gseaScores(gmt, ranked);

  const pvals = scores.map((s) => {
    if (s.size === 0 || s.es === 0) return { nes: 0, p: 1 };
    let posCount = 0; let negCount = 0; let posSum = 0; let negSum = 0;
    let asExtreme = 0;
    for (let k = 0; k < permutations; k++) {
      const es = esFromPositions(absScores, sampleDistinct(n, s.size, rand));
      if (es >= 0) { posCount++; posSum += es; } else { negCount++; negSum += -es; }
      if (s.es >= 0) { if (es >= s.es) asExtreme++; } else if (es <= s.es) asExtreme++;
    }
    const denom = s.es >= 0 ? posCount : negCount;
    const meanAbs = s.es >= 0 ? (posCount ? posSum / posCount : 0) : (negCount ? negSum / negCount : 0);
    const nes = meanAbs > 0 ? s.es / meanAbs : 0;
    const p = (1 + asExtreme) / (1 + denom);
    return { nes, p };
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
    leading_edge: s.leading_edge,
  }));
}
