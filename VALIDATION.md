# External validation (vs clusterProfiler)

[PARITY.md](PARITY.md) shows the three mulea legs (R / Python / Web) agree with each other. This
document goes further: it validates muleaLab's **overrepresentation core** against an *independent,
published* tool — [`clusterProfiler::enricher`](https://bioconductor.org/packages/clusterProfiler/)
(Bioconductor 4.20.0) — on the same E. coli RegulonDB inputs, so the agreement is not merely
"we match ourselves".

## What is validated

clusterProfiler computes the **same hypergeometric ORA + Benjamini–Hochberg** that muleaLab does, so
this is an apples-to-apples check of the p-value and BH machinery. clusterProfiler has **no eFDR**, so
the eFDR is *not* covered here — it is covered by the R gold-standard fixture in PARITY.md. We do not
overclaim: this validates the ORA core, not the eFDR.

## The one convention that must be matched: the universe

clusterProfiler restricts the test to the **annotated universe** — only genes that occur in at least
one ontology term. On this dataset it reports `BgRatio = M/1326` and `GeneRatio = k/81`, i.e. it uses

- `N = 1326` = |background ∩ ⋃ term genes|   (not the full 7381-gene background), and
- `n = 81`  = |target ∩ ⋃ term genes|        (not all 241 target genes).

muleaLab (like mulea R) uses the **full supplied background** by default. Neither is wrong — it is a
documented choice about whether unannotated genes count toward the universe. To compare the
*statistics* rather than this convention, we run muleaLab on the same annotated universe
(`background ∩ ⋃ term genes`). With the universe matched, the hypergeometric test is identical.

## Result

On the 153 terms clusterProfiler tests (it drops 0-background-overlap terms such as `DhaR`, which
muleaLab keeps at p = 1):

| Quantity | Agreement (max relative difference) |
|---|---|
| hypergeometric `p_value` | **≈ 2.5 × 10⁻¹³** (floating-point identical) |
| BH-adjusted p-value (recomputed over the shared tested set) | floating-point identical |

muleaLab's ORA core reproduces an independent, widely-used tool to machine precision once the
universe convention is matched.

## Reproduce

```bash
# 1. regenerate the reference (needs R + clusterProfiler)
Rscript python/tests/fixtures/generate_clusterprofiler_reference.R

# 2. parity tests (both legs, checksum-guarded fixture)
cd web && npx vitest run tests/clusterProfiler.test.ts
cd python && pytest tests/test_parity_clusterprofiler.py
```

Fixture: `python/tests/fixtures/clusterprofiler_reference.csv`
(SHA-256 `54b181e4d6aba87c9d60ce0d5cd9878057ebd2406a9518d7331b37882b6fecd7`, guarded in the web test).
