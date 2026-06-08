from __future__ import annotations

from pathlib import Path

import pandas as pd
import typer

from mulealab.gsea import gsea as run_gsea
from mulealab.io import read_gmt
from mulealab.ontology import filter_ontology
from mulealab.ora import ora as run_ora

app = typer.Typer(help="muleaLab — multi-ontology enrichment analysis.")


@app.callback(invoke_without_command=True)
def callback() -> None:
    """Callback to ensure app is treated as a group."""
    pass


def _read_lines(path: str) -> list[str]:
    return [ln.strip() for ln in Path(path).read_text(encoding="utf-8").splitlines() if ln.strip()]


@app.command()
def ora(  # noqa: A001 - command name intentionally mirrors the R function
    gmt_path: str = typer.Argument(..., help="Path to the ontology GMT file."),
    target_path: str = typer.Argument(..., help="File with one target element per line."),
    background_path: str = typer.Argument(..., help="File with one background element per line."),
    method: str = typer.Option("BH", help="p-value adjustment: 'BH' or 'bonferroni'."),
) -> None:
    """Run deterministic overrepresentation analysis and print the result table."""
    gmt = read_gmt(gmt_path)
    result = run_ora(
        gmt,
        element_names=_read_lines(target_path),
        background_element_names=_read_lines(background_path),
        p_value_adjustment_method=method,
    )
    typer.echo(result.to_csv(index=False))


@app.command()
def gsea(  # noqa: A001 - command name mirrors the R function
    gmt_path: str = typer.Argument(..., help="Path to the ontology GMT file."),
    ranked_path: str = typer.Argument(..., help="TSV with two columns: gene, score (e.g. logFC)."),
    permutations: int = typer.Option(1000, help="Number of gene permutations for NES/p."),
    seed: int = typer.Option(42, help="Random seed for the permutation null."),
    min_size: int = typer.Option(3, "--min", help="filter_ontology lower bound (exclusive)."),
    max_size: int = typer.Option(400, "--max", help="filter_ontology upper bound (exclusive)."),
) -> None:
    """Run ranked-list GSEA (weighted-KS ES + permutation NES/p) and print the result table."""
    gmt = filter_ontology(read_gmt(gmt_path), min_nr_of_elements=min_size, max_nr_of_elements=max_size)
    ranked = pd.read_csv(ranked_path, sep="\t")
    result = run_gsea(gmt, ranked, permutations=permutations, seed=seed)
    result = result.assign(leading_edge=result["leading_edge"].apply(lambda g: ",".join(g)))
    typer.echo(result.to_csv(index=False))
