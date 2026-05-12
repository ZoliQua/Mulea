import numpy as np
from mulealab.efdr import r_obs_ranks


def test_r_obs_ranks_no_ties_ascending():
    # smallest value -> rank 1
    assert list(r_obs_ranks(np.array([0.5, 0.1, 0.9]))) == [2.0, 1.0, 3.0]


def test_r_obs_ranks_ties_take_max():
    # R rank(c(0.1,0.1,0.2), ties.method="max") == c(2,2,3)
    assert list(r_obs_ranks(np.array([0.1, 0.1, 0.2]))) == [2.0, 2.0, 3.0]


def test_r_obs_ranks_rounds_to_15_digits():
    # values differing below 1e-15 are treated as tied
    a = 0.1
    b = 0.1 + 1e-16
    assert list(r_obs_ranks(np.array([a, b, 0.2]))) == [2.0, 2.0, 3.0]
