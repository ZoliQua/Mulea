import pandas as pd
import pytest

# Plotting is an optional extra; skip the whole module if it is not installed.
pytest.importorskip("matplotlib")
import matplotlib  # noqa: E402

matplotlib.use("Agg")  # headless backend for testing

from mulealab import (  # noqa: E402
    OraModel,
    plot_barplot,
    plot_graph,
    plot_heatmap,
    plot_lollipop,
    reshape_results,
    run_test,
)


def _reshaped():
    gmt = pd.DataFrame(
        {
            "ontology_id": ["T1", "T2", "T3"],
            "ontology_name": ["term1", "term2", "term3"],
            "list_of_values": [
                ["g1", "g2", "g3", "g4", "g5"],
                ["g1", "g2", "g6", "g7", "g8"],
                ["g9", "g10", "g11", "g12", "g13"],
            ],
        }
    )
    model = OraModel(
        gmt=gmt,
        element_names=["g1", "g2", "g3", "g4", "g6", "g9", "g10"],
        background_element_names=[f"g{i}" for i in range(1, 31)],
        p_value_adjustment_method="eFDR",
    )
    res = run_test(model)
    return reshape_results(model, res, p_value_type_colname="eFDR")


def test_barplot_returns_axes():
    ax = plot_barplot(_reshaped(), p_value_type_colname="eFDR", p_value_max_threshold=1.0)
    assert ax.__class__.__name__.endswith("Axes")
    assert len(ax.patches) > 0  # at least one bar


def test_lollipop_returns_axes():
    ax = plot_lollipop(_reshaped(), p_value_type_colname="eFDR", p_value_max_threshold=1.0)
    assert ax.__class__.__name__.endswith("Axes")


def test_heatmap_returns_axes():
    ax = plot_heatmap(_reshaped(), p_value_type_colname="eFDR", p_value_max_threshold=1.0)
    assert len(ax.images) == 1


def test_graph_returns_axes():
    pytest.importorskip("networkx")
    ax = plot_graph(_reshaped(), p_value_type_colname="eFDR", p_value_max_threshold=1.0)
    assert ax.__class__.__name__.endswith("Axes")


def test_plot_rejects_unknown_pvalue_column():
    with pytest.raises(ValueError, match="not a column"):
        plot_barplot(_reshaped(), p_value_type_colname="nope")
