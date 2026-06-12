/**
 * ⚠ WORK IN PROGRESS — NOT YET TOLERANCE-PARITY, NOT wired into gsea(). A faithful port of the fgsea
 * multilevel p-value (Korotkevich et al. 2021 / ctlab/fgsea src/fgseaMultilevelSupplement.cpp). The
 * structure (adaptive splitting + Metropolis swap MCMC + digamma estimator + (ES,hash) tie-split) is
 * in place and internally consistent, but it OVER-ESTIMATES the smallest p-values by ~0.7–2.2 log10
 * on the E. coli example (runs ~18 levels where fgsea runs ~25). Ruled out: too-few-moves and the
 * tie-split (neither fixed it). Most likely remaining cause: fgsea samples the CONDITIONAL {sr ≥ 0}
 * half-space (the matching-sign sets) via separate pos/neg rulers, with denomProb = P(sr ≥ 0) from
 * the simple pre-pass restoring the unconditional p — this port samples unconditionally. See the
 * round notes; the reference fixture (fgsea_multilevel_reference.csv) is the validation target.
 *
 * Estimates P(sr⁺(q) ≥ γ) for a random size-k gene set by adaptive multilevel splitting + a
 * Metropolis swap MCMC conditioned on ES ≥ a level bound.
 *
 * KEY detail (the reason a naive port loses levels on tied data): each sample carries a per-sample
 * hash (XOR of seeded per-gene hashes), and samples are ordered by (ES, hash). The level bound is a
 * (score, hash) pair, so the heavy boundary ties — ~92% of ranks tie in the E. coli example — are
 * split ≈50/50 between the surviving high half and the discarded low half, keeping each level's
 * probability at ½. The p-value is the digamma estimator of the per-level survivor counts.
 *
 * TOLERANCE-parity, not bit-parity: fgsea uses boost mt19937 + 128-bit exact ES; we use a seeded JS
 * PRNG + float ES with the same (ES, hash) tie rule. Target: match fgsea within its log2err.
 */

export function digamma(x: number): number {
  let r = 0;
  while (x < 6) { r -= 1 / x; x += 1; }
  const f = 1 / (x * x);
  return r + Math.log(x) + 0.5 / x - f * (1 / 12 - f * (1 / 120 - f * (1 / 252 - f * (1 / 240 - f / 132))));
}
export function trigamma(x: number): number {
  let r = 0;
  while (x < 6) { r += 1 / (x * x); x += 1; }
  const f = 1 / (x * x);
  return r + 1 / x + f / 2 + (f / x) * (1 / 6 - f * (1 / 30 - f * (1 / 42 - f / 30)));
}
const betaMeanLog = (a: number, b: number): number => digamma(a) - digamma(b + 1);
const varPerLevel = (a: number, b: number): number => trigamma(a) - trigamma(b + 1);

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const randInt = (rand: () => number, n: number): number => Math.floor(rand() * n);

/** Positive-tail weighted-KS enrichment score for sorted hit positions. */
function esPlus(sortedPos: number[], weights: number[], n: number): number {
  const k = sortedPos.length;
  if (k === 0 || k === n) return 0;
  let nr = 0;
  for (const p of sortedPos) nr += weights[p]!;
  if (nr === 0) return 0;
  const missDen = n - k;
  let cum = 0; let top = 0;
  for (let i = 0; i < k; i++) { const pos = sortedPos[i]!; cum += weights[pos]!; const dev = cum / nr - (pos - i) / missDen; if (dev > top) top = dev; }
  return top;
}

function sampleSorted(n: number, k: number, rand: () => number): number[] {
  const set = new Set<number>();
  for (let i = n - k; i < n; i++) { const j = randInt(rand, i + 1); set.add(set.has(j) ? i : j); }
  return [...set].sort((a, b) => a - b);
}

const hashOf = (pos: number[], geneHash: number[]): number => { let h = 0; for (const p of pos) h ^= geneHash[p]!; return h >>> 0; };

/** (ES, hash) ≥ (bound.es, bound.hash) — the boundary-tie-splitting comparison. */
const isHigh = (es: number, hash: number, bes: number, bhash: number): boolean =>
  es > bes || (es === bes && hash > bhash);

