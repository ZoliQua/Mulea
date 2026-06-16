# External validation (vs clusterProfiler)

[PARITY.md](PARITY.md) shows the three mulea legs (R / Python / Web) agree with each other. This
document goes further: it validates mulea's **overrepresentation core** against an *independent,
published* tool — [`clusterProfiler::enricher`](https://bioconductor.org/packages/clusterProfiler/)
(Bioconductor 4.20.0) — on the same E. coli RegulonDB inputs, so the agreement is not merely
"we match ourselves".

## What is validated

clusterProfiler computes the **same hypergeometric ORA + Benjamini–Hochberg** that mulea does, so
this is an apples-to-apples check of the p-value and BH machinery. clusterProfiler has **no eFDR**, so
the eFDR is *not* covered here — it is covered by the R gold-standard fixture in PARITY.md. We do not
overclaim: this validates the ORA core, not the eFDR.

## The one convention that must be matched: the universe

clusterProfiler restricts the test to the **annotated universe** — only genes that occur in at least
one ontology term. On this dataset it reports `BgRatio = M/1326` and `GeneRatio = k/81`, i.e. it uses

- `N = 1326` = |background ∩ ⋃ term genes|   (not the full 7381-gene background), and
- `n = 81`  = |target ∩ ⋃ term genes|        (not all 241 target genes).

mulea (like mulea R) uses the **full supplied background** by default. Neither is wrong — it is a
documented choice about whether unannotated genes count toward the universe. To compare the
*statistics* rather than this convention, we run mulea on the same annotated universe
(`background ∩ ⋃ term genes`). With the universe matched, the hypergeometric test is identical.

## Result

On the 153 terms clusterProfiler tests (it drops 0-background-overlap terms such as `DhaR`, which
mulea keeps at p = 1):

| Quantity | Agreement (max relative difference) |
|---|---|
| hypergeometric `p_value` | **≈ 2.5 × 10⁻¹³** (floating-point identical) |
| BH-adjusted p-value (recomputed over the shared tested set) | floating-point identical |

mulea's ORA core reproduces an independent, widely-used tool to machine precision once the
universe convention is matched.

### External ORA parity — clusterProfiler, multi-organism (Human + Mouse)

Extends the E. coli clusterProfiler::enricher parity (Bioconductor 4.20.0, R 4.6) to **Homo sapiens**
and **Mus musculus**, showing the agreement is not organism-specific.

- **Ontologies:** TRRUST transcription-factor GMTs (GeneSymbol) from `ELTEbioinformatics/GMT_files_for_mulea` — `gmt_human.gmt`, `gmt_mouse.gmt`.
- **Inputs:** deterministic synthetic target/background, seed = 42 (`python/tests/fixtures/generate_clusterprofiler_multiorg.R`): background = union of genes in size-filtered terms (3<size<400, strict); target = all genes of the 2 largest terms (planted enrichment) + a seeded 10% random sample of the rest.
- **Conventions:** identical to the E. coli reference (`pvalueCutoff=1, qvalueCutoff=1, minGSSize=1, maxGSSize=1e9, pAdjustMethod=BH`; size filter on full term size).
- **GMT dedup note:** the TRRUST GMTs contain duplicate genes within terms. clusterProfiler uses unique (term, gene) pairs; mulea's C++ core (`src/set-based-enrichment-test.cpp`) and the web `ora()` count duplicates. To compare the hypergeometric *math* apples-to-apples, genes are deduplicated within each term in **both** tools (documented in the R generator and the web test). On raw GMTs the tools genuinely differ — a GMT-cleaning policy choice, not a bug.
- **Result** (`web/tests/clusterProfilerMultiOrg.test.ts`, 6/6 passing):

  | organism | tested terms | max rel. p-diff |
  |----------|-------------:|----------------:|
  | Homo sapiens | 378 | 3.56e-12 |
  | Mus musculus | 379 | 4.46e-12 |

  Hypergeometric and BH-adjusted p-values match clusterProfiler to < 1e-9 (floating-point identical). Fixtures SHA-256-pinned.

## GSEA (ranked-list): validation vs fgsea

mulea's web GSEA is validated against **fgsea** (Bioconductor 1.38.0) — the exact engine the
mulea R package calls (`SubramanianTest.R`: `fgsea::fgsea(pathways, stats, gseaParam, scoreType)`).
Inputs: the E. coli `ordered_set.tsv` (gene + logFC) and the same 3<size<400 filtered ontology.

| Quantity | Comparison | Result |
|---|---|---|
| enrichment score (ES) | exact vs `fgsea::calcGseaStat` | floating-point identical (≤ 1e-9) |
| leading edge | deterministic from ES | identical |
| NES | classic permutation null vs fgsea multilevel | Pearson r ≈ 0.9999, sign agrees on 153/153 |
| significant set (adj p < 0.05) | Jaccard | ≥ 0.75 (21/24 on this data) |

Two honest details:

- **ES uses `calcGseaStat`, not `fgsea()`'s ES column.** `fgsea()`'s multilevel *batch* code carries a
  ~1e-6 numerical artefact in ES on heavily-tied, low-precision scores; `calcGseaStat` is the
  canonical ES and mulea matches it exactly.
- **p-value is tolerance-parity, by design.** mulea/fgsea use the multilevel p; mulea uses a
  classic seeded gene-permutation null. They agree closely except very near the 0.05 boundary. ES,
  NES sign, and the leading edge are the exact/robust quantities.
- **Ties:** ~92% of the example logFC values tie; both fgsea and mulea break ties by stable input
  order, so the ES is reproducible.

**mulea eFDR for GSEA.** Alongside fgsea's BH (`adjusted_p_value`), mulea reports the mulea
**progressive rank-based eFDR extended from ORA to GSEA** — the NES-rank analogue of the paper's
ORA eFDR (`R_obs_j = #{i: |NES_i| ≥ |NES_j|}`; `R_exp_j` = per-permutation mean count of pooled null
`|NES|` reaching `|NES_j|`; `eFDR = min(R_exp/R_obs, 1)`), reusing the same gene-permutation null. It
is a **distinct** method, not a port of fgsea's FDR. On the E. coli example: every eFDR ∈ [0,1],
Spearman(|NES|, eFDR) = −0.997, Spearman(eFDR, BH) = +0.986 (`web/tests/gseaEfdr.test.ts`).

## Concordance with g:Profiler (external tool, g:SCS correction)

**This is concordance, NOT p-value parity.** g:Profiler corrects with g:SCS (Set Counts and Sizes),
fundamentally different from mulea's hypergeometric + Benjamini–Hochberg. We assert agreement of
ranking and significant sets, not equality of p-values.

g:Profiler was run via `gprofiler2::upload_GMT_file()` (CRAN gprofiler2 0.2.4) on the E. coli target
(`inst/extdata/target_set.txt`, 241 genes) against the **same RegulonDB GMT** uploaded as a custom
source (the GMT's leading `#` comment lines had to be stripped — g:Profiler's parser rejects them);
`gost(..., correction_method='g_SCS')`. The mulea side was recomputed with the web `ora()` engine.

| Metric | Value |
|---|---|
| Shared tested terms | 51 (g:Profiler tested 53; mulea's [3,400] filter drops CspA size 2 and CRP size 531) |
| Spearman of −log10(p), shared terms | **0.58** (positive) |
| Jaccard of significant sets | **0.29** |
| mulea significant (BH<0.05) | 7: DnaA, FNR, FadR, LexA, NsrR, Rob, SoxS |
| g:Profiler significant (g:SCS<0.05) | 2: FNR, LexA — a **strict subset** of mulea's, top hits agree |

g:SCS is more conservative → fewer significant terms, but its significant set is contained in
mulea's and the rankings correlate positively. No parity is claimed.
Fixture `python/tests/fixtures/gprofiler_concordance.csv` (SHA-256-pinned); test
`web/tests/gprofilerConcordance.test.ts` (4/4).

## Reproduce

```bash
# ORA vs clusterProfiler
Rscript python/tests/fixtures/generate_clusterprofiler_reference.R
cd web && npx vitest run tests/clusterProfiler.test.ts
cd python && pytest tests/test_parity_clusterprofiler.py

# GSEA vs fgsea
Rscript python/tests/fixtures/generate_fgsea_reference.R
cd web && npx vitest run tests/gseaEs.test.ts tests/gseaParity.test.ts
```

Fixtures (checksum-guarded in the web tests):
- `python/tests/fixtures/clusterprofiler_reference.csv` (SHA-256 `54b181e4d6aba87c9d60ce0d5cd9878057ebd2406a9518d7331b37882b6fecd7`)
- `python/tests/fixtures/fgsea_reference.csv` (SHA-256 `ee4015830ef75b9ccbb77519df5abb7134180f802261364d881dab34cd27cc81`)
