import numpy as np
import pytest
from mulealab.statistics import hypergeometric_pvalue, p_adjust


def test_hypergeometric_known_case():
    assert hypergeometric_pvalue(4, 5, 10, 4) == pytest.approx(5 / 210)


def test_hypergeometric_zero_overlap_is_one():
    assert hypergeometric_pvalue(0, 5, 10, 4) == pytest.approx(1.0)


def test_hypergeometric_empty_select_is_one():
    assert hypergeometric_pvalue(0, 5, 10, 0) == pytest.approx(1.0)


def test_p_adjust_bonferroni():
    out = p_adjust([0.01, 0.02], "bonferroni")
    assert np.allclose(out, [0.02, 0.04])


def test_p_adjust_bonferroni_caps_at_one():
    out = p_adjust([0.6, 0.7], "bonferroni")
    assert np.allclose(out, [1.0, 1.0])


def test_p_adjust_bh_matches_r():
    out = p_adjust([0.005, 0.01, 0.5], "BH")
    assert np.allclose(out, [0.015, 0.015, 0.5])


def test_p_adjust_bh_preserves_input_order():
    out = p_adjust([0.5, 0.01, 0.005], "BH")
    assert np.allclose(out, [0.5, 0.015, 0.015])
