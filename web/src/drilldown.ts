import type { AnalysisResult, ResultRow } from './appTypes.ts';
import { rowScore } from './lollipop.ts';

export interface Drilldown {
  ontology_id: string; ontology_name: string; score: number; p_value: number;
  hits: string[]; nrCommonWithTested: number; nrCommonWithBackground?: number; poolSize: number;
}

/** Pure "why significant" summary for one term, derived from its row + the run meta. */
export function termDrilldown(row: ResultRow, meta: AnalysisResult['meta']): Drilldown {
  const hits = row.hits ?? [];
  return {
    ontology_id: row.ontology_id,
    ontology_name: row.ontology_name,
    score: rowScore(row),
    p_value: row.p_value,
    hits,
    nrCommonWithTested: row.nr_common_with_tested_elements ?? hits.length,
    nrCommonWithBackground: row.nr_common_with_background_elements,
    poolSize: meta.poolSize,
  };
}
