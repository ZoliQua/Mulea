from __future__ import annotations

from typing import Mapping, Sequence

import pandas as pd

from mulea.errors import GmtParseError

GMT_COLUMNS = ["ontology_id", "ontology_name", "list_of_values"]


def list_to_gmt(mapping: Mapping[str, Sequence[str]]) -> pd.DataFrame:
    """Build a GMT DataFrame from a ``{ontology_id: [elements]}`` mapping.

    Mirrors ``list_to_gmt`` from the mulea R package (``R/Utils.R``): each key becomes an
    ``ontology_id`` and its values the ``list_of_values``.  Unlike the R version — which fills
    ``ontology_name`` with a random 5-character string — this sets ``ontology_name`` to the key,
    so the result is deterministic and reproducible.
    """
    rows = [
        {"ontology_id": str(key), "ontology_name": str(key), "list_of_values": list(values)}
        for key, values in mapping.items()
    ]
    return pd.DataFrame(rows, columns=GMT_COLUMNS)


def read_gmt(path: str) -> pd.DataFrame:
    """Read a GMT file into a DataFrame [ontology_id, ontology_name, list_of_values].

    Lines starting with '#' and blank lines are skipped. Genes are the
    tab-separated fields from column 3 onward (empty trailing fields dropped).
    """
    rows: list[dict] = []
    with open(path, encoding="utf-8") as fh:
        for lineno, raw in enumerate(fh, start=1):
            line = raw.rstrip("\n").rstrip("\r")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            fields = line.split("\t")
            if len(fields) < 2:
                raise GmtParseError(f"{path}:{lineno}: fewer than 2 tab-separated fields")
            genes = [g for g in fields[2:] if g != ""]
            rows.append(
                {"ontology_id": fields[0], "ontology_name": fields[1], "list_of_values": genes}
            )
    return pd.DataFrame(rows, columns=GMT_COLUMNS)


def write_gmt(gmt: pd.DataFrame, path: str) -> None:
    """Write a GMT DataFrame back to a tab-delimited GMT file."""
    with open(path, "w", encoding="utf-8") as fh:
        for _, row in gmt.iterrows():
            fields = [str(row["ontology_id"]), str(row["ontology_name"]), *row["list_of_values"]]
            fh.write("\t".join(fields) + "\n")
