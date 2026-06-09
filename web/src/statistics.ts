import { MuleaLabError } from './errors.ts';

/** Overflow-safe log-binomial coefficient (mirrors vennDiagramLab). */
export function logChoose(n: number, k: number): number {
  if (k > n || k < 0) return -Infinity;
  if (k === 0 || k === n) return 0;
  const kk = Math.min(k, n - k);
  let result = 0;
  for (let i = 0; i < kk; i++) {
    result += Math.log(n - i) - Math.log(i + 1);
  }
  return result;
}

/**
 * Tail/side of the hypergeometric test:
 *  - 'over'      → P(X >= k), over-representation (the mulea ORA default).
 *  - 'under'     → P(X <= k), depletion / under-representation.
 *  - 'two-sided' → Fisher-style two-sided p-value: the sum of all support
 *                  probabilities that are <= P(X = k) (with a tiny relative
 *                  tolerance for float wobble). This matches R's
 *                  stats::fisher.test() two-sided convention and dhyper-based
 *                  enumeration; it is what the R fixture computes.
 */
export type HypergeometricDirection = 'over' | 'under' | 'two-sided';

/**
 * One-tailed (default) hypergeometric overrepresentation p-value P(X >= commonInSelect),
 * X ~ Hypergeometric(population=poolSize, successes=commonInPool, draws=selectSize),
 * observed k = commonInSelect. With direction = 'over' (default) the result is
 * bit-identical to the original one-tailed function and to mulea R:
 * 1 - phyper(k-1, m, N-m, n). 'under' = phyper(k, m, N-m, n); 'two-sided' is the
 * Fisher-style doubled-tail sum (see HypergeometricDirection).
 */
export function hypergeometricPValue(
  commonInSelect: number,
  commonInPool: number,
  poolSize: number,
  selectSize: number,
  direction: HypergeometricDirection = 'over',
): number {
  if (direction === 'over') {
    if (selectSize === 0 || commonInPool === 0 || commonInSelect === 0) return 1.0;
    const upper = Math.min(commonInPool, selectSize);
    if (commonInSelect > upper) return 0.0; // overlap exceeds the maximum possible → impossible event
    const logDenom = logChoose(poolSize, selectSize);
    let p = 0;
    for (let i = Math.max(0, commonInSelect); i <= upper; i++) {
      const logP = logChoose(commonInPool, i) + logChoose(poolSize - commonInPool, selectSize - i) - logDenom;
      if (logP > -700) p += Math.exp(logP);
    }
    return Math.min(p, 1.0);
  }

  // Support of X = number of common items drawn into the select set.
  const kmin = Math.max(0, selectSize + commonInPool - poolSize);
  const kmax = Math.min(selectSize, commonInPool);
  if (commonInSelect < kmin || commonInSelect > kmax) return 0.0; // outside support → impossible

  if (direction === 'under') {
    let p = 0;
    for (let i = kmin; i <= commonInSelect; i++) {
      p += hypergeometricPmf(i, commonInPool, poolSize, selectSize);
    }
    return Math.min(p, 1.0);
  }

  // direction === 'two-sided': sum probabilities of all outcomes no more likely
  // than the observed one (Fisher-style), matching stats::fisher.test().
  const pObs = hypergeometricPmf(commonInSelect, commonInPool, poolSize, selectSize);
  const tol = 1e-7; // relative tolerance, mirrors R's fisher.test (1 + 1e-7) factor
  let p = 0;
  for (let i = kmin; i <= kmax; i++) {
    const pi = hypergeometricPmf(i, commonInPool, poolSize, selectSize);
    if (pi <= pObs * (1 + tol)) p += pi;
  }
  return Math.min(p, 1.0);
}

