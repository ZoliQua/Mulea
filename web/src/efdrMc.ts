import { hypergeometricPValue } from './statistics.ts';
import { rObsRanks } from './efdr.ts';
import { simulateWasm, type SimBin } from './wasm/efdrWasm.ts';
import type { EfdrRow, GmtTerm } from './types.ts';

const round15 = (x: number): number => Math.round(x * 1e15) / 1e15;

/** Count of sorted values ≤ x (searchsorted 'right'). Mirrors efdr.ts upperBound. */
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

/** TS port of wasm/efdr_convert.cpp efdrFromSimulation — histogram → per-term eFDR. */
export function efdrFromSimulation(
  commonInSelect: number[],
  commonInPool: number[],
  histogram: SimBin[],
  poolSize: number,
  selectSize: number,
  steps: number,
  clamp = true,
): number[] {
  if (selectSize === 0) return commonInPool.map(() => NaN);
  const pairs = histogram.map((b) => ({
    p: round15(hypergeometricPValue(b.selectIntersect, b.poolIntersect, poolSize, selectSize)),
    mass: b.count,
  }));
  pairs.sort((a, b) => a.p - b.p);
  const nullP = pairs.map((x) => x.p);
  const cum: number[] = [];
  let s = 0;
  for (const x of pairs) { s += x.mass; cum.push(s); }
  const pObs = commonInSelect.map((cs, j) => hypergeometricPValue(cs, commonInPool[j]!, poolSize, selectSize));
  const rObs = rObsRanks(pObs);
  return pObs.map((po, j) => {
    const idx = upperBound(nullP, round15(po));
    const rExp = idx > 0 ? cum[idx - 1]! : 0;
    const ratio = (rExp / steps) / rObs[j]!;
    // base R mulea does NOT clamp the eFDR ratio to <=1 (see PARITY.md); clamp=true
    // (default) keeps the bit-identical web/Python behaviour.
    return clamp ? Math.min(ratio, 1) : ratio;
  });
}

/**
 * Monte-Carlo eFDR via the WASM core. Same output shape as efdr.ts setBasedEnrichmentTest.
 * Assumes terms have no intra-term duplicate genes (true for the RegulonDB E. coli GMT); the
 * observed counts are computed exactly as efdr.ts (iterate list_of_values with pool/select membership).
 */
export async function setBasedEnrichmentTestMc(
  gmt: GmtTerm[],
  elementNames: string[],
  backgroundElementNames: string[],
  steps: number,
  seed: number,
  clamp = true,
): Promise<EfdrRow[]> {
  const pool = new Set(backgroundElementNames);
  const select = new Set<string>();
  for (const g of elementNames) if (pool.has(g)) select.add(g);
  const poolSize = pool.size;
  const selectSize = select.size;

  // Gene name -> id over the pool id space [0, poolSize).
  const idOf = new Map<string, number>();
  let next = 0;
  for (const g of pool) idOf.set(g, next++);
  const poolIds = new Int32Array(poolSize);
  for (let i = 0; i < poolSize; i++) poolIds[i] = i;

  const categoryGenes: number[] = [];
  const categoryOffsets: number[] = [0];
  const commonInPool: number[] = [];
  const commonInSelect: number[] = [];
  for (const term of gmt) {
    let cp = 0;
    let cs = 0;
    for (const g of term.list_of_values) {
      const id = idOf.get(g);
      if (id !== undefined) { categoryGenes.push(id); cp++; }
      if (select.has(g)) cs++;
    }
    categoryOffsets.push(categoryGenes.length);
    commonInPool.push(cp);
    commonInSelect.push(cs);
  }

  const histogram = selectSize === 0 ? [] : await simulateWasm({
    categoryGenes: Int32Array.from(categoryGenes),
    categoryOffsets: Int32Array.from(categoryOffsets),
    nCategories: gmt.length,
    poolIds,
    poolSize,
    selectSize,
    steps,
    seed,
    nGenes: poolSize,
  });

  const eFDR = efdrFromSimulation(commonInSelect, commonInPool, histogram, poolSize, selectSize, steps, clamp);
  return gmt.map((term, i) => ({
    ontology_id: term.ontology_id,
    ontology_name: term.ontology_name,
    nr_common_with_tested_elements: commonInSelect[i]!,
    nr_common_with_background_elements: commonInPool[i]!,
    p_value: hypergeometricPValue(commonInSelect[i]!, commonInPool[i]!, poolSize, selectSize),
    eFDR: eFDR[i]!,
  }));
}
