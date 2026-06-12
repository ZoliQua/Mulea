from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Literal

import numpy as np
from scipy.stats import hypergeom

from mulealab.errors import MuleaLabError

# Tail direction for the hypergeometric test, mirroring web/src/statistics.ts
# HypergeometricDirection and the R mulea ORA convention.
HypergeometricDirection = Literal["over", "under", "two-sided"]


def hypergeometric_pvalue(
    common_in_select: int,
    common_in_pool: int,
    pool_size: int,
    select_size: int,
    direction: HypergeometricDirection = "over",
) -> float:
    """Hypergeometric test p-value; direction selects the tail.

    Parameters
    ----------
    common_in_select : int
        Observed overlap k (items in both the select set and the term).
    common_in_pool : int
        Term size in the background pool (m / successes in phyper notation).
    pool_size : int
        Background pool size (N / population).
    select_size : int
        Number of tested elements (n / draws).
    direction : {"over", "under", "two-sided"}, default "over"
        * ``"over"``      — P(X >= k), over-representation.
          Bit-identical to mulea R: ``1 - phyper(k-1, m, N-m, n)``.
          Default keeps backward compatibility.
        * ``"under"``     — P(X <= k), depletion.
          Equivalent to R ``phyper(k, m, N-m, n)``.
        * ``"two-sided"`` — Fisher-style two-sided p-value: sum of all support
          probabilities <= P(X = k) * (1 + 1e-7).  Matches R
          ``stats::fisher.test()`` and the web TS implementation.
    """
    k = int(common_in_select)
    m = int(common_in_pool)
    N = int(pool_size)
    n = int(select_size)

    if direction == "over":
        if n == 0 or m == 0:
            return 1.0
        return float(hypergeom.sf(k - 1, N, m, n))

    # Support of X: [kmin, kmax]
    kmin = max(0, n + m - N)
    kmax = min(n, m)

    if direction == "under":
        if k < kmin or k > kmax:
            return 0.0
        return float(hypergeom.cdf(k, N, m, n))

    if direction == "two-sided":
        if k < kmin or k > kmax:
            return 0.0
        # Sum pmf(i) for all i in support where pmf(i) <= pmf(k) * (1 + 1e-7).
        # Matches R's fisher.test two-sided convention and the web TS branch.
        p_obs = float(hypergeom.pmf(k, N, m, n))
        support = range(kmin, kmax + 1)
        pmf_vals = hypergeom.pmf(list(support), N, m, n)
        total = float(pmf_vals[pmf_vals <= p_obs * (1 + 1e-7)].sum())
        return min(total, 1.0)

    raise MuleaLabError(
        f"Unknown direction: {direction!r} (supported: 'over', 'under', 'two-sided')"
    )


def effect_size(
    common_in_select: int,
    common_in_pool: int,
    pool_size: int,
    select_size: int,
) -> dict[str, float]:
    """Effect-size summary for one ORA term from its 2×2 contingency table.

    Mirrors ``effectSize`` in ``web/src/statistics.ts`` exactly.

    The 2×2 table (same notation as the web TS doc-comment):
    ::
           in term   not in term
      sel   a = k     b = n − k
      ~sel  c = K − k  d = (N − n) − (K − k)

    Parameters
    ----------
    common_in_select : int   k — overlap between term and select set.
    common_in_pool   : int   K — term size in the background pool.
    pool_size        : int   N — background pool size.
    select_size      : int   n — number of tested elements.

    Returns
    -------
    dict with keys:
      * ``fold_enrichment``  — (k/n) / (K/N); NaN when n or N or K is 0.
      * ``log_odds_ratio``   — natural log of the OR (Haldane–Anscombe corrected).
      * ``or_ci_low``        — lower bound of the 95 % Wald CI for the OR.
      * ``or_ci_high``       — upper bound of the 95 % Wald CI for the OR.

    When any cell of the 2×2 table is zero, 0.5 (Haldane–Anscombe continuity
    correction) is added to *all four* cells before computing the log-OR and SE.
    The 95 % CI uses z = 1.959964 (web constant).
    """
    k = float(common_in_select)
    K = float(common_in_pool)
    N = float(pool_size)
    n = float(select_size)

    if n == 0 or N == 0 or K == 0:
        fold_enrichment = float("nan")
    else:
        fold_enrichment = (k / n) / (K / N)

    a = k
    b = n - k
    c = K - k
    d = (N - n) - (K - k)
    if a == 0 or b == 0 or c == 0 or d == 0:
        a += 0.5
        b += 0.5
        c += 0.5
        d += 0.5
    log_or = math.log((a * d) / (b * c))
    se = math.sqrt(1 / a + 1 / b + 1 / c + 1 / d)
    z = 1.959964
    or_ci_low = math.exp(log_or - z * se)
    or_ci_high = math.exp(log_or + z * se)
    return {
        "fold_enrichment": fold_enrichment,
        "log_odds_ratio": log_or,
        "or_ci_low": or_ci_low,
        "or_ci_high": or_ci_high,
    }


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
