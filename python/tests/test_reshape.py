import pandas as pd
import pytest
from mulealab import OraModel, reshape_results, run_test


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


def _model():
    return OraModel(
        gmt=_gmt(),
        element_names=["g1", "g2", "g3", "g4", "g6"],
        background_element_names=[f"g{i}" for i in range(1, 21)],
        p_value_adjustment_method="eFDR",
    )


def test_reshape_long_form_columns_and_filtering():
    model = _model()
    res = run_test(model)
    long = reshape_results(model, res, p_value_type_colname="eFDR")
    assert list(long.columns) == ["ontology_id", "element_id_in_ontology", "eFDR"]
    # only target-set elements survive the default threshold filter
    assert set(long["element_id_in_ontology"]) <= set(model.element_names)
    # T1 contributes g1..g4 (all in target), T2 contributes g6
    t1_elems = set(long[long["ontology_id"] == "T1"]["element_id_in_ontology"])
    assert t1_elems == {"g1", "g2", "g3", "g4"}
    # each element row carries its term's eFDR
    t1_efdr = res.set_index("ontology_id").loc["T1", "eFDR"]
    assert (long[long["ontology_id"] == "T1"]["eFDR"] == t1_efdr).all()


def test_reshape_without_threshold_keeps_all_elements():
    model = _model()
    res = run_test(model)
    long = reshape_results(model, res, p_value_type_colname="eFDR", p_value_max_threshold=False)
    # g5 (in T1 but not in the target set) is now present
    assert "g5" in set(long["element_id_in_ontology"])


def test_reshape_rejects_unknown_pvalue_column():
    model = _model()
    res = run_test(model)
    with pytest.raises(ValueError, match="not a column"):
        reshape_results(model, res, p_value_type_colname="nope")