/** Hypergeometric pmf P(X = k) for the same parameterization; 0 outside the support. */
export function hypergeometricPmf(
  k: number,
  commonInPool: number,
  poolSize: number,
  selectSize: number,
): number {
  const kmin = Math.max(0, selectSize + commonInPool - poolSize);
  const kmax = Math.min(selectSize, commonInPool);
  if (k < kmin || k > kmax) return 0;
  const logP =
    logChoose(commonInPool, k) +
    logChoose(poolSize - commonInPool, selectSize - k) -
    logChoose(poolSize, selectSize);
  return Math.exp(logP);
}

/** Effect-size summary for a single ORA term. */
export interface EffectSize {
  /** Fold enrichment (k/n)/(K/N): observed overlap fraction vs. expected. */
  fold_enrichment: number;
  /** Natural-log odds ratio of the 2x2 table (Haldane–Anscombe corrected). */
  log_odds_ratio: number;
  /** Lower bound of the 95% Wald CI for the odds ratio (linear, not log). */
  or_ci_low: number;
  /** Upper bound of the 95% Wald CI for the odds ratio (linear, not log). */
  or_ci_high: number;
}

/**
 * Effect size for one term from the ORA 2x2 contingency table:
 *   k = commonInSelect  (in term & in select),  n = selectSize
 *   K = commonInPool    (in term & in pool),    N = poolSize
 *
 * fold_enrichment = (k/n) / (K/N).
 *
 * For the odds ratio the 2x2 table is
 *        in term            not in term
 *   sel  a = k              b = n - k
 *   ~sel c = K - k          d = (N - n) - (K - k)
 * with the Haldane–Anscombe 0.5 continuity correction added to every cell when
 * any cell is zero, so log(OR) and its Wald standard error stay finite. The 95%
 * CI is exp(logOR ± 1.96 * sqrt(1/a + 1/b + 1/c + 1/d)).
 */
export function effectSize(
  commonInSelect: number,
  commonInPool: number,
  poolSize: number,
  selectSize: number,
): EffectSize {
  const k = commonInSelect;
  const n = selectSize;
  const K = commonInPool;
  const N = poolSize;

  const expectedFrac = K / N;
  const fold_enrichment =
    n === 0 || N === 0 || K === 0 ? Number.NaN : k / n / expectedFrac;

  let a = k;
  let b = n - k;
  let c = K - k;
  let d = N - n - (K - k);
  if (a === 0 || b === 0 || c === 0 || d === 0) {
    a += 0.5;
    b += 0.5;
    c += 0.5;
    d += 0.5;
  }
  const log_odds_ratio = Math.log((a * d) / (b * c));
  const se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  const or_ci_low = Math.exp(log_odds_ratio - 1.959964 * se);
  const or_ci_high = Math.exp(log_odds_ratio + 1.959964 * se);
  return { fold_enrichment, log_odds_ratio, or_ci_low, or_ci_high };
}

/** Multiple-testing correction matching R stats::p.adjust for 'BH' and 'bonferroni'. */
export function pAdjust(pValues: number[], method: 'BH' | 'bonferroni'): number[] {
  const m = pValues.length;
  if (m === 0) return [];
  if (method === 'bonferroni') return pValues.map((p) => Math.min(p * m, 1));
  if (method === 'BH') {
    const indexed = pValues.map((p, i) => ({ p, i }));
    indexed.sort((a, b) => a.p - b.p); // Array.sort is stable (ES2019+)
    const adjusted = new Array<number>(m);
    for (let rank = 0; rank < m; rank++) {
      adjusted[indexed[rank]!.i] = (indexed[rank]!.p * m) / (rank + 1);
    }
    for (let rank = m - 2; rank >= 0; rank--) {
      const cur = indexed[rank]!.i;
      const next = indexed[rank + 1]!.i;
      adjusted[cur] = Math.min(adjusted[cur]!, adjusted[next]!);
    }
    return adjusted.map((v) => Math.min(Math.max(v, 0), 1));
  }
  throw new MuleaLabError(`Unsupported p.adjust method: ${method} (supported: 'BH', 'bonferroni')`);
}
