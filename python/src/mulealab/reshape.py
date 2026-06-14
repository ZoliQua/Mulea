"""Reshape enrichment results into the long ("relaxed") form used by the plots.

Port of ``reshape_results`` from the mulea R package (``R/Plotting.R``).  It merges a model's
ontology (``model.gmt``) with the ``run_test`` results, then expands each ontology term into one
row per (ontology, element) pair, carrying that term's chosen significance value onto every row.
When ``p_value_max_threshold`` is true the long table is restricted to elements that are in the
model's target set (``model.element_names``) — i.e. the genes that actually drove the enrichment.
"""

from __future__ import annotations

import pandas as pd

from mulealab.model import Model


def reshape_results(
    model: Model,
    model_results: pd.DataFrame,
    *,
    model_ontology_col_name: str = "ontology_id",
    ontology_id_colname: str = "ontology_id",
    p_value_type_colname: str = "eFDR",
    p_value_max_threshold: bool = True,
) -> pd.DataFrame:
    """Return a long DataFrame ``[ontology_id, element_id_in_ontology, <p_value_type_colname>]``.

    Parameters
    ----------
    model
        The :class:`~mulealab.model.OraModel` / :class:`~mulealab.model.GseaModel` that produced
        ``model_results`` (its ``gmt`` and ``element_names`` are used).
    model_results
        The DataFrame returned by ``model.run_test()`` / :func:`mulealab.model.run_test`.
    model_ontology_col_name, ontology_id_colname
        Column to join the ontology (``model.gmt``) and the results on. Both default to
        ``'ontology_id'``.
    p_value_type_colname
        Which significance column of ``model_results`` to carry onto each element row
        (e.g. ``'eFDR'`` for ORA-eFDR, ``'adjusted_p_value'`` for ORA stats, ``'efdr'`` for GSEA).
    p_value_max_threshold
        When ``True`` (default), keep only elements present in ``model.element_names``
        (mirrors the R default).

    Notes
    -----
    Mirrors ``R/Plotting.R::reshape_results``. The R ``result_extend_colnames`` argument is
    not ported (it relies on global state in the R source and is unused by the plots).
    """
    if p_value_type_colname not in model_results.columns:
        raise ValueError(
            f"p_value_type_colname '{p_value_type_colname}' is not a column of model_results "
            f"(available: {list(model_results.columns)})"
        )

    gmt = model.gmt[[model_ontology_col_name, "list_of_values"]]
    merged = gmt.merge(
        model_results[[ontology_id_colname, p_value_type_colname]],
        how="left",
        left_on=model_ontology_col_name,
        right_on=ontology_id_colname,
    )

    long = merged.explode("list_of_values", ignore_index=True)
    long = long.rename(
        columns={
            model_ontology_col_name: "ontology_id",
            "list_of_values": "element_id_in_ontology",
        }
    )
    out = long[["ontology_id", "element_id_in_ontology", p_value_type_colname]].copy()
    out = out.dropna(subset=["element_id_in_ontology"])

    if p_value_max_threshold:
        targets = set(model.element_names)
        out = out[out["element_id_in_ontology"].isin(targets)]

    return out.reset_index(drop=True)


__all__ = ["reshape_results"]
