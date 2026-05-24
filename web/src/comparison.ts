import type { AnalysisInput } from './appTypes.ts';
import { parseGmt } from './io.ts';
import { filterOntology } from './ontology.ts';
import { ora } from './ora.ts';
import { setBasedEnrichmentTest } from './efdr.ts';

export type ComparisonInput = Omit<AnalysisInput, 'method'>;
export interface ComparisonResult { efdr: string[]; bh: string[]; bonferroni: string[]; names: Record<string, string> }

const THRESHOLD = 0.05;

/** Run the three multiple-testing corrections and return the significant term-id sets for each. */
export function runComparison(input: ComparisonInput): ComparisonResult {
  const gmt = filterOntology(parseGmt(input.gmtText), input.minNrOfElements, input.maxNrOfElements);
  const bh = ora(gmt, input.target, input.background, 'BH');
  const bonf = ora(gmt, input.target, input.background, 'bonferroni');
  const efdr = setBasedEnrichmentTest(gmt, input.target, input.background);
  const names: Record<string, string> = {};
  for (const r of [...efdr, ...bh, ...bonf]) names[r.ontology_id] = r.ontology_name;
  return {
    efdr: efdr.filter((r) => (r.eFDR ?? 1) < THRESHOLD).map((r) => r.ontology_id),
    bh: bh.filter((r) => (r.adjusted_p_value ?? 1) < THRESHOLD).map((r) => r.ontology_id),
    bonferroni: bonf.filter((r) => (r.adjusted_p_value ?? 1) < THRESHOLD).map((r) => r.ontology_id),
    names,
  };
}
