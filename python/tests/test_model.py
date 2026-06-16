import pandas as pd
import pytest
from mulea import GseaModel, OraModel, gsea, ora, run_test
from pandas.testing import assert_frame_equal


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


def test_ora_model_matches_functional_ora():
    gmt = _gmt()
    target = ["g1", "g2", "g3", "g4", "g6"]
    background = [f"g{i}" for i in range(1, 21)]
    model = OraModel(
        gmt=gmt,
        element_names=target,
        background_element_names=background,
        p_value_adjustment_method="BH",
    )
    expected = ora(gmt, target, background, p_value_adjustment_method="BH")
    assert_frame_equal(model.run_test(), expected)
    # the free function dispatches to the same result
    assert_frame_equal(run_test(model), expected)


def test_ora_model_efdr_matches_functional():
    gmt = _gmt()
    target = ["g1", "g2", "g3", "g4", "g6"]
    background = [f"g{i}" for i in range(1, 21)]
    model = OraModel(
        gmt=gmt,
        element_names=target,
        background_element_names=background,
        p_value_adjustment_method="eFDR",
    )
    expected = ora(gmt, target, background, p_value_adjustment_method="eFDR")
    assert_frame_equal(run_test(model), expected)


def test_gsea_model_matches_functional_gsea():
    gmt = _gmt()
    names = [f"g{i}" for i in range(1, 11)]
    scores = [10.0, 9.0, 8.0, 7.0, 6.0, -1.0, -2.0, -3.0, -4.0, -5.0]
    model = GseaModel(gmt=gmt, element_names=names, element_scores=scores, random_seed=7)
    ranked = pd.DataFrame({"element_name": names, "element_score": scores})
    expected = gsea(gmt, ranked, seed=7)
    assert_frame_equal(run_test(model), expected)


def test_gsea_model_length_mismatch_raises():
    with pytest.raises(ValueError, match="same length"):
        GseaModel(gmt=_gmt(), element_names=["a", "b"], element_scores=[1.0])


def test_run_test_rejects_non_model():
    with pytest.raises(TypeError, match="OraModel or GseaModel"):
        run_test(object())  # type: ignore[arg-type]
