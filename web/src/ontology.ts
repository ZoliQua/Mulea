import type { GmtTerm } from './types.ts';

/**
 * Keep terms with minNrOfElements < size < maxNrOfElements (STRICT/exclusive),
 * defaulting to 3 (min) / 400 (max) when undefined — mirrors mulea R filter_ontology.
 */
export function filterOntology(
  gmt: GmtTerm[],
  minNrOfElements?: number,
  maxNrOfElements?: number,
): GmtTerm[] {
  const lo = minNrOfElements ?? 3;
  const hi = maxNrOfElements ?? 400;
  return gmt.filter((t) => t.list_of_values.length > lo && t.list_of_values.length < hi);
}
