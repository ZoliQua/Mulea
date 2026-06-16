import numpy as np
import pandas as pd
import pytest
from mulea.efdr import EFDR_COLUMNS, r_obs_ranks, set_based_enrichment_test


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


def test_mc_is_reproducible_with_seed():
    g = _hand_gmt()
    kw = dict(
        element_names=["g1", "g2"],
        background_element_names=["g1", "g2", "g3", "g4"],
        mode="mc",
        number_of_permutations=2000,
        random_seed=123,
    )
    a = set_based_enrichment_test(g, **kw)
    b = set_based_enrichment_test(g, **kw)
    assert list(a["eFDR"]) == list(b["eFDR"])


def test_mc_converges_to_exact():
    background = [f"g{i}" for i in range(60)]
    gmt = pd.DataFrame(
        {
            "ontology_id": [f"T{j}" for j in range(8)],
            "ontology_name": [f"T{j}" for j in range(8)],
            "list_of_values": [[f"g{(j * 5 + t) % 60}" for t in range(10)] for j in range(8)],
        }
    )
    target = [f"g{i}" for i in range(0, 20)]
    exact = set_based_enrichment_test(gmt, element_names=target,
                                      background_element_names=background, mode="exact")
    mc = set_based_enrichment_test(gmt, element_names=target, background_element_names=background,
                                   mode="mc", number_of_permutations=40000, random_seed=7)
    assert np.max(np.abs(exact["eFDR"].to_numpy() - mc["eFDR"].to_numpy())) < 0.05
    assert list(exact["p_value"]) == list(mc["p_value"])
    assert list(exact["nr_common_with_tested_elements"]) == list(mc["nr_common_with_tested_elements"])
