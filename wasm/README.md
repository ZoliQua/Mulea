# wasm/ — eFDR resampling core (Phase A)

Rcpp-free C++ port of mulea's Monte-Carlo eFDR resampling core
(`src/set-based-enrichment-test.cpp`), built so it can later compile to WebAssembly and run the
same algorithm in the browser. Parity target is **tolerance-based** (standard `std::mt19937`):
results converge to R's Monte-Carlo eFDR within MC noise; they are not bit-identical to R.

The web tool's default eFDR remains the deterministic exact-analytic port in `web/src/efdr.ts`;
this core is the resampling counterpart and the seed for a future shared cross-language core.

## Files

| File | Role |
| --- | --- |
| `efdr_core.{h,cpp}` | Pure core: `simulate(...)` → `(poolIntersect, selectIntersect, count)` histogram. Integer CSR API; the caller maps gene names → ids. |
| `hyper.{h,cpp}` | Hypergeometric upper-tail p-value (mirrors `web/src/statistics.ts`). |
| `efdr_convert.{h,cpp}` | Histogram → per-term eFDR (R-style `ties="max"` ranks, cumsum, clamp to 1). |
| `test_efdr.cpp` | Native tests: hyper, core correctness/determinism, conversion sanity, E. coli parity. |
| `example_data.h` | Synthetic fixtures for the deterministic unit tests. |
| `build-native.sh` | Build + run the tests with `clang++`. **This is the verified build.** |
| `binding.cpp`, `build-wasm.sh` | Emscripten binding + `emcc` command. **Not built in this repo — run by the user.** |

## Build & test (native — verified)

```bash
./wasm/build-native.sh
```
Compiles with `clang++ -std=c++17 -O2` and runs all tests. Exits nonzero on any failure.

## Parity result

The E. coli parity test runs `simulate` (100,000 steps, seed 42) on the RegulonDB TF example
(`inst/extdata/...`, `filter_ontology(min=3, max=400)`) and compares per-term eFDR to the
R-generated fixture `python/tests/fixtures/ora_efdr_reference.csv`. The observed p-values match the
fixture exactly (deterministic); the MC eFDR agrees within the tolerance asserted by the test
(`max |eFDR_cpp − eFDR_R| ≤ 0.01`). Measured on the committed data: **154 terms, max
|eFDR_cpp − eFDR_R| = 0.0012**.

## Build to WebAssembly (NOT built in this repo)

Emscripten is **not** installed in this repo and the `.wasm` is **not** produced or verified here.
To build it yourself:

```bash
git clone https://github.com/emscripten-core/emsdk && cd emsdk
./emsdk install latest && ./emsdk activate latest && source ./emsdk_env.sh
cd /path/to/mulea && ./wasm/build-wasm.sh   # → wasm/efdr_core.js + wasm/efdr_core.wasm
```

### WASM ABI

`int* efdr_simulate(categoryGenes, categoryOffsets, nCategories, poolIds, poolSize, selectSize,
steps, seed, nGenes, int* outBins)` returns a malloc'd `int32` buffer of `*outBins` triples
`[poolIntersect, selectIntersect, count, ...]`; free it with `efdr_free(ptr)`. Returns `null` when
the histogram is empty (`*outBins == 0`, nothing to read or free) or on `malloc` failure
(`*outBins` is reset to 0 in that case) — the JS side must check for a null pointer before reading
from `HEAP32`. The JS/TS consumer maps gene names → ids, calls `efdr_simulate`, reads the histogram
from `HEAP32`, then applies the `efdr_convert` logic (ported to TS) to obtain per-term eFDR.
Browser/worker wiring is **Phase B**.
