import pandas as pd
import pytest
from mulea.ora import ora


def _gmt():
    return pd.DataFrame(
        {
            "ontology_id": ["T1", "T2"],
            "ontology_name": ["term1", "term2"],
            "list_of_values": [
                ["g1", "g2", "g3", "g4", "g5"],
                ["g6", "g7", "g8", "g9", "g10"],
            ],
        }
    )


def test_ora_columns_and_values():
    background = [f"g{i}" for i in range(1, 21)]   # g1..g20, pool size 20
    target = ["g1", "g2", "g3", "g4", "g6"]        # 4 hits in T1, 1 hit in T2
    res = ora(_gmt(), element_names=target, background_element_names=background,
              p_value_adjustment_method="BH")
    assert list(res.columns) == [
        "ontology_id", "ontology_name", "p_value", "adjusted_p_value",
        "direction", "fold_enrichment", "log_odds_ratio", "or_ci_low", "or_ci_high",
    ]
    assert set(res["ontology_id"]) == {"T1", "T2"}
    from scipy.stats import hypergeom
    t1 = res.set_index("ontology_id").loc["T1"]
    assert t1["p_value"] == pytest.approx(float(hypergeom.sf(3, 20, 5, 5)))
    assert t1["p_value"] < res.set_index("ontology_id").loc["T2"]["p_value"]


def test_ora_efdr_returns_efdr_columns():
    gmt = _gmt()
    res = ora(gmt, element_names=["g1", "g2", "g3", "g4", "g6"],
              background_element_names=[f"g{i}" for i in range(1, 21)],
              p_value_adjustment_method="eFDR")
    assert list(res.columns) == [
        "ontology_id", "ontology_name",
        "nr_common_with_tested_elements", "nr_common_with_background_elements",
        "p_value", "eFDR",
    ]
    assert (res["eFDR"] >= 0).all() and (res["eFDR"] <= 1).all()


def test_ora_unknown_method_still_raises():
    import pytest
    with pytest.raises(Exception):
        ora(_gmt(), element_names=["g1"], background_element_names=["g1", "g2"],
            p_value_adjustment_method="not_a_method")
