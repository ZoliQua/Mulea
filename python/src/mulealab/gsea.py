"""Ranked-list GSEA — the paper's method (weighted Kolmogorov-Smirnov enrichment score + a
permutation test, via fgsea). The ES and leading edge are deterministic and match
``fgsea::calcGseaStat`` exactly; NES and the p-value come from a classic gene-permutation null,
so they are tolerance-parity with fgsea's multilevel p (see VALIDATION.md).

This is the Python mirror of ``web/src/gsea.ts`` — same algorithm, same tie-breaking, so the
three legs (R/fgsea, web, Python) stay in numerical parity.

Ties: ~92% of the example logFC values tie. fgsea (R ``order``) breaks ties by input order with a
stable sort; we do the same (stable descending), so the ES is reproducible and matches fgsea.
"""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np
import pandas as pd

GSEA_COLUMNS = [
    "ontology_id",
    "ontology_name",
    "size",
    "es",
    "nes",
    "p_value",
    "adjusted_p_value",
    "leading_edge",
]


def _ranked_sorted(genes: Sequence[str], scores: Sequence[float] | np.ndarray) -> tuple[list[str], np.ndarray]:
    """Stable descending sort by score; ties keep input order (matches R ``order(decreasing=TRUE)``).

    Returns the sorted gene names and the matching ``abs(score)`` array.
    """
    scores_arr = np.asarray(scores, dtype=float)
    # argsort on negated scores is stable, so ties fall back to input order (ascending index).
    order = np.argsort(-scores_arr, kind="stable")
    sorted_genes = [genes[i] for i in order]
    abs_scores = np.abs(scores_arr[order])
    return sorted_genes, abs_scores


def enrichment_score(abs_scores: np.ndarray, in_set: np.ndarray) -> tuple[float, int, float, int]:
    """Weighted KS enrichment score (gseaParam=1, scoreType="std") for a boolean membership mask.

    Uses fgsea's hit-only accumulation (evaluate the deviation only at hit positions) rather than a
    full N-step running sum, so the floating-point result matches fgsea to ~1e-12 instead of
    drifting ~1e-6 from accumulating the miss step N times.

    Returns ``(es, peak, nr, nh)`` where ``peak`` is the 0-indexed list position of the peak
    (``-1`` when there is no peak) and ``nr``/``nh`` are the hit weight sum and hit count.
    """
    n = len(abs_scores)
    hit_pos = np.flatnonzero(in_set)
    nh = int(hit_pos.size)
    nr = float(abs_scores[hit_pos].sum()) if nh else 0.0
    if nh == 0 or nr == 0.0 or nh == n:
        return 0.0, -1, nr, nh
    miss_den = n - nh
    cum = 0.0
    top = 0.0
    bottom = 0.0
    top_peak = -1
    bot_peak = -1
    for k in range(nh):
        pos = int(hit_pos[k])  # 0-indexed position in the ranked list
        misses = pos - k  # misses strictly before this hit
        before = cum / nr - misses / miss_den  # dip just before this hit
        if before < bottom:
            bottom = before
            bot_peak = pos
        cum += float(abs_scores[pos])
        after = cum / nr - misses / miss_den  # peak just after this hit
        if after > top:
            top = after
            top_peak = pos
    # scoreType "std": the larger absolute deviation, signed.
    if top >= -bottom:
        return top, top_peak, nr, nh
    return bottom, bot_peak, nr, nh


def _leading_edge(genes: list[str], in_set: np.ndarray, es: float, peak: int) -> list[str]:
    """Leading-edge genes: the set members driving the ES up to (ES>0) or from (ES<0) the peak."""
    if peak < 0:
        return []
    if es >= 0:
        return [genes[i] for i in range(peak + 1) if in_set[i]]
    return [genes[i] for i in range(len(genes) - 1, peak - 1, -1) if in_set[i]]


def _es_from_positions(abs_scores: np.ndarray, positions: np.ndarray) -> float:
    """ES from an (unsorted) set of hit positions in the ranked list — used for the permutation null."""
    n = len(abs_scores)
    nh = int(positions.size)
    if nh == 0 or nh == n:
        return 0.0
    sorted_pos = np.sort(positions)
    nr = float(abs_scores[sorted_pos].sum())
    if nr == 0.0:
        return 0.0
    miss_den = n - nh
    cum = 0.0
    top = 0.0
    bottom = 0.0
    for k in range(nh):
        misses = int(sorted_pos[k]) - k
        before = cum / nr - misses / miss_den
        if before < bottom:
            bottom = before
        cum += float(abs_scores[sorted_pos[k]])
        after = cum / nr - misses / miss_den
        if after > top:
            top = after
    return top if top >= -bottom else bottom


