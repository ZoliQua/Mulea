"""ORA parity with clusterProfiler::enricher (an external, published Bioconductor tool).

clusterProfiler restricts the hypergeometric test to the ANNOTATED universe (background ∩ union
of term genes), so we run mulealab on that same universe to make the comparison apples-to-apples.
It validates mulealab's ORA core (hypergeometric p-value + BH) against a second implementation;
clusterProfiler has no eFDR, so eFDR is covered by the R-fixture parity, not here. See VALIDATION.md.
"""

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from mulealab.io import read_gmt
from mulealab.ontology import filter_ontology
from mulealab.ora import ora
from mulealab.statistics import p_adjust

REPO_ROOT = Path(__file__).resolve().parents[2]
EXTDATA = REPO_ROOT / "inst" / "extdata"
FIXTURE = Path(__file__).parent / "fixtures" / "clusterprofiler_reference.csv"


@pytest.mark.skipif(not FIXTURE.exists(), reason="clusterProfiler fixture not generated")
def test_ora_matches_clusterprofiler_on_annotated_universe():
    gmt = read_gmt(str(EXTDATA / "Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt"))
    gmt_f = filter_ontology(gmt, min_nr_of_elements=3, max_nr_of_elements=400)
    target = [ln.strip() for ln in (EXTDATA / "target_set.txt").read_text().splitlines() if ln.strip()]
    background = [ln.strip() for ln in (EXTDATA / "background_set.txt").read_text().splitlines() if ln.strip()]

    # clusterProfiler's annotated universe: background ∩ union(term genes)
    annotated = set().union(*gmt_f["list_of_values"])
    ann_bg = [g for g in background if g in annotated]

    py = ora(gmt_f, element_names=target, background_element_names=ann_bg,
             p_value_adjustment_method="BH").set_index("ontology_id")
    cp = pd.read_csv(FIXTURE).set_index("ID")

    # clusterProfiler drops 0-background-overlap terms (e.g. DhaR) that mulealab keeps at p=1.
    common = cp.index.intersection(py.index)
    assert len(common) == 153

    # 1) hypergeometric p-values: floating-point identical
    np.testing.assert_allclose(py.loc[common, "p_value"], cp.loc[common, "pvalue"], rtol=1e-9, atol=1e-12)

    # 2) BH over exactly clusterProfiler's tested set (so the test count m matches)
    bh = p_adjust(py.loc[common, "p_value"].to_numpy(), "BH")
    np.testing.assert_allclose(bh, cp.loc[common, "p.adjust"].to_numpy(), rtol=1e-9, atol=1e-12)
