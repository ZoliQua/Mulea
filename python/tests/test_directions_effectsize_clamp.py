"""Tests for the three new features ported from the web leg (TypeScript):

1. Two-tailed / depletion direction  — hypergeometric_pvalue(..., direction)
   Validated against the R-generated golden fixture
   python/tests/fixtures/hypergeom_directions_reference.csv
   (columns k, m, N, n, over, under, two_sided).

2. Effect size  — effect_size() and ora() output columns
   fold_enrichment, log_odds_ratio, or_ci_low, or_ci_high.
   Hand-checked values matching web/tests/oraDirections.test.ts.

3. Optional eFDR clamp  — set_based_enrichment_test(clamp=False)
   Mirrors the synthetic dense-ontology case from web/tests/efdrClamp.test.ts:
   clamp=True ≤ 1 everywhere; clamp=False leaves at least one term > 1.
"""

from __future__ import annotations

import math
import pathlib

import numpy as np
import pandas as pd
import pytest

from mulea import effect_size, hypergeometric_pvalue, ora
from mulea.efdr import set_based_enrichment_test

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
FIXTURE_DIR = pathlib.Path(__file__).parent / "fixtures"


def _load_directions_fixture() -> list[dict]:
    """Load hypergeom_directions_reference.csv produced by R."""
    rows = []
    with open(FIXTURE_DIR / "hypergeom_directions_reference.csv") as fh:
        header = [h.strip('"') for h in next(fh).strip().split(",")]
        for line in fh:
            cells = [float(v) for v in line.strip().split(",")]
            rows.append(dict(zip(header, cells)))
    return rows


def _make_gmt(n_genes_in_term: int = 5, n_terms: int = 1) -> pd.DataFrame:
    """Simple GMT: n_terms terms each with n_genes_in_term genes starting at g1."""
    return pd.DataFrame(
        {
            "ontology_id": [f"T{i}" for i in range(n_terms)],
            "ontology_name": [f"Term {i}" for i in range(n_terms)],
            "list_of_values": [
                [f"g{j + i * n_genes_in_term + 1}" for j in range(n_genes_in_term)]
                for i in range(n_terms)
            ],
        }
    )


# ---------------------------------------------------------------------------
# Feature 1: Direction — validate against R fixture (tolerance ≤ 1e-9)
# ---------------------------------------------------------------------------
class TestHypergeometricDirection:
    """Validate all three directions against the R golden fixture."""

    fixture = _load_directions_fixture()

    def test_fixture_loaded_6_rows(self) -> None:
        assert len(self.fixture) == 6

    @pytest.mark.parametrize("row", _load_directions_fixture())
    def test_over_matches_r(self, row: dict) -> None:
        k, m, N, n = int(row["k"]), int(row["m"]), int(row["N"]), int(row["n"])
        got = hypergeometric_pvalue(k, m, N, n, "over")
        assert got == pytest.approx(row["over"], abs=1e-9), (
            f"over mismatch at (k={k}, m={m}, N={N}, n={n}): {got} vs {row['over']}"
        )

    @pytest.mark.parametrize("row", _load_directions_fixture())
    def test_under_matches_r(self, row: dict) -> None:
        k, m, N, n = int(row["k"]), int(row["m"]), int(row["N"]), int(row["n"])
        got = hypergeometric_pvalue(k, m, N, n, "under")
        assert got == pytest.approx(row["under"], abs=1e-9), (
            f"under mismatch at (k={k}, m={m}, N={N}, n={n}): {got} vs {row['under']}"
        )

    @pytest.mark.parametrize("row", _load_directions_fixture())
    def test_two_sided_matches_r(self, row: dict) -> None:
        k, m, N, n = int(row["k"]), int(row["m"]), int(row["N"]), int(row["n"])
        got = hypergeometric_pvalue(k, m, N, n, "two-sided")
        assert got == pytest.approx(row["two_sided"], abs=1e-9), (
            f"two-sided mismatch at (k={k}, m={m}, N={N}, n={n}): {got} vs {row['two_sided']}"
        )

    def test_default_direction_is_over_and_bit_identical(self) -> None:
        """Default (no direction arg) must equal explicit 'over' for every fixture row."""
        for row in self.fixture:
            k, m, N, n = int(row["k"]), int(row["m"]), int(row["N"]), int(row["n"])
            assert hypergeometric_pvalue(k, m, N, n) == hypergeometric_pvalue(k, m, N, n, "over"), (
                f"default vs 'over' differ at (k={k}, m={m}, N={N}, n={n})"
            )

    def test_all_directions_in_unit_interval(self) -> None:
        for row in self.fixture:
            k, m, N, n = int(row["k"]), int(row["m"]), int(row["N"]), int(row["n"])
            for d in ("over", "under", "two-sided"):
                p = hypergeometric_pvalue(k, m, N, n, d)  # type: ignore[arg-type]
                assert 0.0 <= p <= 1.0, f"p={p} out of [0,1] for direction={d!r}"

    def test_unknown_direction_raises(self) -> None:
        with pytest.raises(Exception):
            hypergeometric_pvalue(2, 5, 20, 5, "bogus")  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# Feature 1 (ora thread): ora() respects direction and adds the column
