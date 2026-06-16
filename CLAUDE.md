# CLAUDE.md — mulea

## Project Overview

`mulea` — R package for functional enrichment analysis using **multiple ontologies** and a
resampling-based **empirical false discovery rate (eFDR)**. Two analysis modes: set-based
overrepresentation analysis (ORA, hypergeometric test) and ranked-list GSEA (via `fgsea`).
Paper: Turek et al., BMC Bioinformatics 2024, 25:334 (`docs/` — gitignored).

- **This repo:** fork `https://github.com/ZoliQua/Mulea` (`origin`, branch `master`).
- **Upstream:** `https://github.com/ELTEbioinformatics/mulea`.
- **Package version:** `1.1.1` (in `DESCRIPTION`); license GPL-2; R ≥ 4.0.0.
- **Active side-project plan:** turn mulea into a web tool + Python companion — all unified
  under the single name **mulea** (the "muleaLab" name was dropped; R on CRAN, Python on PyPI, web).
  Spec: `docs/superpowers/specs/2026-06-01-mulea-web-python-platform-design.md` (gitignored).

## Strict Rules (non-negotiable)

These apply to **every component** — the R package and the planned Python companion + web tool.

### Scientific rigor
- **No hallucination.** Use only facts verified from this repo, the paper, or a cited source.
- **Say no.** If you don't know or can't verify, say so plainly — don't guess.
- **Cite sources.** When stating a fact, point to the file/line, doc, or URL it came from.
- **Verify everything.** Read a file before referencing or editing it; re-check after changes.
- **Plan before non-trivial work.** No placeholder/stub code presented as done.

### Commit rules
- **Author = the user only** (git identity: Zoltán Dul). Claude is **never** a co-author;
  **no** "Co-Authored-By" / "Generated with Claude" trailers (enforced in
  `.claude/settings.local.json`).
- **Commit only when explicitly asked.**
- **Commit dates start 2026-05-11.** Max **8 commits per calendar day**; the 9th rolls to the
  next day. Set both author and committer date when committing, e.g.
  `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE`.
- **Push is mandatory after every 8 commits.**

### Versioning
- SemVer. Bump `Version:` in `DESCRIPTION` and add an entry to `NEWS.md` before a release commit.

## Layout (verified)

```
R/                     Package source
  ORA.R                  Overrepresentation analysis (set-based) entry points
  SetBasedEnrichmentTest.R, set-based-enrichment-test.r
  HypergeometricTest.R   Hypergeometric / Fisher test
  RankedBasedTest.R, SubramanianTest.R   GSEA (fgsea / Kolmogorov–Smirnov)
  Plotting.R             Lollipop, bar, network, heatmap plots (largest file)
  Utils.R, GenericFunctions.R, Methods.R, RcppExports.R, Zzz.R
src/                   C++ (Rcpp)
  set-based-enrichment-test.cpp   eFDR resampling core  ← WASM-port candidate
  RcppExports.cpp
man/                   Roxygen2-generated docs (do not hand-edit; regenerate)
tests/testthat/        testthat (edition 3)
vignettes/mulea.Rmd    Vignette
docs/                  gitignored: the paper PDF + the mulea spec
```

## Planned architecture — "mulea" (target; NOT yet in this repo)

Per the spec, mulea grows new legs (web tool + Python companion) kept in numerical **parity**
with the R package. **Decision (2026-06-02): the R package stays at the repo root** as the
anchor — it remains an installable CRAN/Bioconductor package and stays mergeable with upstream
`ELTEbioinformatics/mulea`. The new legs are sibling directories (a polyglot repo, *not* a
fully symmetric `r/ python/ web/` layout). Build in phases (Phase 1 first); full catalog & risks
in the spec.

- root      — the existing mulea **R package** (DESCRIPTION, `R/`, `src/`, `man/`, …), the
  **canonical reference** / eFDR parity oracle. Stays in place; do not move it under `r/`.
- `python/` — headless companion: pip library + Typer CLI. Target tooling (mirrors
  vennDiagramLab): hatchling build, pytest, ruff, mypy.
- `web/`    — web tool: React + TypeScript + Vite, **100% client-side / static (Vercel), no
  backend** — all computation in-browser. Target tooling: Vitest, eslint. (Named `web/`, not
  `src/`, because the root `src/` already holds the R package's C++.)
- shared    — versioned ontology/sample data; a sync script feeds the Python side from one source.
- **eFDR core → WASM (locked decision):** compile the C++ eFDR core
  (`src/set-based-enrichment-test.cpp`) to WebAssembly via Emscripten so web + Python + R run the
  *same* seeded core → true bit-parity + deterministic replay. The RNG must be deterministic and
  identically seedable.

**Parity strategy:** golden-fixture + byte-equality for the deterministic parts
(GMT IO / ORA / BH / Bonferroni); shared WASM core (or tolerance-based) for eFDR.

> Until `python/` and `web/` exist, treat the above as design intent — do not reference them
> as if present. Verify before citing. (The root `src/` C++ is real, today.)

## Dev commands

### R package (today, from repo root)
- Tests: `R -q -e 'devtools::test()'`
- Regenerate `man/` + `NAMESPACE` from roxygen: `R -q -e 'devtools::document()'`
- Full check: `R -q -e 'devtools::check()'`

Generated files (`man/*.Rd`, `NAMESPACE`, `src/RcppExports.cpp`, `R/RcppExports.R`) come from
roxygen2 / Rcpp — change the source, then regenerate; never hand-edit the generated output.

### Web / Python (once those legs exist — target conventions)
- Web: `npm run dev` / `npm test` (Vitest) / `npm run build` (static, Vercel).
- Python: `pytest` / `ruff check` / `mypy`; build with hatchling.
