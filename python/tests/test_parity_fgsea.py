"""GSEA parity with fgsea (the engine the mulea R package uses for ranked enrichment).

The fixture ``fgsea_reference.csv`` was produced by ``fgsea`` on the same GMT + ranked list; its
``ES`` column is exactly ``fgsea::calcGseaStat`` (the weighted-KS enrichment score). We assert the
deterministic part (ES + leading edge) is byte-equality-tight (≤1e-9), and that the seeded
permutation NES agrees in sign on every shared term and correlates ≥0.99 with fgsea's NES — the
tolerance-parity contract from the spec (fgsea uses a multilevel p; we use a classic gene-permutation
null). See VALIDATION.md / PARITY.md.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from mulealab.gsea import gsea
from mulealab.io import read_gmt
from mulealab.ontology import filter_ontology

REPO_ROOT = Path(__file__).resolve().parents[2]
EXTDATA = REPO_ROOT / "inst" / "extdata"
FIXTURE = Path(__file__).parent / "fixtures" / "fgsea_reference.csv"


def _run():
    gmt = read_gmt(str(EXTDATA / "Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt"))
    gmt_f = filter_ontology(gmt, min_nr_of_elements=3, max_nr_of_elements=400)
    ranked = pd.read_csv(EXTDATA / "ordered_set.tsv", sep="\t")  # Gene.symbol, logFC
    res = gsea(gmt_f, ranked, permutations=1000, seed=42)
    ref = pd.read_csv(FIXTURE)  # pathway, size, ES, NES, pval, padj
    merged = res.merge(ref, left_on="ontology_name", right_on="pathway", how="inner")
    return merged


def test_es_matches_fgsea_exactly():
    """ES is the deterministic weighted-KS calcGseaStat — must match to ≤1e-9."""
    merged = _run()
    assert len(merged) == 153
    np.testing.assert_allclose(merged["es"].to_numpy(), merged["ES"].to_numpy(), atol=1e-9, rtol=0)


def test_nes_sign_and_correlation():
    """NES comes from a seeded permutation null: sign must agree everywhere; Pearson ≥0.99."""
    merged = _run()
    assert len(merged) == 153
    ours = merged["nes"].to_numpy()
    theirs = merged["NES"].to_numpy()
    # sign agreement on all shared terms (zeros count as agreeing with their sign)
    assert np.all(np.sign(ours) == np.sign(theirs))
    r = np.corrcoef(ours, theirs)[0, 1]
    assert r >= 0.99, f"NES Pearson r={r:.4f} < 0.99"
