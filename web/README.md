# muleaLab — web

Client-side enrichment analysis (ORA + exact eFDR) that runs entirely in the browser.
Companion to the [mulea](https://github.com/ELTEbioinformatics/mulea) R package and the
`mulealab` Python package; numerically in parity with both.

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
