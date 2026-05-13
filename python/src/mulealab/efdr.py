from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from scipy.stats import hypergeom

from mulealab.errors import MuleaLabError
from mulealab.statistics import hypergeometric_pvalue


def r_obs_ranks(p_values: np.ndarray) -> np.ndarray:
    """R's ``rank(round(p, 15), ties.method="max")``.

    Ascending ranks (smallest p-value → rank 1, 1-based). Tied values all receive the
    largest rank in their tie group, matching mulea's ``R_obs``.
    """
    rounded = np.round(np.asarray(p_values, dtype=float), 15)
    order = np.argsort(rounded, kind="stable")
    sorted_vals = rounded[order]
    n = rounded.size
    ranks_sorted = np.empty(n, dtype=float)
    i = 0
    while i < n:
        j = i
        while j + 1 < n and sorted_vals[j + 1] == sorted_vals[i]:
            j += 1
        ranks_sorted[i : j + 1] = j + 1  # 1-based max rank for the whole tie group
        i = j + 1
    out = np.empty(n, dtype=float)
    out[order] = ranks_sorted
    return out


EFDR_COLUMNS = [
    "ontology_id",
    "ontology_name",
    "nr_common_with_tested_elements",
    "nr_common_with_background_elements",
    "p_value",
    "eFDR",
]


def _term_pvalue_lookup(m: int, pool_size: int, select_size: int) -> np.ndarray:
    """p(k) = hypergeometric overrepresentation p-value for overlap k=0..select_size."""
    return np.array(
        [hypergeometric_pvalue(k, m, pool_size, select_size) for k in range(select_size + 1)],
        dtype=float,
    )


def _exact_null_sorted(common_in_pool: np.ndarray, pool_size: int, select_size: int) -> tuple[np.ndarray, np.ndarray]:
    """Exact pooled null distribution as (sorted p-values, cumulative mass).

    For every term (with m genes in the pool) and every possible overlap k, emit the
    simulated p-value p(k) with mass = hypergeom.pmf(k). Mass per term sums to 1, so the
    total mass equals the number of terms. This is the steps→∞ limit of mulea's resampling.
    """
    pvals_parts = []
    mass_parts = []
    for m in common_in_pool:
        if select_size == 0 or m == 0:
            pvals_parts.append(np.array([1.0]))
            mass_parts.append(np.array([1.0]))
            continue
        kmin = max(0, select_size + m - pool_size)
        kmax = min(select_size, m)
        ks = np.arange(kmin, kmax + 1)
        mass = hypergeom.pmf(ks, pool_size, m, select_size)
        pk = np.array([hypergeometric_pvalue(int(k), int(m), pool_size, select_size) for k in ks])
        pvals_parts.append(pk)
        mass_parts.append(mass)
    pvals = np.round(np.concatenate(pvals_parts), 15)
    mass = np.concatenate(mass_parts)
    order = np.argsort(pvals, kind="stable")
    return pvals[order], np.cumsum(mass[order])


def _efdr_from_sorted_null(p_obs: np.ndarray, r_obs: np.ndarray, null_pvals_sorted: np.ndarray, null_cummass: np.ndarray) -> np.ndarray:
    """eFDR per term: R_exp = total null mass with p ≤ p_obs; eFDR = min(R_exp / R_obs, 1)."""
    p_obs_r = np.round(np.asarray(p_obs, dtype=float), 15)
    idx = np.searchsorted(null_pvals_sorted, p_obs_r, side="right")  # count of null p ≤ p_obs
    r_exp = np.where(idx > 0, null_cummass[np.clip(idx - 1, 0, None)], 0.0)
    return np.minimum(r_exp / r_obs, 1.0)