def running_enrichment(
    term_genes: Sequence[str], genes: Sequence[str], scores: Sequence[float]
) -> dict:
    """Full running-enrichment curve for one term (for the running-ES plot).

    Mirrors ``runningEnrichment`` in ``web/src/gsea.ts``: a full N-step running sum (the curve
    deliberately uses the N-step form so the plotted line is continuous), returning the curve,
    the hit indices, and the ES/peak. ``genes``/``scores`` are the (unsorted) ranked list.
    """
    sorted_genes, abs_scores = _ranked_sorted(genes, scores)
    n = len(sorted_genes)
    term_set = set(term_genes)
    in_set = np.array([g in term_set for g in sorted_genes], dtype=bool)
    nh = int(in_set.sum())
    nr = float(abs_scores[in_set].sum()) if nh else 0.0
    if nh == 0 or nr == 0.0 or nh == n:
        return {"curve": [0.0] * n, "hit_indices": [], "es": 0.0, "peak": -1, "n": n}
    miss_step = 1.0 / (n - nh)
    curve = [0.0] * n
    hit_indices: list[int] = []
    run = 0.0
    es = 0.0
    peak = -1
    for i in range(n):
        run += float(abs_scores[i]) / nr if in_set[i] else -miss_step
        curve[i] = run
        if in_set[i]:
            hit_indices.append(i)
        if abs(run) > abs(es):
            es = run
            peak = i
    return {"curve": curve, "hit_indices": hit_indices, "es": es, "peak": peak, "n": n}


def gsea(
    gmt: pd.DataFrame,
    ranked: pd.DataFrame,
    permutations: int = 1000,
    seed: int = 42,
) -> pd.DataFrame:
    """Ranked-list GSEA.

    ES + leading edge are exact (match ``fgsea::calcGseaStat``); NES and the p-value come from a
    classic gene-permutation null (default 1000 permutations, seeded by ``numpy.default_rng(seed)``),
    so they are tolerance-parity with fgsea's multilevel p. BH across terms.

    ``gmt`` is a DataFrame [ontology_id, ontology_name, list_of_values] (from ``read_gmt``).
    ``ranked`` is a DataFrame whose first two columns are the gene name and its score
    (e.g. Gene.symbol, logFC). Returns a DataFrame with ``GSEA_COLUMNS``.
    """
    gene_col, score_col = ranked.columns[0], ranked.columns[1]
    genes_in = ranked[gene_col].astype(str).tolist()
    scores_in = ranked[score_col].to_numpy(dtype=float)
    sorted_genes, abs_scores = _ranked_sorted(genes_in, scores_in)
    n = len(sorted_genes)
    index = {g: i for i, g in enumerate(sorted_genes)}

    sizes: list[int] = []
    es_vals: list[float] = []
    peaks: list[int] = []
    leading: list[list[str]] = []
    in_set_arr = np.zeros(n, dtype=bool)
    for term_genes in gmt["list_of_values"]:
        in_set_arr[:] = False
        size = 0
        for g in term_genes:
            i = index.get(g)
            if i is not None:
                in_set_arr[i] = True
                size += 1
        es, peak, _nr, _nh = enrichment_score(abs_scores, in_set_arr)
        sizes.append(size)
        es_vals.append(es)
        peaks.append(peak)
        leading.append(_leading_edge(sorted_genes, in_set_arr, es, peak))

    rng = np.random.default_rng(seed)
    nes_vals: list[float] = []
    p_vals: list[float] = []
    for size, es in zip(sizes, es_vals):
        if size == 0 or es == 0.0:
            nes_vals.append(0.0)
            p_vals.append(1.0)
            continue
        pos_count = 0
        neg_count = 0
        pos_sum = 0.0
        neg_sum = 0.0
        as_extreme = 0
        for _ in range(permutations):
            perm_es = _es_from_positions(abs_scores, rng.choice(n, size=size, replace=False))
            if perm_es >= 0:
                pos_count += 1
                pos_sum += perm_es
            else:
                neg_count += 1
                neg_sum += -perm_es
            if es >= 0:
                if perm_es >= es:
                    as_extreme += 1
            elif perm_es <= es:
                as_extreme += 1
        if es >= 0:
            denom = pos_count
            mean_abs = pos_sum / pos_count if pos_count else 0.0
        else:
            denom = neg_count
            mean_abs = neg_sum / neg_count if neg_count else 0.0
        nes_vals.append(es / mean_abs if mean_abs > 0 else 0.0)
        p_vals.append((1 + as_extreme) / (1 + denom))

    adjusted = _bh(np.asarray(p_vals, dtype=float))

    return pd.DataFrame(
        {
            "ontology_id": gmt["ontology_id"].to_numpy(),
            "ontology_name": gmt["ontology_name"].to_numpy(),
            "size": sizes,
            "es": es_vals,
            "nes": nes_vals,
            "p_value": p_vals,
            "adjusted_p_value": adjusted,
            "leading_edge": leading,
        }
    )


def _bh(p: np.ndarray) -> np.ndarray:
    """Benjamini-Hochberg adjusted p-values (matches the BH in ``web/src/gsea.ts``)."""
    m = p.size
    if m == 0:
        return p.copy()
    order = np.argsort(p, kind="stable")
    adj = np.empty(m, dtype=float)
    prev = 1.0
    for rank in range(m - 1, -1, -1):
        i = order[rank]
        prev = min(prev, p[i] * m / (rank + 1))
        adj[i] = prev
    return adj
