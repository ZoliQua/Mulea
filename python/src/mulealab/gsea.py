"""Ranked-list GSEA — the paper's method (weighted Kolmogorov-Smirnov enrichment score + a
permutation test, via fgsea). The ES and leading edge are deterministic and match
``fgsea::calcGseaStat`` exactly; NES and the p-value come from a classic gene-permutation null,
so they are tolerance-parity with fgsea's multilevel p (see VALIDATION.md).

This is the Python mirror of ``web/src/gsea.ts`` (and ``web/src/gseaWeighting.ts``) — same
algorithm, same tie-breaking, same configurable ``scoreType``/``gseaParam`` knobs, and the same
progressive rank-based eFDR — so the three legs (R/fgsea, web, Python) stay in numerical parity.

Ties: ~92% of the example logFC values tie. fgsea (R ``order``) breaks ties by input order with a
stable sort; we do the same (stable descending), so the ES is reproducible and matches fgsea.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Literal

import numpy as np
import pandas as pd

ScoreType = Literal["std", "pos", "neg"]

GSEA_COLUMNS = [
    "ontology_id",
    "ontology_name",
    "size",
    "es",
    "nes",
    "p_value",
    "adjusted_p_value",
    "efdr",
    "leading_edge",
]


def _ranked_sorted(genes: Sequence[str], scores: Sequence[float] | np.ndarray) -> tuple[list[str], np.ndarray]:
    """Stable descending sort by score; ties keep input order (matches R ``order(decreasing=TRUE)``).

    Returns the sorted gene names and the matching *signed* score array (use ``np.abs`` for weights).
    """
    scores_arr = np.asarray(scores, dtype=float)
    # argsort on negated scores is stable, so ties fall back to input order (ascending index).
    order = np.argsort(-scores_arr, kind="stable")
    sorted_genes = [genes[i] for i in order]
    signed_scores = scores_arr[order]
    return sorted_genes, signed_scores


def _weights(signed_scores: np.ndarray, gsea_param: float) -> np.ndarray:
    """Per-gene KS weight ``|score|^gseaParam`` (gseaParam=1 → plain ``|score|``)."""
    a = np.abs(signed_scores)
    return a if gsea_param == 1 else np.power(a, gsea_param)


def enrichment_score_weighted_detail(
    signed_scores: np.ndarray,
    in_set: np.ndarray,
    gsea_param: float = 1,
    score_type: ScoreType = "std",
) -> tuple[float, int, float, int]:
    """Configurable weighted-KS enrichment score (gseaParam / scoreType knobs of fgsea::calcGseaStat).

    Port of ``enrichmentScoreWeightedDetail`` in ``web/src/gseaWeighting.ts``. Uses fgsea's hit-only
    accumulation (evaluate the deviation only at hit positions) rather than a full N-step running
    sum, so the floating-point result matches fgsea to ~1e-12 instead of drifting ~1e-6 from
    accumulating the miss step N times.

    ``score_type``: ``"std"`` = larger absolute deviation, signed (two-sided); ``"pos"`` = max
    positive (top) deviation only; ``"neg"`` = min negative (bottom) deviation only.

    Returns ``(es, peak, nr, nh)`` where ``peak`` is the 0-indexed list position of the peak
    (``-1`` when there is no peak) and ``nr``/``nh`` are the hit weight sum and hit count.
    """
    n = len(signed_scores)
    hit_pos = np.flatnonzero(in_set)
    nh = int(hit_pos.size)
    weights = _weights(signed_scores, gsea_param)
    nr = float(weights[hit_pos].sum()) if nh else 0.0
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
        cum += float(weights[pos])
        after = cum / nr - misses / miss_den  # peak just after this hit
        if after > top:
            top = after
            top_peak = pos
    if score_type == "pos":
        return top, top_peak, nr, nh
    if score_type == "neg":
        return bottom, bot_peak, nr, nh
    # scoreType "std": the larger absolute deviation, signed.
    if top >= -bottom:
        return top, top_peak, nr, nh
    return bottom, bot_peak, nr, nh


def enrichment_score(abs_scores: np.ndarray, in_set: np.ndarray) -> tuple[float, int, float, int]:
    """Weighted KS enrichment score (gseaParam=1, scoreType="std"); ``abs_scores`` may be signed.

    Thin wrapper kept for backward compatibility — delegates to
    :func:`enrichment_score_weighted_detail` with the defaults (weights take ``np.abs`` internally,
    so passing already-absolute scores is fine).
    """
    return enrichment_score_weighted_detail(abs_scores, in_set, 1, "std")


def _leading_edge(genes: list[str], in_set: np.ndarray, es: float, peak: int) -> list[str]:
    """Leading-edge genes: the set members driving the ES up to (ES>0) or from (ES<0) the peak."""
    if peak < 0:
        return []
    if es >= 0:
        return [genes[i] for i in range(peak + 1) if in_set[i]]
    return [genes[i] for i in range(len(genes) - 1, peak - 1, -1) if in_set[i]]


def _null_es_vectorised(
    weights: np.ndarray,
    n: int,
    size: int,
    permutations: int,
    rng: np.random.Generator,
    score_type: ScoreType,
) -> np.ndarray:
    """Vectorised gene-permutation null ES for one term.

    Draws ``permutations`` independent samples of ``size`` distinct ranked positions, then computes
    the weighted-KS ES for every permutation with NumPy array ops (no per-permutation Python loop).
    Each permutation's positions are sorted ascending, exactly mirroring ``esFromPositions`` in
    ``web/src/gsea.ts`` (hit-only accumulation over the sorted positions).

    Returns a 1-D array of ``permutations`` null ES values.
    """
    if size == 0 or size == n:
        return np.zeros(permutations, dtype=float)

    # (permutations, size) distinct positions per row, sorted ascending (mirrors esFromPositions).
    # `rng.choice(..., replace=False)` draws `size` distinct positions in O(n); the heavy lifting
    # (the per-permutation weighted-KS deviation scan) is then fully vectorised below over the whole
    # (permutations, size) array — that is the win vs the old pure-Python per-permutation ES loop.
    pos = np.empty((permutations, size), dtype=np.int64)
    for k in range(permutations):
        pos[k] = rng.choice(n, size=size, replace=False)
    pos.sort(axis=1)

    w = weights[pos]  # (permutations, size) hit weights in sorted-position order
    nr = w.sum(axis=1)  # (permutations,)
    miss_den = n - size

    # k index 0..size-1 along axis 1; "misses strictly before this hit" = pos - k.
    k_idx = np.arange(size, dtype=np.int64)[None, :]
    misses = pos - k_idx  # (permutations, size)

    cum_before = np.concatenate(
        [np.zeros((permutations, 1)), np.cumsum(w, axis=1)[:, :-1]], axis=1
    )  # cumulative hit weight BEFORE adding this hit
    cum_after = np.cumsum(w, axis=1)  # cumulative hit weight AFTER adding this hit

    nr_col = nr[:, None]
    miss_term = misses / miss_den
    # Guard nr==0 rows (all-zero-weight hits): their deviations are undefined → ES 0.
    safe = nr_col > 0
    before = np.where(safe, cum_before / np.where(safe, nr_col, 1.0) - miss_term, 0.0)
    after = np.where(safe, cum_after / np.where(safe, nr_col, 1.0) - miss_term, 0.0)

    top = np.maximum(after.max(axis=1), 0.0)  # running max can stay at 0 (start value)
    bottom = np.minimum(before.min(axis=1), 0.0)

    if score_type == "pos":
        es = top
    elif score_type == "neg":
        es = bottom
    else:
        es = np.where(top >= -bottom, top, bottom)
    es = np.where(nr > 0, es, 0.0)
    return es


def running_enrichment(
    term_genes: Sequence[str], genes: Sequence[str], scores: Sequence[float]
) -> dict:
    """Full running-enrichment curve for one term (for the running-ES plot).

    Mirrors ``runningEnrichment`` in ``web/src/gsea.ts``: a full N-step running sum (the curve
    deliberately uses the N-step form so the plotted line is continuous), returning the curve,
    the hit indices, and the ES/peak. ``genes``/``scores`` are the (unsorted) ranked list.
    """
    sorted_genes, signed_scores = _ranked_sorted(genes, scores)
    abs_scores = np.abs(signed_scores)
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
    gsea_param: float = 1,
    score_type: ScoreType = "std",
) -> pd.DataFrame:
    """Ranked-list GSEA.

    ES + leading edge are exact (match ``fgsea::calcGseaStat``); NES and the p-value come from a
    classic gene-permutation null (default 1000 permutations, seeded by ``numpy.default_rng(seed)``),
    so they are tolerance-parity with fgsea's multilevel p. BH across terms.

    ``gsea_param`` / ``score_type`` expose fgsea's weighting knobs (default 1 / ``"std"``): weight
    = ``|score|^gseaParam``; ``"pos"``/``"neg"`` keep only the top/bottom deviation. ``efdr`` is
    mulea's progressive rank-based empirical FDR (Turek et al. 2024), extended from ORA to the GSEA
    NES statistic — identical definition to ``web/src/gsea.ts``. It is NOT a replacement for fgsea's
    BH-on-p ``adjusted_p_value``.

    ``gmt`` is a DataFrame [ontology_id, ontology_name, list_of_values] (from ``read_gmt``).
    ``ranked`` is a DataFrame whose first two columns are the gene name and its score
    (e.g. Gene.symbol, logFC). Returns a DataFrame with ``GSEA_COLUMNS``.
    """
    gene_col, score_col = ranked.columns[0], ranked.columns[1]
    genes_in = ranked[gene_col].astype(str).tolist()
    scores_in = ranked[score_col].to_numpy(dtype=float)
    sorted_genes, signed_scores = _ranked_sorted(genes_in, scores_in)
    n = len(sorted_genes)
    index = {g: i for i, g in enumerate(sorted_genes)}
    weights = _weights(signed_scores, gsea_param)

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
        es, peak, _nr, _nh = enrichment_score_weighted_detail(signed_scores, in_set_arr, gsea_param, score_type)
        sizes.append(size)
        es_vals.append(es)
        peaks.append(peak)
        leading.append(_leading_edge(sorted_genes, in_set_arr, es, peak))

    rng = np.random.default_rng(seed)
    nes_vals: list[float] = []
    p_vals: list[float] = []
    # Retain each term's per-permutation null ES + same-sign means so the second pass can build the
    # pooled null-NES distribution the rank-based eFDR needs (cf. ORA's pooled hypergeometric null).
    null_es_per_term: list[np.ndarray] = []
    pos_means: list[float] = []
    neg_means: list[float] = []
    for size, es in zip(sizes, es_vals):
        if size == 0 or es == 0.0:
            nes_vals.append(0.0)
            p_vals.append(1.0)
            null_es_per_term.append(np.empty(0, dtype=float))
            pos_means.append(0.0)
            neg_means.append(0.0)
            continue
        perm_es = _null_es_vectorised(weights, n, size, permutations, rng, score_type)
        pos_mask = perm_es >= 0
        pos_count = int(pos_mask.sum())
        neg_count = permutations - pos_count
        pos_sum = float(perm_es[pos_mask].sum())
        neg_sum = float(-perm_es[~pos_mask].sum())
        if es >= 0:
            as_extreme = int((perm_es >= es).sum())
            denom = pos_count
            mean_abs = pos_sum / pos_count if pos_count else 0.0
        else:
            as_extreme = int((perm_es <= es).sum())
            denom = neg_count
            mean_abs = neg_sum / neg_count if neg_count else 0.0
        nes_vals.append(es / mean_abs if mean_abs > 0 else 0.0)
        p_vals.append((1 + as_extreme) / (1 + denom))
        null_es_per_term.append(perm_es)
        pos_means.append(pos_sum / pos_count if pos_count else 0.0)
        neg_means.append(neg_sum / neg_count if neg_count else 0.0)

    # Second pass — mulea's progressive rank-based eFDR (Turek et al. 2024), extended from ORA's
    # p-value rank to the GSEA NES statistic. Normalise each retained null ES the SAME way as the
    # observed NES (divide by the same-sign mean |null ES| of its own term) to get a null NES, pool
    # every |null NES| across all (term, perm) and sort once. For each observed term j:
    #   R_obs_j = #{ observed i : |NES_i| >= |NES_j| }
    #   R_exp_j = (1/permutations) * #{ (term i, perm s) : |nullNES_i^s| >= |NES_j| }
    #   eFDR_j  = min(R_exp_j / R_obs_j, 1)
    # This is the resampling FDR mulea reports, NOT fgsea's BH-on-p adjusted_p_value.
    null_abs_nes_parts: list[np.ndarray] = []
    for perm_es, pmean, nmean in zip(null_es_per_term, pos_means, neg_means):
        if perm_es.size == 0:
            continue
        m = np.where(perm_es >= 0, pmean, nmean)  # same-sign normaliser per null ES
        valid = m > 0
        if valid.any():
            null_abs_nes_parts.append(np.abs(perm_es[valid]) / m[valid])
    null_abs_nes = (
        np.sort(np.concatenate(null_abs_nes_parts)) if null_abs_nes_parts else np.empty(0, dtype=float)
    )

    abs_nes = np.abs(np.asarray(nes_vals, dtype=float))
    sorted_abs_nes = np.sort(abs_nes)
    efdr_vals: list[float] = []
    for an in abs_nes:
        if not (an > 0):  # NES==0 (empty/zero-ES term) — least extreme, eFDR clamps to 1
            efdr_vals.append(1.0)
            continue
        r_obs = int(abs_nes.size - np.searchsorted(sorted_abs_nes, an, side="left"))
        ge = int(null_abs_nes.size - np.searchsorted(null_abs_nes, an, side="left"))
        r_exp = ge / permutations
        efdr_vals.append(min(r_exp / r_obs, 1.0) if r_obs else 1.0)

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
            "efdr": efdr_vals,
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
