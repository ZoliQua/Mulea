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
