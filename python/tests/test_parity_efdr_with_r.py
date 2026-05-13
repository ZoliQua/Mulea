from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from mulealab.efdr import set_based_enrichment_test
from mulealab.io import read_gmt
from mulealab.ontology import filter_ontology

REPO_ROOT = Path(__file__).resolve().parents[2]
EXTDATA = REPO_ROOT / "inst" / "extdata"
FIXTURE = Path(__file__).parent / "fixtures" / "ora_efdr_reference.csv"


@pytest.mark.skipif(not FIXTURE.exists(), reason="R eFDR fixture not generated")
def test_efdr_exact_matches_r_within_mc_tolerance():
    gmt = read_gmt(str(EXTDATA / "Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt"))
    gmt_f = filter_ontology(gmt, min_nr_of_elements=3, max_nr_of_elements=400)
    target = [ln.strip() for ln in (EXTDATA / "target_set.txt").read_text().splitlines() if ln.strip()]
    background = [ln.strip() for ln in (EXTDATA / "background_set.txt").read_text().splitlines() if ln.strip()]

    py = (
        set_based_enrichment_test(gmt_f, element_names=target,
                                  background_element_names=background, mode="exact")
        .sort_values("ontology_id").reset_index(drop=True)
    )
    r = pd.read_csv(FIXTURE).sort_values("ontology_id").reset_index(drop=True)

    # 1) deterministic columns: exact
    assert list(py["ontology_id"]) == list(r["ontology_id"])
    assert list(py["ontology_name"]) == list(r["ontology_name"])
    assert list(py["nr_common_with_tested_elements"]) == list(r["nr_common_with_tested_elements"])
    assert list(py["nr_common_with_background_elements"]) == list(r["nr_common_with_background_elements"])
    assert np.allclose(py["p_value"], r["p_value"], rtol=1e-9, atol=1e-12)

    # 2) eFDR: exact Python vs R Monte-Carlo (100k perms) — tolerance absorbs MC noise
    assert np.max(np.abs(py["eFDR"].to_numpy() - r["eFDR"].to_numpy())) < 0.05

    # 3) significant set agreement, robust to terms on the 0.05 boundary
    thresh, band = 0.05, 0.005
    clear_py = set(py.loc[py["eFDR"] < thresh - band, "ontology_id"])
    poss_r = set(r.loc[r["eFDR"] < thresh + band, "ontology_id"])
    clear_r = set(r.loc[r["eFDR"] < thresh - band, "ontology_id"])
    poss_py = set(py.loc[py["eFDR"] < thresh + band, "ontology_id"])
    assert clear_py <= poss_r
    assert clear_r <= poss_py
