import { parseGmt } from './io.ts';
import { filterOntology } from './ontology.ts';
import { ora } from './ora.ts';
import { setBasedEnrichmentTest } from './efdr.ts';
import type { AnalysisInput, AnalysisResult, ResultRow, EfdrMode } from './appTypes.ts';

export interface ResolvedEfdr { mode: EfdrMode; steps: number; seed: number }

/** Resolve eFDR sub-mode + params with B2 defaults (exact / 100000 / 42). */
export function resolveEfdr(input: AnalysisInput): ResolvedEfdr {
  const mode: EfdrMode = input.efdrMode === 'resampling' ? 'resampling' : 'exact';
  const steps = typeof input.steps === 'number' && Number.isFinite(input.steps) && input.steps >= 1
    ? Math.floor(input.steps) : 100000;
  const seed = typeof input.seed === 'number' && Number.isInteger(input.seed) ? input.seed : 42;
  return { mode, steps, seed };
}

/** Pure orchestration: parse → filter → ora/eFDR → unified AnalysisResult. */
export function runAnalysis(input: AnalysisInput): AnalysisResult {
  const gmt = filterOntology(parseGmt(input.gmtText), input.minNrOfElements, input.maxNrOfElements);
  const pool = new Set(input.background);
  const nTargetDropped = input.target.filter((g) => !pool.has(g)).length;

  let rows: ResultRow[];
  if (input.method === 'eFDR') {
    rows = setBasedEnrichmentTest(gmt, input.target, input.background);
  } else {
    rows = ora(gmt, input.target, input.background, input.method);
  }

  const select = new Set(input.target.filter((g) => pool.has(g)));
  const rowsWithHits: ResultRow[] = rows.map((row, i) => ({
    ...row,
    hits: (gmt[i]?.list_of_values ?? []).filter((g) => select.has(g)),
  }));

  const warnings: string[] = [];
  if (nTargetDropped > 0) {
    warnings.push(`${nTargetDropped} target gene(s) are not in the background and were dropped.`);
  }
  if (gmt.length === 0) warnings.push('No ontology terms passed the size filter.');

  return {
    rows: rowsWithHits,
    method: input.method,
    meta: { nTerms: gmt.length, nTargetDropped, poolSize: pool.size },
    warnings,
  };
}
