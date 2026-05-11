from __future__ import annotations

import pandas as pd


def filter_ontology(
    gmt: pd.DataFrame,
    min_nr_of_elements: int | None = None,
    max_nr_of_elements: int | None = None,
) -> pd.DataFrame:
    """Keep ontology terms whose number of genes is within [min, max] (inclusive)."""
    sizes = gmt["list_of_values"].apply(len)
    keep = pd.Series(True, index=gmt.index)
    if min_nr_of_elements is not None:
        keep &= sizes >= min_nr_of_elements
    if max_nr_of_elements is not None:
        keep &= sizes <= max_nr_of_elements
    return gmt[keep].reset_index(drop=True)
