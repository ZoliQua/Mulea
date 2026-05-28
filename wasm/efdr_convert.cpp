#include "efdr_convert.h"

#include <algorithm>
#include <cmath>
#include <numeric>

#include "hyper.h"

namespace efdr {

double round15(double x) { return std::round(x * 1e15) / 1e15; }

std::vector<int> rObsRanks(const std::vector<double>& pValues) {
  const size_t n = pValues.size();
  std::vector<double> rounded(n);
  for (size_t i = 0; i < n; ++i) rounded[i] = round15(pValues[i]);
  std::vector<size_t> order(n);
  std::iota(order.begin(), order.end(), 0);
  std::stable_sort(order.begin(), order.end(),
                   [&](size_t a, size_t b) { return rounded[a] < rounded[b]; });
  std::vector<int> out(n);
  size_t i = 0;
  while (i < n) {
    size_t j = i;
    while (j + 1 < n && rounded[order[j + 1]] == rounded[order[i]]) ++j;
    for (size_t t = i; t <= j; ++t) out[order[t]] = static_cast<int>(j + 1);  // 1-based max rank
    i = j + 1;
  }
  return out;
}

std::vector<double> efdrFromSimulation(
    const std::vector<int>& commonInSelect, const std::vector<int>& commonInPool,
    const std::vector<SimBin>& histogram, int poolSize, int selectSize, long long steps) {
  const size_t nTerms = commonInSelect.size();
  std::vector<double> eFDR(nTerms, 0.0);
  if (selectSize == 0 || steps == 0) {
    for (size_t j = 0; j < nTerms; ++j) eFDR[j] = std::nan("");
    return eFDR;
  }

  // observed p-values + R_obs ranks
  std::vector<double> pObs(nTerms);
  for (size_t j = 0; j < nTerms; ++j) {
    pObs[j] = hyperUpperTail(commonInSelect[j], commonInPool[j], poolSize, selectSize);
  }
  std::vector<int> rObs = rObsRanks(pObs);

  // null distribution: (round15 p) -> cumulative count, sorted ascending by p
  std::vector<std::pair<double, long long>> bins;
  bins.reserve(histogram.size());
  for (const auto& b : histogram) {
    double p = round15(hyperUpperTail(b.selectIntersect, b.poolIntersect, poolSize, selectSize));
    bins.emplace_back(p, b.count);
  }
  std::sort(bins.begin(), bins.end(),
            [](const auto& a, const auto& b) { return a.first < b.first; });
  std::vector<double> nullP(bins.size());
  std::vector<long long> cum(bins.size());
  long long running = 0;
  for (size_t i = 0; i < bins.size(); ++i) {
    running += bins[i].second;
    nullP[i] = bins[i].first;
    cum[i] = running;
  }

  for (size_t j = 0; j < nTerms; ++j) {
    double target = round15(pObs[j]);
    // upper_bound: count of null p <= target
    size_t idx = static_cast<size_t>(
        std::upper_bound(nullP.begin(), nullP.end(), target) - nullP.begin());
    long long rExp = idx > 0 ? cum[idx - 1] : 0;
    double v = (static_cast<double>(rExp) / static_cast<double>(steps)) / rObs[j];
    eFDR[j] = std::min(v, 1.0);
  }
  return eFDR;
}

}  // namespace efdr
