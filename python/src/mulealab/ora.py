from __future__ import annotations

from collections.abc import Sequence

import pandas as pd

from mulealab.efdr import set_based_enrichment_test
from mulealab.statistics import hypergeometric_pvalue, p_adjust


def ora(
    gmt: pd.DataFrame,
    element_names: Sequence[str],
    background_element_names: Sequence[str],
    p_value_adjustment_method: str = "BH",
    *,
    efdr_mode: str = "exact",
    number_of_permutations: int = 10000,
    random_seed: int = 0,
) -> pd.DataFrame:
    """Overrepresentation analysis.

    For p_value_adjustment_method in stats methods ('BH', 'bonferroni') returns
    [ontology_id, ontology_name, p_value, adjusted_p_value]. For 'eFDR' returns the
    eFDR schema (see efdr.EFDR_COLUMNS); efdr_mode selects the 'exact' or 'mc' engine.
    """
    if p_value_adjustment_method == "eFDR":
        return set_based_enrichment_test(
            gmt,
            element_names,
            background_element_names,
            mode=efdr_mode,
            number_of_permutations=number_of_permutations,
            random_seed=random_seed,
        )

    pool = set(background_element_names)
    select = set(element_names) & pool
    pool_size = len(pool)
    select_size = len(select)

    p_values: list[float] = []
    for genes in gmt["list_of_values"]:
        term = set(genes)
        common_in_pool = len(term & pool)
        common_in_select = len(term & select)
        p_values.append(
            hypergeometric_pvalue(common_in_select, common_in_pool, pool_size, select_size)
        )

    result = pd.DataFrame(
        {
            "ontology_id": gmt["ontology_id"].to_numpy(),
            "ontology_name": gmt["ontology_name"].to_numpy(),
            "p_value": p_values,
        }
    )
    result["adjusted_p_value"] = p_adjust(p_values, p_value_adjustment_method)
    return result
