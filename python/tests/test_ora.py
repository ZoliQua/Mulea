import numpy as np
import pandas as pd
import pytest
from mulealab.ora import ora


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
    assert list(res.columns) == ["ontology_id", "ontology_name", "p_value", "adjusted_p_value"]
    assert set(res["ontology_id"]) == {"T1", "T2"}
    from scipy.stats import hypergeom
    t1 = res.set_index("ontology_id").loc["T1"]
    assert t1["p_value"] == pytest.approx(float(hypergeom.sf(3, 20, 5, 5)))
    assert t1["p_value"] < res.set_index("ontology_id").loc["T2"]["p_value"]


def test_ora_eFDR_not_supported_here():
    with pytest.raises(Exception) as exc:
        ora(_gmt(), element_names=["g1"], background_element_names=["g1", "g2"],
            p_value_adjustment_method="eFDR")
    assert "eFDR" in str(exc.value)
