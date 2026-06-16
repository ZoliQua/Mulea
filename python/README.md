# mulea (Python companion)

Headless multi-ontology enrichment analysis — the Python companion to the mulea web tool
and the [mulea](https://github.com/ELTEbioinformatics/mulea) R package
([Turek et al., *BMC Bioinformatics* 2024, 25:334](https://cran.r-project.org/package=mulea)).

`mulea` runs set-based **overrepresentation analysis (ORA)** and ranked-list **GSEA** over any
GMT ontology, with both the resampling **empirical FDR (eFDR)** of the R package and a
deterministic closed-form eFDR. Its numeric core is kept in validated parity with the R reference
(see `PARITY.md` in the repository).

## Install

```bash
pip install mulea            # core (pandas, numpy, scipy, typer)
pip install "mulea[plot]"    # + matplotlib / networkx for the plots
```

## Quick start

Two equivalent APIs: direct functions, or the R-style *model → `run_test`* objects.

```python
import mulea as ml

gmt = ml.read_gmt("ontology.gmt")
gmt = ml.filter_ontology(gmt, min_nr_of_elements=3, max_nr_of_elements=400)

# --- functional API ---
res = ml.ora(gmt, target_genes, background_genes, p_value_adjustment_method="eFDR")

# --- model API (mirrors the mulea R package) ---
model = ml.OraModel(
    gmt=gmt,
    element_names=target_genes,
    background_element_names=background_genes,
    p_value_adjustment_method="eFDR",
)
res = ml.run_test(model)            # == model.run_test()
```

Ranked-list GSEA:

```python
model = ml.GseaModel(gmt=gmt, element_names=genes, element_scores=logfc)
gsea_res = ml.run_test(model)
```

## Plots

Reshape the results into long form, then plot (needs the `[plot]` extra):

```python
long = ml.reshape_results(model, res, p_value_type_colname="eFDR")
ax = ml.plot_barplot(long, p_value_type_colname="eFDR")     # also: plot_lollipop, plot_heatmap, plot_graph
ax.figure.savefig("enrichment.png", bbox_inches="tight")
```

## Command line

```bash
mulea ora ontology.gmt target.txt background.txt --method BH
mulea gsea ontology.gmt ranked.tsv
```

## Parity with the R package

The numeric core (GMT I/O, hypergeometric ORA, BH/Bonferroni, eFDR, GSEA ES/leading-edge) is
validated against the R reference and against clusterProfiler and fgsea. The model layer
(`OraModel` / `GseaModel` / `run_test`), `reshape_results`, `list_to_gmt` and the `plot_*`
functions mirror the R API; the plots use matplotlib/networkx rather than ggplot2, so they are
visually similar but not pixel-identical. License: GPL-2.0-only.
