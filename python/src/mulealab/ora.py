from __future__ import annotations

from collections.abc import Sequence

import pandas as pd

from mulealab.efdr import set_based_enrichment_test
from mulealab.statistics import HypergeometricDirection, effect_size, hypergeometric_pvalue, p_adjust


def ora(
    gmt: pd.DataFrame,
    element_names: Sequence[str],
    background_element_names: Sequence[str],
    p_value_adjustment_method: str = "BH",
    direction: HypergeometricDirection = "over",
    *,
    efdr_mode: str = "exact",
    number_of_permutations: int = 10000,
    random_seed: int = 0,
    clamp: bool = True,
) -> pd.DataFrame:
    """Overrepresentation analysis.

    For ``p_value_adjustment_method`` in stats methods (``'BH'``, ``'bonferroni'``) returns
    a DataFrame with columns:
    ``[ontology_id, ontology_name, p_value, adjusted_p_value, direction,
    fold_enrichment, log_odds_ratio, or_ci_low, or_ci_high]``.

    For ``'eFDR'`` returns the eFDR schema (see ``efdr.EFDR_COLUMNS``);
    ``efdr_mode`` selects the ``'exact'`` or ``'mc'`` engine.

    Parameters
    ----------
    direction : {"over", "under", "two-sided"}, default "over"
        Tail direction for the hypergeometric test (see
        :func:`~mulealab.statistics.hypergeometric_pvalue`).  Has no effect when
        ``p_value_adjustment_method='eFDR'`` (eFDR always uses over-representation).
    clamp : bool, default True
        When ``p_value_adjustment_method='eFDR'``, passed through to
        :func:`~mulealab.efdr.set_based_enrichment_test`.  ``True`` (default) clamps
        the eFDR ratio to ≤ 1; ``False`` returns the raw ``r_exp / r_obs`` ratio,
        which may exceed 1, matching base-R mulea behaviour.
    """
    if p_value_adjustment_method == "eFDR":
        return set_based_enrichment_test(
            gmt,
            element_names,
            background_element_names,
            mode=efdr_mode,
            number_of_permutations=number_of_permutations,
            random_seed=random_seed,
            clamp=clamp,
        )

    pool = set(background_element_names)
    select = set(element_names) & pool
    pool_size = len(pool)
    select_size = len(select)

    p_values: list[float] = []
    effect_rows: list[dict[str, float]] = []
    for genes in gmt["list_of_values"]:
        term = set(genes)
        common_in_pool = len(term & pool)
        common_in_select = len(term & select)
        p_values.append(
            hypergeometric_pvalue(
                common_in_select, common_in_pool, pool_size, select_size, direction
            )
        )
        effect_rows.append(
            effect_size(common_in_select, common_in_pool, pool_size, select_size)
        )

    result = pd.DataFrame(
        {
            "ontology_id": gmt["ontology_id"].to_numpy(),
            "ontology_name": gmt["ontology_name"].to_numpy(),
            "p_value": p_values,
        }
    )
    result["adjusted_p_value"] = p_adjust(p_values, p_value_adjustment_method)
    result["direction"] = direction
    result["fold_enrichment"] = [r["fold_enrichment"] for r in effect_rows]
    result["log_odds_ratio"] = [r["log_odds_ratio"] for r in effect_rows]
    result["or_ci_low"] = [r["or_ci_low"] for r in effect_rows]
    result["or_ci_high"] = [r["or_ci_high"] for r in effect_rows]
    return result
