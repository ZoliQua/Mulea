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

from scipy.stats import spearmanr

from mulea.gsea import enrichment_score_weighted_detail, gsea
from mulea.io import read_gmt
from mulea.ontology import filter_ontology

REPO_ROOT = Path(__file__).resolve().parents[2]
EXTDATA = REPO_ROOT / "inst" / "extdata"
FIXTURE = Path(__file__).parent / "fixtures" / "fgsea_reference.csv"
POSNEG_FIXTURE = Path(__file__).parent / "fixtures" / "fgsea_posneg_reference.csv"


def _inputs():
    gmt = read_gmt(str(EXTDATA / "Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt"))
    gmt_f = filter_ontology(gmt, min_nr_of_elements=3, max_nr_of_elements=400)
    ranked = pd.read_csv(EXTDATA / "ordered_set.tsv", sep="\t")  # Gene.symbol, logFC
    return gmt_f, ranked


def _run():
    gmt_f, ranked = _inputs()
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


def _ranked_mask_helper():
    """Sorted ranked list + a per-term boolean mask (same as the gsea() pipeline)."""
    from mulea.gsea import _ranked_sorted

    gmt_f, ranked = _inputs()
    genes = ranked.iloc[:, 0].astype(str).tolist()
    scores = ranked.iloc[:, 1].to_numpy(dtype=float)
    sorted_genes, signed_scores = _ranked_sorted(genes, scores)
    index = {g: i for i, g in enumerate(sorted_genes)}

    def mask_for(name: str) -> np.ndarray:
        rows = gmt_f[gmt_f["ontology_name"] == name]
        mask = np.zeros(len(sorted_genes), dtype=bool)
        if len(rows) == 0:
            return mask
        for g in rows.iloc[0]["list_of_values"]:
            i = index.get(g)
            if i is not None:
                mask[i] = True
        return mask

    return signed_scores, mask_for


def test_posneg_es_matches_fgsea_exactly():
    """Configurable scoreType x gseaParam ES must match fgsea::calcGseaStat to <=1e-9.

    Mirrors web/tests/gseaWeighting.test.ts: the grid is scoreType in {pos,neg} x gseaParam in
    {1,1.5}. fgsea returns +/-Inf for an empty-selection term (DhaR) — a degenerate sentinel; our
    port returns 0 there by design, so parity is checked over the finite fixture rows only.
    """
    signed_scores, mask_for = _ranked_mask_helper()
    ref = pd.read_csv(POSNEG_FIXTURE)  # pathway, scoreType, gseaParam, ES
    finite = ref[np.isfinite(ref["ES"])]
    assert len(finite) == 612  # 154 terms x {pos,neg} x {1,1.5} minus 4 DhaR degenerate rows
    assert set(zip(finite["scoreType"], finite["gseaParam"])) == {
        ("pos", 1.0), ("pos", 1.5), ("neg", 1.0), ("neg", 1.5),
    }
    max_abs = 0.0
    for _, row in finite.iterrows():
        es, _peak, _nr, _nh = enrichment_score_weighted_detail(
            signed_scores, mask_for(row["pathway"]), float(row["gseaParam"]), row["scoreType"]
        )
        max_abs = max(max_abs, abs(es - float(row["ES"])))
    assert max_abs < 1e-9, f"posneg ES max abs err {max_abs:.2e} >= 1e-9"


def test_posneg_std_is_larger_magnitude_of_pos_neg():
    """scoreType 'std' equals the larger-magnitude of pos/neg (mirrors gseaWeighting.test.ts)."""
    signed_scores, mask_for = _ranked_mask_helper()
    mask = mask_for("LexA")  # a term with both up and down deviations
    pos, *_ = enrichment_score_weighted_detail(signed_scores, mask, 1, "pos")
    neg, *_ = enrichment_score_weighted_detail(signed_scores, mask, 1, "neg")
    std, *_ = enrichment_score_weighted_detail(signed_scores, mask, 1, "std")
    assert std == (pos if pos >= -neg else neg)


# mulea's progressive rank-based eFDR (Turek et al. 2024), extended from ORA to the GSEA NES
# statistic. The resampling-rank FDR, NOT a replacement for fgsea's BH-on-p adjusted_p_value.
# Mirrors web/tests/gseaEfdr.test.ts: every eFDR in [0,1]; eFDR shrinks as |NES| grows
# (Spearman(|NES|, eFDR) < 0); and it tracks fgsea's adjusted p (Spearman(eFDR, adj) > 0.7).
def _efdr_rows():
    gmt_f, ranked = _inputs()
    return gsea(gmt_f, ranked, permutations=2000, seed=42)


def test_efdr_present_and_in_unit_interval():
    rows = _efdr_rows()
    assert len(rows) == 154  # one row per filtered ontology term
    efdr = rows["efdr"].to_numpy(dtype=float)
    assert np.all(np.isfinite(efdr))
    assert np.all((efdr >= 0.0) & (efdr <= 1.0))


def test_efdr_shrinks_with_abs_nes():
    rows = _efdr_rows()
    abs_nes = np.abs(rows["nes"].to_numpy(dtype=float))
    efdr = rows["efdr"].to_numpy(dtype=float)
    rho = spearmanr(abs_nes, efdr).statistic
    assert rho < 0, f"Spearman(|NES|, eFDR)={rho:.4f} not < 0"


def test_efdr_tracks_adjusted_p():
    rows = _efdr_rows()
    efdr = rows["efdr"].to_numpy(dtype=float)
    adj = rows["adjusted_p_value"].to_numpy(dtype=float)
    rho = spearmanr(efdr, adj).statistic
    assert rho > 0.7, f"Spearman(eFDR, adjusted_p_value)={rho:.4f} not > 0.7"