# ---------------------------------------------------------------------------
class TestOraDirection:
    """Mirror web/tests/oraDirections.test.ts — ora threads direction through."""

    # T1 has g1..g5 (5 genes); background g1..g20 (20), target = g1..g4 + g6 (5 tested, 4 in T1).
    gmt = pd.DataFrame(
        {
            "ontology_id": ["T1"],
            "ontology_name": ["t1"],
            "list_of_values": [["g1", "g2", "g3", "g4", "g5"]],
        }
    )
    background = [f"g{i}" for i in range(1, 21)]
    target = ["g1", "g2", "g3", "g4", "g6"]

    def test_default_direction_is_over(self) -> None:
        row = ora(self.gmt, self.target, self.background).iloc[0]
        assert row["direction"] == "over"
        assert row["p_value"] == pytest.approx(
            hypergeometric_pvalue(4, 5, 20, 5, "over"), rel=1e-12
        )

    def test_under_direction(self) -> None:
        row = ora(self.gmt, self.target, self.background, direction="under").iloc[0]
        assert row["direction"] == "under"
        assert row["p_value"] == pytest.approx(
            hypergeometric_pvalue(4, 5, 20, 5, "under"), rel=1e-12
        )

    def test_two_sided_direction(self) -> None:
        row = ora(self.gmt, self.target, self.background, direction="two-sided").iloc[0]
        assert row["direction"] == "two-sided"
        assert row["p_value"] == pytest.approx(
            hypergeometric_pvalue(4, 5, 20, 5, "two-sided"), rel=1e-12
        )

    def test_ora_new_columns_present(self) -> None:
        res = ora(self.gmt, self.target, self.background)
        for col in ("direction", "fold_enrichment", "log_odds_ratio", "or_ci_low", "or_ci_high"):
            assert col in res.columns, f"Missing column: {col}"


# ---------------------------------------------------------------------------
# Feature 2: Effect size — hand-checked values from web/tests/oraDirections.test.ts
# ---------------------------------------------------------------------------
class TestEffectSize:
    """Verify effect_size() against hand-checked values (web test suite)."""

    def test_no_zero_cell_table(self) -> None:
        # k=4, n=5, K=5, N=20 → a=4,b=1,c=1,d=11 (no Haldane correction)
        # R: fold_enrichment=3.2, log_odds_ratio≈4.025352, CI lower≈2.826685, CI upper≈1109.427
        es = effect_size(4, 5, 20, 5)
        assert es["fold_enrichment"] == pytest.approx(3.2, rel=1e-9)
        assert es["log_odds_ratio"] == pytest.approx(4.025352, rel=1e-6)
        assert es["or_ci_low"] == pytest.approx(2.826685, rel=1e-4)
        assert es["or_ci_high"] == pytest.approx(1109.427, rel=1e-3)

    def test_haldane_correction_zero_cell(self) -> None:
        # k=0 → a=0 triggers +0.5 correction. With K=5, N=10, n=4:
        # a=0.5, b=4.5, c=5.5, d=1.5 → log_OR = log((0.5*1.5)/(4.5*5.5))
        es = effect_size(0, 5, 10, 4)
        expected_log_or = math.log((0.5 * 1.5) / (4.5 * 5.5))
        assert math.isfinite(es["log_odds_ratio"])
        assert es["log_odds_ratio"] == pytest.approx(expected_log_or, rel=1e-12)
        assert es["fold_enrichment"] == pytest.approx(0.0, abs=1e-15)  # k=0 → 0 overlap
        assert es["or_ci_low"] < es["or_ci_high"]

    def test_nan_fold_enrichment_when_empty_pool(self) -> None:
        es = effect_size(0, 0, 0, 0)
        assert math.isnan(es["fold_enrichment"])

    def test_ora_effect_size_columns_match_standalone(self) -> None:
        """ora() effect-size columns must equal standalone effect_size() calls."""
        gmt = pd.DataFrame(
            {
                "ontology_id": ["T1"],
                "ontology_name": ["t1"],
                "list_of_values": [["g1", "g2", "g3", "g4", "g5"]],
            }
        )
        background = [f"g{i}" for i in range(1, 21)]
        target = ["g1", "g2", "g3", "g4", "g6"]
        row = ora(gmt, target, background).iloc[0]
        expected = effect_size(4, 5, 20, 5)  # k=4,K=5,N=20,n=5
        assert row["fold_enrichment"] == pytest.approx(expected["fold_enrichment"], rel=1e-12)
        assert row["log_odds_ratio"] == pytest.approx(expected["log_odds_ratio"], rel=1e-12)
        assert row["or_ci_low"] == pytest.approx(expected["or_ci_low"], rel=1e-12)
        assert row["or_ci_high"] == pytest.approx(expected["or_ci_high"], rel=1e-12)


