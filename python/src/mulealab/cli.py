from __future__ import annotations

from pathlib import Path

import typer

from mulealab.io import read_gmt
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