/** Metropolis swap decorrelation conditioned on (ES, hash) ≥ bound; returns updated hash. */
function decorrelate(pos: number[], hash0: number, bes: number, bhash: number, weights: number[], n: number, geneHash: number[], rand: () => number): number {
  const k = pos.length;
  const inSet = new Set(pos);
  let hash = hash0;
  let accepted = 0;
  let attempts = 0;
  const maxAttempts = k * 80 + 200;
  while (accepted < k && attempts < maxAttempts) {
    attempts++;
    const gi = randInt(rand, k);
    const g = pos[gi]!;
    const gp = randInt(rand, n);
    if (inSet.has(gp)) continue;
    const cand = pos.slice(); cand[gi] = gp; cand.sort((a, b) => a - b);
    const nh = (hash ^ geneHash[g]! ^ geneHash[gp]!) >>> 0;
    if (isHigh(esPlus(cand, weights, n), nh, bes, bhash)) {
      inSet.delete(g); inSet.add(gp);
      for (let i = 0; i < k; i++) pos[i] = cand[i]!;
      hash = nh; accepted++;
    }
  }
  return hash;
}

export interface MultilevelResult { logPval: number; log2err: number; levels: number }

/** Estimate log P(sr⁺(q) ≥ gamma) for a random size-k set over `weights` via the multilevel scheme. */
export function multilevelLogPval(
  weights: number[], k: number, gamma: number, Z: number, eps: number, seed: number,
): MultilevelResult {
  const n = weights.length;
  const rand = mulberry32(seed);
  const geneHash = Array.from({ length: n }, () => (rand() * 4294967296) >>> 0);
  const logEps = eps > 0 ? Math.log(eps) : -Infinity;

  let samples: number[][] = [];
  let hashes: number[] = [];
  for (let i = 0; i < Z; i++) { const s = sampleSorted(n, k, rand); samples.push(s); hashes.push(hashOf(s, geneHash)); }

  let logPval = 0;
  let lvlVar = 0;
  const mid = Math.floor(Z / 2);
  const MAX_LEVELS = 4000;
  for (let level = 0; level < MAX_LEVELS; level++) {
    const es = samples.map((s) => esPlus(s, weights, n));
    const order = es.map((_, i) => i).sort((a, b) => es[a]! - es[b]! || hashes[a]! - hashes[b]!);
    const bIdx = order[mid]!;                       // median (ES, hash) = the level bound
    const bes = es[bIdx]!; const bhash = hashes[bIdx]!;

    if (bes >= gamma) {                             // bound reached γ → final partial level
      let survivors = 0;
      for (let i = 0; i < Z; i++) if (isHigh(es[i]!, hashes[i]!, gamma - 1e-300, -1)) { if (es[i]! >= gamma) survivors++; }
      logPval += betaMeanLog(Math.max(1, survivors), Z);
      lvlVar += varPerLevel(Math.max(1, survivors), Z);
      return { logPval, log2err: Math.sqrt(lvlVar) / Math.LN2, levels: level };
    }
    // survivors of THIS level = samples strictly above the (ES,hash) bound
    let highCount = 0;
    for (let i = 0; i < Z; i++) if (isHigh(es[i]!, hashes[i]!, bes, bhash)) highCount++;
    logPval += betaMeanLog(highCount + 1, Z);
    lvlVar += varPerLevel(highCount + 1, Z);
    if (logPval < logEps) return { logPval: logEps, log2err: NaN, levels: level };

    // refill: keep the high half, replace the low slots by uniform-with-replacement draws from the high
    const high = order.filter((i) => isHigh(es[i]!, hashes[i]!, bes, bhash));
    if (high.length === 0 || high.length === Z) break;     // degenerate (all-equal) → stop
    const next: number[][] = []; const nextH: number[] = [];
    for (const i of high) { next.push(samples[i]!.slice()); nextH.push(hashes[i]!); }
    while (next.length < Z) { const src = high[randInt(rand, high.length)]!; next.push(samples[src]!.slice()); nextH.push(hashes[src]!); }
    // decorrelate every sample at the bound
    for (let i = 0; i < Z; i++) nextH[i] = decorrelate(next[i]!, nextH[i]!, bes, bhash, weights, n, geneHash, rand);
    samples = next; hashes = nextH;
  }
  return { logPval, log2err: Math.sqrt(lvlVar) / Math.LN2, levels: MAX_LEVELS };
}
