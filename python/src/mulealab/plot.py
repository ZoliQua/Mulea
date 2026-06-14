"""Plots for enrichment results — port of the mulea R package's ``plot_*`` functions.

These mirror ``R/Plotting.R``: a barplot and a lollipop of the per-term significance, a
term-by-element heatmap, and a term-term network whose edges are shared elements.  They all
consume the long ("relaxed") table from :func:`mulealab.reshape.reshape_results` and use the
same ``#ff6361`` → ``grey90`` colour ramp over ``[0, p_value_max_threshold]`` as the R plots.

Plotting needs ``matplotlib`` (and ``networkx`` for :func:`plot_graph`), which are optional
extras — install with ``pip install "mulealab[plot]"``.  They are imported lazily so the core
library stays dependency-light; a missing extra raises a clear :class:`ImportError`.

Each function returns the ``matplotlib`` ``Axes`` it drew on, so callers can further customise
or save it (``ax.figure.savefig(...)``).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import pandas as pd

if TYPE_CHECKING:  # pragma: no cover - typing only
    from matplotlib.axes import Axes

_GREY90 = "#e5e5e5"  # R grey90
_SIG = "#ff6361"  # R mid colour (most significant end)


def _require(module: str, extra: str = "plot") -> Any:
    try:
        return __import__(module, fromlist=["_"])
    except ImportError as exc:  # pragma: no cover - exercised only without the extra
        raise ImportError(
            f"{module} is required for plotting. Install the optional extra with "
            f'`pip install "mulealab[{extra}]"`.'
        ) from exc


def _cmap_norm(p_value_max_threshold: float) -> tuple[Any, Any]:
    """Diverging ``#ff6361`` (significant, value 0) → ``grey90`` (value = threshold) ramp."""
    mcolors = _require("matplotlib.colors")
    cmap = mcolors.LinearSegmentedColormap.from_list("mulea", [_SIG, _GREY90])
    norm = mcolors.Normalize(vmin=0.0, vmax=p_value_max_threshold)
    return cmap, norm


def _filter_for_plotting(
    reshaped_results: pd.DataFrame, p_value_type_colname: str, p_value_max_threshold: float
) -> pd.DataFrame:
    """Drop NA significance and keep rows at or below the threshold (R filterRelaxedResults...)."""
    if p_value_type_colname not in reshaped_results.columns:
        raise ValueError(
            f"p_value_type_colname '{p_value_type_colname}' is not a column "
            f"(available: {list(reshaped_results.columns)})"
        )
    df = reshaped_results.dropna(subset=[p_value_type_colname])
    return df[df[p_value_type_colname] <= p_value_max_threshold]


def _new_ax(ax: Axes | None) -> Axes:
    if ax is not None:
        return ax
    plt = _require("matplotlib.pyplot")
    _, new_ax = plt.subplots()
    return new_ax


def plot_barplot(
    reshaped_results: pd.DataFrame,
    *,
    ontology_id_colname: str = "ontology_id",
    p_value_type_colname: str = "eFDR",
    p_value_max_threshold: float = 0.05,
    ax: Axes | None = None,
) -> Axes:
    """Horizontal barplot of per-term significance (most significant term on top)."""
    df = _filter_for_plotting(reshaped_results, p_value_type_colname, p_value_max_threshold)
    terms = (
        df[[ontology_id_colname, p_value_type_colname]]
        .drop_duplicates()
        .sort_values(p_value_type_colname, ascending=False)
        .reset_index(drop=True)
    )
    ax = _new_ax(ax)
    cmap, norm = _cmap_norm(p_value_max_threshold)
    values = terms[p_value_type_colname].to_numpy(dtype=float)
    ax.barh(terms[ontology_id_colname], values, color=cmap(norm(values)))
    ax.set_xlabel(p_value_type_colname)
    _add_colorbar(ax, cmap, norm, p_value_type_colname)
    return ax


def plot_lollipop(
    reshaped_results: pd.DataFrame,
    *,
    ontology_id_colname: str = "ontology_id",
    p_value_type_colname: str = "eFDR",
    p_value_max_threshold: float = 0.05,
    ax: Axes | None = None,
) -> Axes:
    """Lollipop plot of per-term significance (stem from 0 to the value, dot at the value)."""
    df = _filter_for_plotting(reshaped_results, p_value_type_colname, p_value_max_threshold)
    terms = (
        df[[ontology_id_colname, p_value_type_colname]]
        .drop_duplicates()
        .sort_values(p_value_type_colname, ascending=False)
        .reset_index(drop=True)
    )
    ax = _new_ax(ax)
    cmap, norm = _cmap_norm(p_value_max_threshold)
    values = terms[p_value_type_colname].to_numpy(dtype=float)
    labels = terms[ontology_id_colname].tolist()
    ax.hlines(y=labels, xmin=0, xmax=values, color="black", linewidth=1)
    ax.scatter(values, labels, c=cmap(norm(values)), s=60, zorder=3)
    ax.set_xlabel(p_value_type_colname)
    _add_colorbar(ax, cmap, norm, p_value_type_colname)
    return ax


