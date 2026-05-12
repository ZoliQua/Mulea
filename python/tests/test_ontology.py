import pandas as pd
from mulealab.ontology import filter_ontology


def _gmt():
    # term sizes: A=1, B=3, C=5
    return pd.DataFrame(
        {
            "ontology_id": ["A", "B", "C"],
            "ontology_name": ["a", "b", "c"],
            "list_of_values": [["g1"], ["g1", "g2", "g3"], ["g1", "g2", "g3", "g4", "g5"]],
        }
    )


def test_filter_strict_bounds_exclusive():
    # R semantics: keep min < size < max. min=2, max=5 -> only B (size 3).
    out = filter_ontology(_gmt(), min_nr_of_elements=2, max_nr_of_elements=5)
    assert list(out["ontology_id"]) == ["B"]


def test_filter_excludes_boundary_sizes():
    # Strict bounds: a size equal to a bound is excluded. min=3, max=5 ->
    # A(1) no, B(3) not >3, C(5) not <5 -> none kept.
    out = filter_ontology(_gmt(), min_nr_of_elements=3, max_nr_of_elements=5)
    assert list(out["ontology_id"]) == []


def test_filter_defaults_match_r_3_and_400():
    # None bounds default to min=3, max=400 (R behavior): keep 3 < size < 400 -> only C(5).
    out = filter_ontology(_gmt())
    assert list(out["ontology_id"]) == ["C"]
