from __future__ import annotations

import numpy as np


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
