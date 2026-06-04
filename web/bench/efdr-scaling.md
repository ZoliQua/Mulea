# WASM Monte-Carlo eFDR — scaling benchmark

> Reproduce: `cd web && node bench/efdr-scaling.mjs > bench/efdr-scaling.md`
> Environment: Node v25.9.0 · Darwin arm64 · Apple M2 Max · median of 3 runs · seed 42

## A. Permutation depth (5000 background · 300 terms · 200 target)

| steps | wall-clock (ms) |
|---:|---:|
| 1,000 | 56 |
| 10,000 | 124 |
| 100,000 | 837 |
| 1,000,000 | 7749 |

## B. Problem size (steps = 10,000)

| background | terms | term size | target | wall-clock (ms) |
|---:|---:|---:|---:|---:|
| 2,000 | 100 | 50 | 100 | 33 |
| 5,000 | 300 | 50 | 200 | 127 |
| 10,000 | 1,000 | 50 | 400 | 532 |
| 20,000 | 2,000 | 80 | 800 | 2527 |

Memory scales with the CSR inputs (Σ term sizes + background) and the histogram
(bounded by selectSize × max term size), not with `steps` — only wall-clock grows with `steps`.
