"""mulea — headless multi-ontology enrichment analysis (Python companion)."""
from mulea.efdr import set_based_enrichment_test
from mulea.gsea import gsea
from mulea.io import list_to_gmt, read_gmt, write_gmt
from mulea.model import GseaModel, OraModel, run_test
from mulea.ontology import filter_ontology
from mulea.ora import ora
from mulea.plot import plot_barplot, plot_graph, plot_heatmap, plot_lollipop
from mulea.reshape import reshape_results
from mulea.statistics import HypergeometricDirection, effect_size, hypergeometric_pvalue, p_adjust
from mulea.version import __version__

__all__ = [
    "__version__",
    "read_gmt",
    "write_gmt",
    "list_to_gmt",
    "filter_ontology",
    "ora",
    "set_based_enrichment_test",
    "gsea",
    "OraModel",
    "GseaModel",
    "run_test",
    "reshape_results",
    "plot_barplot",
    "plot_lollipop",
    "plot_heatmap",
    "plot_graph",
    "hypergeometric_pvalue",
    "HypergeometricDirection",
    "effect_size",
    "p_adjust",
]
