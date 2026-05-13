import numpy as np
import pandas as pd
import pytest
from mulealab.efdr import EFDR_COLUMNS, r_obs_ranks, set_based_enrichment_test


def test_r_obs_ranks_no_ties_ascending():
    # smallest value -> rank 1
    assert list(r_obs_ranks(np.array([0.5, 0.1, 0.9]))) == [2.0, 1.0, 3.0]


def test_r_obs_ranks_ties_take_max():
    # R rank(c(0.1,0.1,0.2), ties.method="max") == c(2,2,3)
    assert list(r_obs_ranks(np.array([0.1, 0.1, 0.2]))) == [2.0, 2.0, 3.0]


def test_r_obs_ranks_rounds_to_15_digits():
    # values differing below 1e-15 are treated as tied
    a = 0.1
    b = 0.1 + 1e-16
    assert list(r_obs_ranks(np.array([a, b, 0.2]))) == [2.0, 2.0, 3.0]


def _hand_gmt():
    return pd.DataFrame(
        {
            "ontology_id": ["A", "B"],
            "ontology_name": ["A", "B"],
            "list_of_values": [["g1", "g2"], ["g1", "g2", "g3"]],
        }
    )


def test_exact_matches_hand_derived_example():
    # Pool g1..g4, target g1,g2. Hand-derived eFDR: A=1/6, B=1/3 (see plan header).
    res = set_based_enrichment_test(
        _hand_gmt(),
        element_names=["g1", "g2"],
        background_element_names=["g1", "g2", "g3", "g4"],
        mode="exact",
    )
    assert list(res.columns) == EFDR_COLUMNS
    by_id = res.set_index("ontology_id")
    assert by_id.loc["A", "p_value"] == pytest.approx(1 / 6)
    assert by_id.loc["B", "p_value"] == pytest.approx(0.5)
    assert by_id.loc["A", "nr_common_with_tested_elements"] == 2
    assert by_id.loc["A", "nr_common_with_background_elements"] == 2
    assert by_id.loc["A", "eFDR"] == pytest.approx(1 / 6)
    assert by_id.loc["B", "eFDR"] == pytest.approx(1 / 3)


def test_exact_is_deterministic():
    g = _hand_gmt()
    kw = dict(element_names=["g1", "g2"], background_element_names=["g1", "g2", "g3", "g4"], mode="exact")
    a = set_based_enrichment_test(g, **kw)
    b = set_based_enrichment_test(g, **kw)
    assert list(a["eFDR"]) == list(b["eFDR"])


def test_exact_efdr_capped_at_one_and_in_unit_interval():
    g = _hand_gmt()
    res = set_based_enrichment_test(
        g, element_names=["g3"], background_element_names=["g1", "g2", "g3", "g4"], mode="exact"
    )
    assert (res["eFDR"] >= 0).all() and (res["eFDR"] <= 1).all()
