#ifndef MULEA_EFDR_CONVERT_H
#define MULEA_EFDR_CONVERT_H

#include <vector>

#include "efdr_core.h"

namespace efdr {

// R-style round to 15 decimal places used before comparing/grouping p-values.
double round15(double x);

// rank(values, ties.method = "max") — ascending ranks (1-based), ties take the max rank.
// Mirrors web/src/efdr.ts rObsRanks.
std::vector<int> rObsRanks(const std::vector<double>& pValues);

// Convert a simulation histogram into per-term eFDR, mirroring R set.based.enrichment.test:
//   pObs_j   = hyperUpperTail(commonInSelect[j], commonInPool[j], poolSize, selectSize)
//   null p   = hyperUpperTail(selectIntersect, poolIntersect, poolSize, selectSize) per bin
//   R_exp_j  = sum of bin counts with round15(null-p) <= round15(pObs_j)  (sort + cumsum)
//   eFDR_j   = min((R_exp_j / steps) / R_obs_j, 1)
// The min(.,1) clamp follows the web port (web/src/efdr.ts); base R set.based.enrichment.test
// does not clamp FDR. (For the E. coli fixture all eFDR <= 1, so the two agree there.)
// commonInSelect[j] / commonInPool[j] are the OBSERVED overlaps of term j.
std::vector<double> efdrFromSimulation(
    const std::vector<int>& commonInSelect, const std::vector<int>& commonInPool,
    const std::vector<SimBin>& histogram, int poolSize, int selectSize, long long steps);

}  // namespace efdr

#endif
