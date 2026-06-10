import { parseGmt } from './io.ts';
import { filterOntology } from './ontology.ts';
import { ora } from './ora.ts';
import { setBasedEnrichmentTest, rObsRanks } from './efdr.ts';
import { setBasedEnrichmentTestMc } from './efdrMc.ts';
import { efdrStandardError } from './efdrStandardError.ts';
import type { AnalysisInput, AnalysisResult, ResultRow, EfdrMode, EfdrDiagnostics } from './appTypes.ts';
import type { GmtTerm } from './types.ts';

const NOISE_FACTOR = 3;

export interface ResolvedEfdr { mode: EfdrMode; steps: number; seed: number }
export function resolveEfdr(input: AnalysisInput): ResolvedEfdr {
  const mode: EfdrMode = input.efdrMode === 'resampling' ? 'resampling' : 'exact';
  const steps = typeof input.steps === 'number' && Number.isFinite(input.steps) && input.steps >= 1
    ? Math.floor(input.steps) : 100000;
  const seed = typeof input.seed === 'number' && Number.isInteger(input.seed) ? input.seed : 42;
  return { mode, steps, seed };
}

/** True iff this input must run through the async WASM Monte-Carlo worker. */
export function usesMcWorker(input: AnalysisInput): boolean {
  return input.method === 'eFDR' && input.efdrMode === 'resampling';
}

interface Prepared {
  gmt: GmtTerm[]; select: Set<string>; nTargetDropped: number; poolSize: number;
  gmtPoolOverlap: number; nTargetDuplicates: number;
}
function prepare(input: AnalysisInput): Prepared {
  const gmt = filterOntology(parseGmt(input.gmtText), input.minNrOfElements, input.maxNrOfElements);
  const pool = new Set(input.background);
  const select = new Set(input.target.filter((g) => pool.has(g)));
  const nTargetDropped = input.target.filter((g) => !pool.has(g)).length;
  const nTargetDuplicates = input.target.length - new Set(input.target).size;
  // Gene-ID namespace sanity: how many distinct ontology genes occur in the background at all?
  // Zero overlap means every term has commonInPool == 0 → all p-values collapse to 1, which is
  // almost always a mismatched identifier namespace (e.g. gene symbols vs Entrez/Ensembl IDs).
  let gmtPoolOverlap = 0;
  if (pool.size > 0) {
    const seen = new Set<string>();
    for (const term of gmt) {
      for (const g of term.list_of_values) {
        if (seen.has(g)) continue;
        seen.add(g);
        if (pool.has(g)) gmtPoolOverlap++;
      }
    }
  }
  return { gmt, select, nTargetDropped, poolSize: pool.size, gmtPoolOverlap, nTargetDuplicates };
}

function finalize(
  prep: Prepared,
  input: AnalysisInput,
  rows: ResultRow[],
  extra?: { efdrMode?: EfdrMode; diagnostics?: EfdrDiagnostics },
): AnalysisResult {
  const rowsWithHits: ResultRow[] = rows.map((row, i) => ({
    ...row,
    hits: (prep.gmt[i]?.list_of_values ?? []).filter((g) => prep.select.has(g)),
  }));
  const warnings: string[] = [];
  if (prep.gmt.length === 0) {
    warnings.push('No ontology terms passed the size filter.');
  } else if (prep.poolSize > 0 && prep.gmtPoolOverlap === 0) {
    warnings.push('None of the background genes occur in the ontology — likely a gene-ID namespace mismatch (e.g. gene symbols vs Entrez/Ensembl IDs). Results are not meaningful.');
  }
  if (prep.nTargetDropped > 0) warnings.push(`${prep.nTargetDropped} target gene(s) are not in the background and were dropped.`);
  if (prep.nTargetDuplicates > 0) warnings.push(`${prep.nTargetDuplicates} duplicate gene(s) in the target list were ignored.`);
  return {
    rows: rowsWithHits,
    method: input.method,
    meta: { nTerms: prep.gmt.length, nTargetDropped: prep.nTargetDropped, poolSize: prep.poolSize },
    warnings,
    ...(extra?.efdrMode ? { efdrMode: extra.efdrMode } : {}),
    ...(extra?.diagnostics ? { diagnostics: extra.diagnostics } : {}),
  };
}

/** Synchronous path: exact eFDR / BH / Bonferroni. */
export function runAnalysis(input: AnalysisInput): AnalysisResult {
  const prep = prepare(input);
  const rows: ResultRow[] = input.method === 'eFDR'
    ? setBasedEnrichmentTest(prep.gmt, input.target, input.background, input.efdrClamp ?? true)
    : ora(prep.gmt, input.target, input.background, input.method, input.direction ?? 'over');
  return finalize(prep, input, rows, input.method === 'eFDR' ? { efdrMode: 'exact' } : undefined);
}

/** Async resampling path: WASM Monte-Carlo eFDR + exact-analytic convergence diagnostics. */
export async function runAnalysisMc(input: AnalysisInput): Promise<AnalysisResult> {
  const { steps, seed } = resolveEfdr(input);
  const prep = prepare(input);
  const t0 = performance.now();
  const mcRows = await setBasedEnrichmentTestMc(prep.gmt, input.target, input.background, steps, seed, input.efdrClamp ?? true);
  const runtimeMs = performance.now() - t0;
  const exactRows = setBasedEnrichmentTest(prep.gmt, input.target, input.background);
  let maxAbsDeltaVsExact = 0;
  let termsCompared = 0;
  let clampedToOne = false;
  for (let i = 0; i < mcRows.length; i++) {
    const m = mcRows[i]!.eFDR;
    const e = exactRows[i]!.eFDR;
    if (Number.isFinite(m) && Number.isFinite(e)) {
      maxAbsDeltaVsExact = Math.max(maxAbsDeltaVsExact, Math.abs(m - e));
      termsCompared++;
    }
    if (m === 1) clampedToOne = true;
  }
  const diagnostics: EfdrDiagnostics = {
    steps, seed, runtimeMs, maxAbsDeltaVsExact, termsCompared,
    withinNoise: maxAbsDeltaVsExact <= NOISE_FACTOR / Math.sqrt(steps),
    clampedToOne,
  };
  // Approximate Poisson MC standard error / 95% CI per term (needs the observed rank of each p-value).
  const rObs = rObsRanks(mcRows.map((r) => r.p_value));
  const mcRowsWithSe: ResultRow[] = mcRows.map((r, i) => {
    if (!Number.isFinite(r.eFDR)) return r as ResultRow;
    const { se, ciLow, ciHigh } = efdrStandardError(r.eFDR!, steps, rObs[i]!);
    return { ...r, efdrSe: se, efdrCiLow: ciLow, efdrCiHigh: ciHigh } as ResultRow;
  });
  return finalize(prep, input, mcRowsWithSe, { efdrMode: 'resampling', diagnostics });
}
