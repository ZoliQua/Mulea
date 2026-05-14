import { parseGmt } from './io.ts';
import { filterOntology } from './ontology.ts';
import { ora } from './ora.ts';
import { setBasedEnrichmentTest } from './efdr.ts';
import type { AnalysisInput, AnalysisResult, ResultRow } from './appTypes.ts';

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

  const warnings: string[] = [];
  if (nTargetDropped > 0) {
    warnings.push(`${nTargetDropped} target gene(s) are not in the background and were dropped.`);
  }
  if (gmt.length === 0) warnings.push('No ontology terms passed the size filter.');

  return {
    rows,
    method: input.method,
    meta: { nTerms: gmt.length, nTargetDropped, poolSize: pool.size },
    warnings,
  };
}
