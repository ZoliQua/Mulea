from __future__ import annotations

from collections.abc import Sequence

import pandas as pd

from mulealab.errors import MuleaLabError
from mulealab.statistics import hypergeometric_pvalue, p_adjust


def ora(
    gmt: pd.DataFrame,
    element_names: Sequence[str],
    background_element_names: Sequence[str],
    p_value_adjustment_method: str = "BH",
) -> pd.DataFrame:
    """Deterministic overrepresentation analysis (hypergeometric test + p.adjust).

    Returns a DataFrame [ontology_id, ontology_name, p_value, adjusted_p_value].
    eFDR is not implemented in the Python core (resampling-based; see the WASM-core plan).
    """
    if p_value_adjustment_method == "eFDR":
        raise MuleaLabError(
            "eFDR is not available in the deterministic Python ORA core; "
            "use the eFDR WASM core (separate plan), or choose 'BH'/'bonferroni'."
        )

    pool = set(background_element_names)
    select = set(element_names) & pool          # R: select <- intersect(select, pool)
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
