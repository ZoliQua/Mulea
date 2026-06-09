import {
  hypergeometricPValue,
  pAdjust,
  effectSize,
  type HypergeometricDirection,
} from './statistics.ts';
import type { GmtTerm, OraRow } from './types.ts';

/**
 * Deterministic overrepresentation analysis (hypergeometric + BH/bonferroni).
 *
 * `direction` selects the tail: 'over' (default, over-representation — keeps the
 * historical bit-identical p-values), 'under' (depletion), or 'two-sided'. Every
 * row also carries effect sizes (fold enrichment + log odds ratio with 95% CI)
 * computed from the term's 2x2 table.
 */
export function ora(
  gmt: GmtTerm[],
  elementNames: string[],
  backgroundElementNames: string[],
  method: 'BH' | 'bonferroni' = 'BH',
  direction: HypergeometricDirection = 'over',
): OraRow[] {
  const pool = new Set(backgroundElementNames);
  const select = new Set<string>();
  for (const g of elementNames) if (pool.has(g)) select.add(g);
  const poolSize = pool.size;
  const selectSize = select.size;

  const counts = gmt.map((term) => {
    let commonInPool = 0;
    let commonInSelect = 0;
    for (const g of term.list_of_values) {
      if (pool.has(g)) commonInPool++;
      if (select.has(g)) commonInSelect++;
    }
    return { commonInPool, commonInSelect };
  });

  const pValues = counts.map(({ commonInPool, commonInSelect }) =>
    hypergeometricPValue(commonInSelect, commonInPool, poolSize, selectSize, direction),
  );

  const adjusted = pAdjust(pValues, method);
  return gmt.map((term, i) => {
    const { commonInPool, commonInSelect } = counts[i]!;
    const es = effectSize(commonInSelect, commonInPool, poolSize, selectSize);
    return {
      ontology_id: term.ontology_id,
      ontology_name: term.ontology_name,
      p_value: pValues[i]!,
      adjusted_p_value: adjusted[i]!,
      direction,
      fold_enrichment: es.fold_enrichment,
      log_odds_ratio: es.log_odds_ratio,
      or_ci_low: es.or_ci_low,
      or_ci_high: es.or_ci_high,
    };
  });
}
