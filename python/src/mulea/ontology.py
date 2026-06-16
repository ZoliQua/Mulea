from __future__ import annotations

import pandas as pd


def filter_ontology(
    gmt: pd.DataFrame,
    min_nr_of_elements: int | None = None,
    max_nr_of_elements: int | None = None,
) -> pd.DataFrame:
    """Keep ontology terms with min_nr_of_elements < size < max_nr_of_elements.

    Bounds are STRICT/exclusive on both ends, and when a bound is None it defaults to
    3 (min) / 400 (max) — mirroring the mulea R package's filter_ontology (R/Utils.R)
    exactly, so results stay in parity with the R implementation.
    """
    if min_nr_of_elements is None:
        min_nr_of_elements = 3
    if max_nr_of_elements is None:
        max_nr_of_elements = 400
    sizes = gmt["list_of_values"].apply(len)
    keep = (sizes > min_nr_of_elements) & (sizes < max_nr_of_elements)
    return gmt[keep].reset_index(drop=True)
