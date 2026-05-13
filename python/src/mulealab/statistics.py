from __future__ import annotations

from collections.abc import Sequence

import numpy as np
from scipy.stats import hypergeom

from mulealab.errors import MuleaLabError


def hypergeometric_pvalue(
    common_in_select: int, common_in_pool: int, pool_size: int, select_size: int
) -> float:
    """One-tailed overrepresentation p-value P(X >= common_in_select).

    Matches mulea R: 1 - phyper(q-1, m, N-m, k) with
    q=common_in_select, m=common_in_pool, N=pool_size, k=select_size.
    """
    if select_size == 0 or common_in_pool == 0:
        return 1.0
    return float(hypergeom.sf(common_in_select - 1, pool_size, common_in_pool, select_size))


def p_adjust(pvalues: Sequence[float], method: str) -> np.ndarray:
    """Multiple-testing correction matching R stats::p.adjust for 'BH' and 'bonferroni'."""
    p = np.asarray(pvalues, dtype=float)
    n = p.size
    if n == 0:
        return p
    if method == "bonferroni":
        return np.minimum(p * n, 1.0)
    if method == "BH":
        order = np.argsort(p, kind="stable")        # ascending
        ranks = np.arange(1, n + 1)
        adj_sorted = p[order] * n / ranks
        # enforce monotone non-increasing scanning from the largest p (R's cummin)
        adj_sorted = np.minimum.accumulate(adj_sorted[::-1])[::-1]
        adj_sorted = np.minimum(adj_sorted, 1.0)
        out = np.empty(n, dtype=float)
        out[order] = adj_sorted
        return out
    raise MuleaLabError(
        f"Unsupported p.adjust method: {method!r} "
        "(supported: 'BH', 'bonferroni'; for eFDR use ora(..., p_value_adjustment_method='eFDR'))"
    )
