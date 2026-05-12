from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from mulealab.io import read_gmt
from mulealab.ontology import filter_ontology
from mulealab.ora import ora

# python/tests/test_parity_with_r.py -> parents: [0]=tests, [1]=python, [2]=repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
EXTDATA = REPO_ROOT / "inst" / "extdata"
FIXTURE = Path(__file__).parent / "fixtures" / "ora_bh_reference.csv"


@pytest.mark.skipif(not FIXTURE.exists(), reason="R fixture not generated (run generate_reference.R)")
def test_ora_matches_r_reference():
    gmt = read_gmt(str(EXTDATA / "Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt"))
    gmt_f = filter_ontology(gmt, min_nr_of_elements=3, max_nr_of_elements=400)
    target = [ln.strip() for ln in (EXTDATA / "target_set.txt").read_text().splitlines() if ln.strip()]
    background = [ln.strip() for ln in (EXTDATA / "background_set.txt").read_text().splitlines() if ln.strip()]

    py = ora(gmt_f, element_names=target, background_element_names=background,
             p_value_adjustment_method="BH").sort_values("ontology_id").reset_index(drop=True)
    r = pd.read_csv(FIXTURE).sort_values("ontology_id").reset_index(drop=True)

    assert list(py["ontology_id"]) == list(r["ontology_id"])
    assert list(py["ontology_name"]) == list(r["ontology_name"])
    assert np.allclose(py["p_value"], r["p_value"], rtol=1e-9, atol=1e-12)
    assert np.allclose(py["adjusted_p_value"], r["adjusted_p_value"], rtol=1e-9, atol=1e-12)
