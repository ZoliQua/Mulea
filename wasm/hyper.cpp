#include "hyper.h"

#include <algorithm>
#include <cmath>

namespace efdr {

double logChoose(int n, int k) {
  if (k > n || k < 0) return -INFINITY;
  if (k == 0 || k == n) return 0.0;
  int kk = std::min(k, n - k);
  double result = 0.0;
  for (int i = 0; i < kk; ++i) {
    result += std::log(static_cast<double>(n - i)) - std::log(static_cast<double>(i + 1));
  }
  return result;
}

double hyperUpperTail(int commonInSelect, int commonInPool, int poolSize, int selectSize) {
  if (selectSize == 0 || commonInPool == 0 || commonInSelect == 0) return 1.0;
  int upper = std::min(commonInPool, selectSize);
  if (commonInSelect > upper) return 0.0;
  double logDenom = logChoose(poolSize, selectSize);
  double p = 0.0;
  for (int i = std::max(0, commonInSelect); i <= upper; ++i) {
    double logP = logChoose(commonInPool, i) + logChoose(poolSize - commonInPool, selectSize - i) - logDenom;
    if (logP > -700.0) p += std::exp(logP);  // guard: exp(-700) ≈ 1e-304, below this is numerically zero
  }
  return std::min(p, 1.0);
}

}  // namespace efdr
