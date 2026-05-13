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
 * One-tailed hypergeometric overrepresentation p-value P(X >= commonInSelect),
 * X ~ Hypergeometric(population=poolSize, successes=commonInPool, draws=selectSize).
 * Matches mulea R: 1 - phyper(k-1, m, N-m, n).
 */
export function hypergeometricPValue(
  commonInSelect: number,
  commonInPool: number,
  poolSize: number,
  selectSize: number,
): number {
  if (selectSize === 0 || commonInPool === 0) return 1.0;
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
