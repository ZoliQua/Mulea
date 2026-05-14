import { hypergeometricPValue, hypergeometricPmf } from './statistics.ts';
import type { EfdrRow, GmtTerm } from './types.ts';

const round15 = (x: number): number => Math.round(x * 1e15) / 1e15;

/** R's rank(round(p,15), ties.method="max"): ascending, ties take the max rank (1-based). */
export function rObsRanks(pValues: number[]): number[] {
  const rounded = pValues.map(round15);
  const order = rounded.map((_, i) => i).sort((a, b) => rounded[a]! - rounded[b]!); // stable
  const ranksByOrder = new Array<number>(rounded.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && rounded[order[j + 1]!]! === rounded[order[i]!]!) j++;
    for (let t = i; t <= j; t++) ranksByOrder[t] = j + 1; // 1-based max rank
    i = j + 1;
  }
  const out = new Array<number>(rounded.length);
  for (let t = 0; t < order.length; t++) out[order[t]!] = ranksByOrder[t]!;
  return out;
}

/** Count of sorted values ≤ x (searchsorted 'right'). */
function upperBound(sorted: number[], x: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]! <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Exact analytic eFDR — deterministic; the n→∞ limit of mulea's resampling. */
export function setBasedEnrichmentTest(
  gmt: GmtTerm[],
  elementNames: string[],
  backgroundElementNames: string[],
): EfdrRow[] {
  const pool = new Set(backgroundElementNames);
  const select = new Set<string>();
  for (const g of elementNames) if (pool.has(g)) select.add(g);
  const poolSize = pool.size;
  const selectSize = select.size;

  const commonInPool: number[] = [];
  const commonInSelect: number[] = [];
  const pObs: number[] = [];
  for (const term of gmt) {
    let cp = 0;
    let cs = 0;
    for (const g of term.list_of_values) {
      if (pool.has(g)) cp++;
      if (select.has(g)) cs++;
    }
    commonInPool.push(cp);
    commonInSelect.push(cs);
    pObs.push(hypergeometricPValue(cs, cp, poolSize, selectSize));
  }

  let eFDR: number[];
  if (selectSize === 0) {
    eFDR = gmt.map(() => NaN);
  } else {
    const rObs = rObsRanks(pObs);
    const pairs: Array<{ p: number; mass: number }> = [];
    for (const m of commonInPool) {
      if (m === 0) {
        pairs.push({ p: 1, mass: 1 });
        continue;
      }
      const kmin = Math.max(0, selectSize + m - poolSize);
      const kmax = Math.min(selectSize, m);
      for (let k = kmin; k <= kmax; k++) {
        pairs.push({
          p: round15(hypergeometricPValue(k, m, poolSize, selectSize)),
          mass: hypergeometricPmf(k, m, poolSize, selectSize),
        });
      }
    }
    pairs.sort((a, b) => a.p - b.p);
    const nullP = pairs.map((x) => x.p);
    const cummass: number[] = [];
    let s = 0;
    for (const x of pairs) {
      s += x.mass;
      cummass.push(s);
    }
    eFDR = pObs.map((po, j) => {
      const idx = upperBound(nullP, round15(po));
      const rExp = idx > 0 ? cummass[idx - 1]! : 0;
      return Math.min(rExp / rObs[j]!, 1);
    });
  }

  return gmt.map((term, i) => ({
    ontology_id: term.ontology_id,
    ontology_name: term.ontology_name,
    nr_common_with_tested_elements: commonInSelect[i]!,
    nr_common_with_background_elements: commonInPool[i]!,
    p_value: pObs[i]!,
    eFDR: eFDR[i]!,
  }));
}
