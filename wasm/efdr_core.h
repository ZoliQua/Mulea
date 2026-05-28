#ifndef MULEA_EFDR_CORE_H
#define MULEA_EFDR_CORE_H

#include <cstdint>
#include <vector>

namespace efdr {

struct SimBin {
  int poolIntersect;    // |category ∩ pool|
  int selectIntersect;  // |category ∩ random select|
  long long count;      // number of (category, step) pairs with this (poolIntersect, selectIntersect)
};

// Rcpp-free mirror of enrichment_test_simulation. Categories are passed in CSR form:
// categoryGenes is gene ids concatenated across categories; categoryOffsets has length
// nCategories+1 delimiting each category. Samples `selectSize` ids from poolIds without
// replacement, `steps` times, and returns the (poolIntersect, selectIntersect)->count histogram.
// All gene ids must be in [0, nGenes).
std::vector<SimBin> simulate(
    const int* categoryGenes, const int* categoryOffsets, int nCategories,
    const int* poolIds, int poolSize,
    int selectSize, int steps, uint32_t seed, int nGenes);

}  // namespace efdr

#endif
