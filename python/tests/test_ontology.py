import pandas as pd
from mulealab.ontology import filter_ontology


def _gmt():
    return pd.DataFrame(
        {
            "ontology_id": ["A", "B", "C"],
            "ontology_name": ["a", "b", "c"],
            "list_of_values": [["g1"], ["g1", "g2", "g3"], ["g1", "g2", "g3", "g4", "g5"]],
        }
    )


def test_filter_keeps_terms_within_bounds():
    out = filter_ontology(_gmt(), min_nr_of_elements=3, max_nr_of_elements=4)
    assert list(out["ontology_id"]) == ["B"]


def test_filter_no_bounds_returns_all():
    out = filter_ontology(_gmt())
    assert list(out["ontology_id"]) == ["A", "B", "C"]
