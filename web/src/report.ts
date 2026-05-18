import type { AnalysisResult, Method } from './appTypes.ts';
import { isSignificant } from './tableView.ts';

export interface ReportSummary {
  method: Method;
  nTargetGenes: number;
  nBackgroundGenes: number;
  poolSize: number;
  nTargetDropped: number;
  nTermsTested: number;
  nSignificant: number;
  minNrOfElements: number;
  maxNrOfElements: number;
}

/** Derive the report's provenance numbers from a computed result and its inputs (pure). */
export function reportSummary(
  result: AnalysisResult,
  inputs: { target: string[]; background: string[] },
  method: Method,
): ReportSummary {
  return {
    method,
    nTargetGenes: inputs.target.length,
    nBackgroundGenes: inputs.background.length,
    poolSize: result.meta.poolSize,
    nTargetDropped: result.meta.nTargetDropped,
    nTermsTested: result.meta.nTerms,
    nSignificant: result.rows.filter((r) => isSignificant(r)).length,
    minNrOfElements: 3,
    maxNrOfElements: 400,
  };
}