# ---------------------------------------------------------------------------
# Feature 3: Optional eFDR clamp — mirrors web/tests/efdrClamp.test.ts
# ---------------------------------------------------------------------------
# Small synthetic ontology where the raw r_exp/r_obs ratio exceeds 1: many overlapping
# 4-gene terms over a 12-gene background with a 3-gene target.
# Identical construction to the web TS test (denseBackground / denseGmt / denseTarget).
_DENSE_BACKGROUND = [f"g{i}" for i in range(12)]
_DENSE_GMT = pd.DataFrame(
    {
        "ontology_id": [f"T{i}" for i in range(8)],
        "ontology_name": [f"T{i}" for i in range(8)],
        "list_of_values": [_DENSE_BACKGROUND[i : i + 4] for i in range(8)],
    }
)
_DENSE_TARGET = ["g0", "g1", "g2"]


class TestEfdrClamp:
    """Validate the clamp parameter on set_based_enrichment_test and ora (eFDR path)."""

    def test_default_clamp_equals_explicit_clamp_true(self) -> None:
        default_ = set_based_enrichment_test(
            _DENSE_GMT, _DENSE_TARGET, _DENSE_BACKGROUND
        )
        explicit = set_based_enrichment_test(
            _DENSE_GMT, _DENSE_TARGET, _DENSE_BACKGROUND, clamp=True
        )
        assert list(default_["eFDR"]) == list(explicit["eFDR"])

    def test_clamp_true_all_efdr_le_one(self) -> None:
        res = set_based_enrichment_test(
            _DENSE_GMT, _DENSE_TARGET, _DENSE_BACKGROUND, clamp=True
        )
        assert len(res) > 0
        assert (res["eFDR"] <= 1.0).all(), f"max eFDR (clamped) = {res['eFDR'].max()}"
        assert (res["eFDR"] >= 0.0).all()

    def test_clamp_false_leaves_at_least_one_term_above_one(self) -> None:
        """The un-capped ratio must exceed 1 on the synthetic dense case."""
        raw = set_based_enrichment_test(
            _DENSE_GMT, _DENSE_TARGET, _DENSE_BACKGROUND, clamp=False
        )
        above = raw[raw["eFDR"] > 1.0]
        assert len(above) > 0, (
            "Expected at least one term with eFDR > 1 when clamp=False, "
            f"but max was {raw['eFDR'].max()}"
        )

    def test_clamp_false_max_efdr_exceeds_one(self) -> None:
        raw = set_based_enrichment_test(
            _DENSE_GMT, _DENSE_TARGET, _DENSE_BACKGROUND, clamp=False
        )
        assert raw["eFDR"].max() > 1.0

    def test_clamp_true_equals_min_of_raw_and_one(self) -> None:
        """Every clamped value equals min(raw, 1), matching the web TS assertion."""
        raw = set_based_enrichment_test(
            _DENSE_GMT, _DENSE_TARGET, _DENSE_BACKGROUND, clamp=False
        )
        clamped = set_based_enrichment_test(
            _DENSE_GMT, _DENSE_TARGET, _DENSE_BACKGROUND, clamp=True
        )
        np.testing.assert_allclose(
            clamped["eFDR"].to_numpy(),
            np.minimum(raw["eFDR"].to_numpy(), 1.0),
            rtol=1e-15,
            err_msg="clamped eFDR must equal min(raw, 1) element-wise",
        )

    def test_below_cap_clamp_and_raw_agree(self) -> None:
        """Where raw eFDR ≤ 1 the two modes must be identical."""
        raw = set_based_enrichment_test(
            _DENSE_GMT, _DENSE_TARGET, _DENSE_BACKGROUND, clamp=False
        )
        clamped = set_based_enrichment_test(
            _DENSE_GMT, _DENSE_TARGET, _DENSE_BACKGROUND, clamp=True
        )
        mask = raw["eFDR"].to_numpy() <= 1.0
        np.testing.assert_array_equal(
            raw["eFDR"].to_numpy()[mask],
            clamped["eFDR"].to_numpy()[mask],
        )

    def test_ora_efdr_path_threads_clamp(self) -> None:
        """ora(method='eFDR', clamp=False) must also leave terms > 1 on the dense case."""
        raw = ora(
            _DENSE_GMT, _DENSE_TARGET, _DENSE_BACKGROUND,
            p_value_adjustment_method="eFDR",
            clamp=False,
        )
        assert raw["eFDR"].max() > 1.0

    def test_ora_efdr_clamp_true_all_le_one(self) -> None:
        res = ora(
            _DENSE_GMT, _DENSE_TARGET, _DENSE_BACKGROUND,
            p_value_adjustment_method="eFDR",
            clamp=True,
        )
        assert (res["eFDR"] <= 1.0).all()
