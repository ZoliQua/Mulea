# muleaLab — web

Client-side enrichment analysis (ORA + exact eFDR) that runs entirely in the browser.
Companion to the [mulea](https://github.com/ELTEbioinformatics/mulea) R package and the
`mulealab` Python package; numerically in parity with both.

## How it works

muleaLab finds gene-set categories (ontology terms) that are over-represented in a list of
genes of interest, and corrects for multiple testing — all in the browser. Open the `?` button
in the top bar for the same walkthrough inside the app.

### Inputs
- **Ontology (GMT)** — one term per line: a term ID/name followed by its member genes.
- **Target list** — your genes of interest (e.g. differentially expressed genes).
- **Background list** — the universe of genes the target was drawn from.

The "★ Load E. coli example" button fills all three with a bundled *E. coli* RegulonDB set so you
can try the tool without your own data.

### Methods
Each term is tested for over-representation against the background with the **hypergeometric
test**. You then pick a multiple-testing correction:

- **eFDR** — resampling-based **empirical false discovery rate** (Turek et al. 2024). The
  background is repeatedly resampled to build a null distribution of how often terms reach a
  given p-value by chance; the eFDR is the resampling-estimated rate. It is typically **less
  conservative than BH or Bonferroni**, so it recovers more true terms.
- **BH** — Benjamini–Hochberg FDR.
- **Bonferroni** — most conservative (family-wise error rate).

A term is reported **significant when its score (eFDR or adjusted p-value) is below 0.05**.

### Visualizations
Refined Slate & Pine look: data marks are coloured by a green significance ramp; the top bar and
method/contrast controls use segmented pills; results use underline tabs, a summary pill, and a
significance-dot table.

Switch views with the tabs:

- **Table** — sortable significant-terms table.
- **Lollipop**, **bar** — ranked effect-size / score plots.
- **Network** — term–gene graph (deterministic force layout).
- **Heatmap** — terms × genes overlap.
- **Venn Diagram** / **UpSet** — which terms are called significant under eFDR vs BH vs Bonferroni
  (the paper's comparison, computed on your data).
- **Term drill-down** — click a term/dot to see its hit genes and overlap counts.

Interactive results: search the table by term name, drag network nodes to rearrange the graph, and click any Methods-Venn region to list the terms it contains. Compare the corrections as a Venn diagram or an UpSet plot (set colours adjustable); click any region/intersection to list its terms. Every figure shows its score and is clickable for drill-down; network nodes can be dragged within a visible frame; the heatmap labels its gene columns.

Each figure has a settings panel (the ⚙ button): adjust font, label size, scale, accent/outline
colours, and (for the Methods Venn) transparency — globally or per-figure — plus a title and
element order (by significance, name, or gene overlap); the title is included in the exported
figure. There is also a global colour-blind-safe palette. Export any figure as PNG or SVG (⤓).

### Multi-contrast
Switch to "Multi-contrast" to compare several target lists against one shared ontology +
background on a **dot-plot matrix** (rows = terms, columns = contrasts, dot size = gene overlap,
color = score). Each contrast runs the same eFDR engine as single-contrast mode.

### Reproduce & share
- **Share link** — encodes the full analysis (inputs + method + a result fingerprint) into a URL
  that re-runs deterministically in any browser and verifies the fingerprint matches.
- **Report** — a print-ready PDF (provenance header, significant-terms table, and figures) via
  the browser's print dialog.

### Offline & privacy
After the first visit the app installs as a **PWA** and runs fully offline; **all computation is
client-side** and no data is ever sent to a server. A **light/dark theme** toggle (☾/☀) sits in
the top bar and persists across sessions.

> Method reference: Turek et al., *mulea: an R package for enrichment analysis using multiple
> ontologies and empirical false discovery rate*, **BMC Bioinformatics** 2024, **25**:334.

## Develop
- `npm install`
- `npm run dev` — local dev server
- `npm test` — Vitest (pure-logic + R-parity tests)
- `npm run build` — static production bundle (`dist/`)
- `npm run preview` — serve the built bundle

## Deploy
Static build, no backend, no environment variables — deploy `dist/` to Vercel (or any static host).
All computation runs client-side in a Web Worker; user data never leaves the browser.

## Layout
- `src/{statistics,io,ontology,ora,efdr}.ts` — the headless compute core (parity-tested)
- `src/analysis.ts`, `src/exportTsv.ts`, `src/lollipop.ts`, `src/tableView.ts` — pure app logic (tested)
- `src/worker/`, `src/hooks/`, `src/ui/`, `src/App.tsx` — the React UI (verified by typecheck + build)
- `public/examples/` — bundled E. coli RegulonDB example

## Visualizations
Visualizations: results table, lollipop, barplot, network (deterministic force layout), and heatmap — plus a per-term drill-down (hit genes + overlap counts) — all rendered client-side from pure, tested layout functions, behind a tab switcher, plus a Methods Venn comparing which terms are significant under eFDR vs BH vs Bonferroni (the paper's Fig 1, computed on your data).

## Shareable link
After a run, the "🔗 Share link" button encodes the full analysis (inputs + method + result fingerprint) into a `#c=…` URL fragment. Opening that URL in any browser re-runs the analysis deterministically (no server, no RNG for ORA/BH/Bonferroni) and verifies an FNV-1a fingerprint of the significant rows, showing "✓ Reproduced exactly (matches the shared fingerprint)" on match. A corrupted or tampered fragment shows "This shared link is invalid." and leaves the app in idle state. Scope: small inputs (the full capsule must fit within ~8 KB of URL); downloadable-file and compression support are deferred.

## PDF report
One click on "⎙ Report" renders a print-ready report — provenance header (method, counts, run timestamp), the significant-terms table, and all five figure panels — that the browser saves as a vector PDF via `window.print()`. No server, no upload; the report is generated entirely from the in-memory result.

## Multi-contrast
Multi-contrast: compare several target gene lists against one shared ontology + background on a dot-plot matrix (rows = significant terms, columns = contrasts, dot size = gene overlap, color = score), with click-to-drill-down — each contrast runs the same exact-eFDR engine, identical to single-contrast mode.

## Offline / PWA
The app installs and runs fully offline as a Progressive Web App. A service worker precaches the entire bundle (including the bundled E. coli example) on first visit, so every subsequent visit — and every analysis — works without a network connection. A status badge in the top bar shows "● online" or "● offline — running locally" and updates in real time. This is the strongest form of the privacy guarantee: after the first load, no data ever reaches any server.
