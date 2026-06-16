"""Model objects mirroring the mulea R package's S4 ``ora`` / ``gsea`` + ``run_test`` API.

The R package builds an enrichment *model* (an S4 object holding the inputs and parameters)
and then executes it with the generic ``run_test(model)``.  These dataclasses are the
Pythonic equivalent: construct a model, then call ``model.run_test()`` or the free function
``run_test(model)``.  They wrap the existing functional :func:`mulea.ora.ora` /
:func:`mulea.gsea.gsea` entry points, so the numbers are identical — the model layer adds
no new statistics, only the R-style call shape and the ``.gmt`` / ``.element_names`` slots that
:func:`mulea.reshape.reshape_results` needs for plotting.

The R ``ora`` slot ``nthreads`` has no Python counterpart (the NumPy/SciPy core is single
process); it is intentionally omitted.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import pandas as pd

from mulea.gsea import ScoreType, gsea
from mulea.ora import ora
from mulea.statistics import HypergeometricDirection


@dataclass
class OraModel:
    """Over-representation analysis model (mirrors the R S4 ``ora`` class).

    Construct with the ontology, target and background, then run with
    :meth:`run_test` (or ``run_test(model)``).  Parameters match
    :func:`mulea.ora.ora`; ``direction`` / ``efdr_mode`` / ``clamp`` are the
    web/Python extensions over the R base API and have sensible parity defaults.
    """

    gmt: pd.DataFrame
    element_names: Sequence[str]
    background_element_names: Sequence[str]
    p_value_adjustment_method: str = "eFDR"
    number_of_permutations: int = 10000
    random_seed: int = 0
    direction: HypergeometricDirection = "over"
    efdr_mode: str = "exact"
    clamp: bool = True

    def run_test(self) -> pd.DataFrame:
        """Run the over-representation analysis and return the results DataFrame."""
        return ora(
            self.gmt,
            self.element_names,
            self.background_element_names,
            p_value_adjustment_method=self.p_value_adjustment_method,
            direction=self.direction,
            efdr_mode=self.efdr_mode,
            number_of_permutations=self.number_of_permutations,
            random_seed=self.random_seed,
            clamp=self.clamp,
        )


@dataclass
class GseaModel:
    """Ranked-list GSEA model (mirrors the R S4 ``gsea`` class).

    Like the R model, this takes ``element_names`` and a parallel ``element_scores``
    vector (rather than a pre-built ranked DataFrame); :meth:`run_test` assembles the
    ranked frame and calls :func:`mulea.gsea.gsea`.  ``gsea_power`` maps to fgsea's
    ``gseaParam`` and ``element_score_type`` to fgsea's ``scoreType``.
    """

    gmt: pd.DataFrame
    element_names: Sequence[str]
    element_scores: Sequence[float]
    gsea_power: float = 1.0
    element_score_type: ScoreType = "std"
    number_of_permutations: int = 1000
    random_seed: int = 42

    def __post_init__(self) -> None:
        if len(self.element_names) != len(self.element_scores):
            raise ValueError(
                "element_names and element_scores must have the same length "
                f"({len(self.element_names)} != {len(self.element_scores)})"
            )

    def run_test(self) -> pd.DataFrame:
        """Run GSEA and return the results DataFrame."""
        ranked = pd.DataFrame(
            {"element_name": list(self.element_names), "element_score": list(self.element_scores)}
        )
        return gsea(
            self.gmt,
            ranked,
            permutations=self.number_of_permutations,
            seed=self.random_seed,
            gsea_param=self.gsea_power,
            score_type=self.element_score_type,
        )


# A mulea model is one of the concrete model dataclasses above.
Model = OraModel | GseaModel


def run_test(model: Model) -> pd.DataFrame:
    """Run an enrichment ``model`` and return its results (mirrors R ``run_test``).

    Dispatches on the model type, exactly like the R S4 generic dispatches on the
    object's class.  ``run_test(model)`` is equivalent to ``model.run_test()``.
    """
    if isinstance(model, (OraModel, GseaModel)):
        return model.run_test()
    raise TypeError(f"run_test() expects an OraModel or GseaModel, got {type(model).__name__}")


__all__ = ["OraModel", "GseaModel", "Model", "run_test"]
