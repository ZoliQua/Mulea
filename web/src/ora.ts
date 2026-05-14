import { hypergeometricPValue, pAdjust } from './statistics.ts';
import type { GmtTerm, OraRow } from './types.ts';

/** Deterministic overrepresentation analysis (hypergeometric + BH/bonferroni). */
export function ora(
  gmt: GmtTerm[],
  elementNames: string[],
  backgroundElementNames: string[],
  method: 'BH' | 'bonferroni' = 'BH',
): OraRow[] {
  const pool = new Set(backgroundElementNames);
  const select = new Set<string>();
  for (const g of elementNames) if (pool.has(g)) select.add(g);
  const poolSize = pool.size;
  const selectSize = select.size;

  const pValues = gmt.map((term) => {
    let commonInPool = 0;
    let commonInSelect = 0;
    for (const g of term.list_of_values) {
      if (pool.has(g)) commonInPool++;
      if (select.has(g)) commonInSelect++;
    }
    return hypergeometricPValue(commonInSelect, commonInPool, poolSize, selectSize);
  });

  const adjusted = pAdjust(pValues, method);
  return gmt.map((term, i) => ({
    ontology_id: term.ontology_id,
    ontology_name: term.ontology_name,
    p_value: pValues[i]!,
    adjusted_p_value: adjusted[i]!,
  }));
}