def _observed_stats(gmt: pd.DataFrame, element_names, background_element_names) -> tuple[int, int, np.ndarray, np.ndarray, np.ndarray, list[np.ndarray]]:
    """Return pool_size, select_size, and per-term (common_in_select, common_in_pool, p_obs,
    term-pool-index-array)."""
    pool_list = list(dict.fromkeys(background_element_names))  # unique, order-stable
    pool_index = {g: i for i, g in enumerate(pool_list)}
    pool_set = set(pool_list)
    pool_size = len(pool_list)
    select = set(element_names) & pool_set
    select_size = len(select)

    n = len(gmt)
    common_in_pool = np.empty(n, dtype=int)
    common_in_select = np.empty(n, dtype=int)
    p_obs = np.empty(n, dtype=float)
    term_pool_indices: list[np.ndarray] = []
    for i, genes in enumerate(gmt["list_of_values"]):
        term = set(genes)
        in_pool = term & pool_set
        common_in_pool[i] = len(in_pool)
        common_in_select[i] = len(term & select)
        p_obs[i] = hypergeometric_pvalue(
            int(common_in_select[i]), int(common_in_pool[i]), pool_size, select_size
        )
        term_pool_indices.append(
            np.fromiter((pool_index[g] for g in in_pool), dtype=int, count=len(in_pool))
        )
    return pool_size, select_size, common_in_pool, common_in_select, p_obs, term_pool_indices


def set_based_enrichment_test(
    gmt: pd.DataFrame,
    element_names,
    background_element_names,
    *,
    mode: str = "exact",
    number_of_permutations: int = 10000,
    random_seed: int = 0,
) -> pd.DataFrame:
    """eFDR-based set enrichment, returning EFDR_COLUMNS.

    mode="exact" (default): deterministic analytic eFDR (no RNG).
    mode="mc": Monte-Carlo resampling eFDR mirroring mulea (seeded by random_seed).
    """
    pool_size, select_size, common_in_pool, common_in_select, p_obs, term_pool_indices = (
        _observed_stats(gmt, element_names, background_element_names)
    )
    if select_size == 0:
        efdr = np.full(len(gmt), np.nan)
    else:
        r_obs = r_obs_ranks(p_obs)
        if mode == "exact":
            null_p, null_cummass = _exact_null_sorted(common_in_pool, pool_size, select_size)
            efdr = _efdr_from_sorted_null(p_obs, r_obs, null_p, null_cummass)
        elif mode == "mc":
            null_p = _simulate_null_pvalues(
                term_pool_indices, pool_size, select_size, number_of_permutations,
                np.random.default_rng(random_seed),
            )
            null_cummass = np.arange(1, null_p.size + 1, dtype=float) / number_of_permutations
            efdr = _efdr_from_sorted_null(p_obs, r_obs, null_p, null_cummass)
        else:
            raise MuleaLabError(f"Unknown eFDR mode: {mode!r} (use 'exact' or 'mc')")

    return pd.DataFrame(
        {
            "ontology_id": gmt["ontology_id"].to_numpy(),
            "ontology_name": gmt["ontology_name"].to_numpy(),
            "nr_common_with_tested_elements": common_in_select,
            "nr_common_with_background_elements": common_in_pool,
            "p_value": p_obs,
            "eFDR": efdr,
        }
    )


def _simulate_null_pvalues(term_pool_indices, pool_size, select_size, n_perm, rng):
    """Monte-Carlo pooled null p-values, mirroring mulea's resampling.

    For each of ``n_perm`` permutations, draw ``select_size`` pool elements uniformly at
    random (without replacement) and record every term's overlap p-value. Returns all
    ``n_perm * n_terms`` simulated p-values, rounded to 15 digits and sorted ascending.
    """
    n_terms = len(term_pool_indices)
    if n_terms == 0:
        return np.empty(0, dtype=float)
    rows = np.concatenate([np.full(len(t), i, dtype=int) for i, t in enumerate(term_pool_indices)])
    cols = np.concatenate(term_pool_indices).astype(int)
    incidence = csr_matrix(
        (np.ones(cols.size, dtype=np.int32), (rows, cols)), shape=(n_terms, pool_size)
    )
    common_in_pool = np.array([len(t) for t in term_pool_indices], dtype=int)
    lookups = [_term_pvalue_lookup(int(m), pool_size, select_size) for m in common_in_pool]

    out = np.empty(n_perm * n_terms, dtype=float)
    for s in range(n_perm):
        sampled = rng.choice(pool_size, size=select_size, replace=False)
        vec = np.zeros(pool_size, dtype=np.int32)
        vec[sampled] = 1
        overlaps = incidence.dot(vec)  # per-term overlap counts
        out[s * n_terms : (s + 1) * n_terms] = [lookups[j][overlaps[j]] for j in range(n_terms)]
    out = np.round(out, 15)
    out.sort()
    return out