def plot_heatmap(
    reshaped_results: pd.DataFrame,
    *,
    ontology_id_colname: str = "ontology_id",
    ontology_element_colname: str = "element_id_in_ontology",
    p_value_type_colname: str = "eFDR",
    p_value_max_threshold: float = 0.05,
    ax: Axes | None = None,
) -> Axes:
    """Term-by-element heatmap coloured by significance."""
    df = _filter_for_plotting(reshaped_results, p_value_type_colname, p_value_max_threshold)
    if ontology_element_colname not in df.columns:
        raise ValueError(
            f"ontology_element_colname '{ontology_element_colname}' is not a column "
            f"(available: {list(df.columns)})"
        )
    # order terms by significance so the most significant row is at the top
    order = (
        df[[ontology_id_colname, p_value_type_colname]]
        .drop_duplicates()
        .sort_values(p_value_type_colname, ascending=True)[ontology_id_colname]
        .tolist()
    )
    grid = df.pivot_table(
        index=ontology_id_colname,
        columns=ontology_element_colname,
        values=p_value_type_colname,
        aggfunc="min",
    ).reindex(order)

    ax = _new_ax(ax)
    cmap, norm = _cmap_norm(p_value_max_threshold)
    im = ax.imshow(grid.to_numpy(dtype=float), cmap=cmap, norm=norm, aspect="auto")
    ax.set_xticks(range(grid.shape[1]))
    ax.set_xticklabels(grid.columns, rotation=90)
    ax.set_yticks(range(grid.shape[0]))
    ax.set_yticklabels(grid.index)
    ax.figure.colorbar(im, ax=ax, label=p_value_type_colname)
    return ax


def plot_graph(
    reshaped_results: pd.DataFrame,
    *,
    ontology_id_colname: str = "ontology_id",
    ontology_element_colname: str = "element_id_in_ontology",
    shared_elements_min_threshold: int = 0,
    p_value_type_colname: str = "eFDR",
    p_value_max_threshold: float = 0.05,
    ax: Axes | None = None,
) -> Axes:
    """Term-term network: an edge joins two terms that share elements, weighted by the count.

    Nodes are ontology terms passing the significance threshold, coloured by their significance.
    An edge is drawn between two terms when they share more than
    ``shared_elements_min_threshold`` elements (default 0, i.e. any shared element).
    """
    nx = _require("networkx")
    df = _filter_for_plotting(reshaped_results, p_value_type_colname, p_value_max_threshold)
    if ontology_element_colname not in df.columns:
        raise ValueError(
            f"ontology_element_colname '{ontology_element_colname}' is not a column "
            f"(available: {list(df.columns)})"
        )

    elements_by_term: dict[str, set[str]] = {
        str(term): set(sub[ontology_element_colname])
        for term, sub in df.groupby(ontology_id_colname)
    }
    pstat_by_term: dict[str, float] = {
        str(term): float(value)
        for term, value in df.groupby(ontology_id_colname)[p_value_type_colname].min().items()
    }
    terms = list(elements_by_term)

    graph = nx.Graph()
    for term in terms:
        graph.add_node(term, p_stat=pstat_by_term[term])
    for i in range(len(terms) - 1):
        for j in range(i + 1, len(terms)):
            shared = len(elements_by_term[terms[i]] & elements_by_term[terms[j]])
            if shared > shared_elements_min_threshold:
                graph.add_edge(terms[i], terms[j], weight=shared)

    ax = _new_ax(ax)
    cmap, norm = _cmap_norm(p_value_max_threshold)
    pos = nx.spring_layout(graph, seed=42)
    node_colors = [cmap(norm(pstat_by_term[t])) for t in graph.nodes]
    edge_weights = [graph[u][v]["weight"] for u, v in graph.edges]
    nx.draw_networkx_edges(graph, pos, ax=ax, width=edge_weights, alpha=0.5)
    nx.draw_networkx_nodes(graph, pos, ax=ax, node_color=node_colors, node_size=300)
    nx.draw_networkx_labels(graph, pos, ax=ax, font_size=8)
    ax.set_axis_off()
    _add_colorbar(ax, cmap, norm, p_value_type_colname)
    return ax


def _add_colorbar(ax: Axes, cmap: Any, norm: Any, label: str) -> None:
    cm = _require("matplotlib.cm")
    sm = cm.ScalarMappable(cmap=cmap, norm=norm)
    sm.set_array([])
    ax.figure.colorbar(sm, ax=ax, label=label)


__all__ = ["plot_barplot", "plot_lollipop", "plot_heatmap", "plot_graph"]
