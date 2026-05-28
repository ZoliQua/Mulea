// Emscripten binding for the eFDR core. Compiled ONLY by build-wasm.sh (emcc).
// Not part of the native build. Exposes a flat C ABI: the JS side passes the CSR arrays and
// reads back the histogram as triples (poolIntersect, selectIntersect, count) from WASM heap.
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>

#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <vector>

#include "efdr_core.h"

extern "C" {

// Runs the simulation and writes the histogram into a freshly malloc'd int32 buffer laid out as
// [poolIntersect, selectIntersect, count, ...] (count truncated to int32; steps*nCat fits for
// realistic inputs). Returns the buffer pointer; *outBins receives the number of triples.
// The JS side must call efdr_free(ptr) when done.
EMSCRIPTEN_KEEPALIVE
int* efdr_simulate(const int* categoryGenes, const int* categoryOffsets, int nCategories,
                   const int* poolIds, int poolSize, int selectSize, int steps,
                   uint32_t seed, int nGenes, int* outBins) {
  std::vector<efdr::SimBin> hist = efdr::simulate(categoryGenes, categoryOffsets, nCategories,
                                                  poolIds, poolSize, selectSize, steps, seed, nGenes);
  *outBins = (int)hist.size();
  if (hist.empty()) return nullptr;  // JS side must check: 0 bins -> null, nothing to read/free
  int* buf = (int*)std::malloc(sizeof(int) * 3 * hist.size());
  if (buf == nullptr) { *outBins = 0; return nullptr; }
  for (size_t i = 0; i < hist.size(); ++i) {
    buf[3 * i + 0] = hist[i].poolIntersect;
    buf[3 * i + 1] = hist[i].selectIntersect;
    buf[3 * i + 2] = (int)hist[i].count;
  }
  return buf;
}

EMSCRIPTEN_KEEPALIVE
void efdr_free(int* p) { std::free(p); }

}  // extern "C"
#endif  // __EMSCRIPTEN__
