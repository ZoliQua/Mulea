import pandas as pd
from mulealab.io import list_to_gmt, read_gmt, write_gmt


def test_list_to_gmt_builds_expected_frame():
    gmt = list_to_gmt({"T1": ["a", "b"], "T2": ["c"]})
    assert list(gmt.columns) == ["ontology_id", "ontology_name", "list_of_values"]
    assert gmt.loc[0, "ontology_id"] == "T1"
    assert gmt.loc[0, "ontology_name"] == "T1"  # deterministic: name == id
    assert gmt.loc[0, "list_of_values"] == ["a", "b"]
    assert gmt.loc[1, "list_of_values"] == ["c"]


def test_list_to_gmt_roundtrips_through_write_read(tmp_path):
    gmt = list_to_gmt({"T1": ["a", "b"], "T2": ["c"]})
    p = tmp_path / "out.gmt"
    write_gmt(gmt, str(p))
    back = read_gmt(str(p))
    assert back.loc[0, "list_of_values"] == ["a", "b"]


def test_read_gmt_parses_rows_and_skips_comments(tmp_path):
    p = tmp_path / "mini.gmt"
    p.write_text(
        "# a comment line\n"
        "GO:1\tterm one\tgeneA\tgeneB\tgeneC\n"
        "\n"  # blank line, ignored
        "GO:2\tterm two\tgeneB\tgeneD\n"
    )
    gmt = read_gmt(str(p))
    assert list(gmt.columns) == ["ontology_id", "ontology_name", "list_of_values"]
    assert len(gmt) == 2
    assert gmt.loc[0, "ontology_id"] == "GO:1"
    assert gmt.loc[0, "ontology_name"] == "term one"
    assert gmt.loc[0, "list_of_values"] == ["geneA", "geneB", "geneC"]
    assert gmt.loc[1, "list_of_values"] == ["geneB", "geneD"]


def test_write_then_read_roundtrip(tmp_path):
    gmt = pd.DataFrame(
        {
            "ontology_id": ["GO:1", "GO:2"],
            "ontology_name": ["term one", "term two"],
            "list_of_values": [["a", "b"], ["c"]],
        }
    )
    p = tmp_path / "out.gmt"
    write_gmt(gmt, str(p))
    back = read_gmt(str(p))
    assert back.loc[0, "list_of_values"] == ["a", "b"]
    assert back.loc[1, "list_of_values"] == ["c"]
