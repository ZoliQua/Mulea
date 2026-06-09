export const VERSION = '0.1.0';

export { parseGmt } from './io.ts';
export { filterOntology } from './ontology.ts';
export { hypergeometricPValue, hypergeometricPmf, pAdjust, effectSize } from './statistics.ts';
export type { HypergeometricDirection, EffectSize } from './statistics.ts';
export { ora } from './ora.ts';
export { rObsRanks, setBasedEnrichmentTest } from './efdr.ts';
export { MuleaLabError } from './errors.ts';
export type { GmtTerm, OraRow, EfdrRow } from './types.ts';
