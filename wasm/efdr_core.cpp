#include "efdr_core.h"

#include <algorithm>
#include <cassert>
#include <random>
#include <unordered_map>
#include <utility>

namespace efdr {

struct PairHash {
  size_t operator()(const std::pair<int, int>& p) const noexcept {
    return std::hash<long long>()((static_cast<long long>(p.first) << 32) ^
                                  static_cast<unsigned int>(p.second));
  }
};

std::vector<SimBin> simulate(
    const int* categoryGenes, const int* categoryOffsets, int nCategories,
    const int* poolIds, int poolSize,
    int selectSize, int steps, uint32_t seed, int nGenes) {
  if (nCategories <= 0 || poolSize <= 0 || selectSize <= 0 || steps <= 0) return {};

  // reverse index: gene id -> category ids containing it (raw term genes, like the original C++)
  std::vector<std::vector<int>> reversedDB(nGenes);
  for (int cat = 0; cat < nCategories; ++cat) {
    for (int j = categoryOffsets[cat]; j < categoryOffsets[cat + 1]; ++j) {
      int g = categoryGenes[j];
      assert(g >= 0 && g < nGenes);
      reversedDB[g].push_back(cat);
    }
  }

  // category -> |category ∩ pool|
  std::vector<int> categoryPoolFreq(nCategories, 0);
  for (int i = 0; i < poolSize; ++i) {
    assert(poolIds[i] >= 0 && poolIds[i] < nGenes);
    for (int cat : reversedDB[poolIds[i]]) categoryPoolFreq[cat]++;
  }

  if (selectSize > poolSize) selectSize = poolSize;  // safety; matches intersect(select, pool)

  std::unordered_map<std::pair<int, int>, long long, PairHash> hist;
  std::vector<int> scratch(poolIds, poolIds + poolSize);
  std::vector<int> selectFreq(nCategories, 0);
  std::mt19937 rng(seed);

  for (int step = 0; step < steps; ++step) {
    // partial Fisher–Yates: first `selectSize` entries of scratch become the sample
    for (int i = 0; i < selectSize; ++i) {
      std::uniform_int_distribution<int> dist(i, poolSize - 1);
      std::swap(scratch[i], scratch[dist(rng)]);
    }
    for (int i = 0; i < selectSize; ++i) {
      for (int cat : reversedDB[scratch[i]]) selectFreq[cat]++;
    }
    // tally every category this step (so sum(count) == steps * nCategories), then reset
    for (int cat = 0; cat < nCategories; ++cat) {
      hist[{categoryPoolFreq[cat], selectFreq[cat]}]++;
      selectFreq[cat] = 0;
    }
  }

  std::vector<SimBin> out;
  out.reserve(hist.size());
  for (const auto& kv : hist) {
    out.push_back(SimBin{kv.first.first, kv.first.second, kv.second});
  }
  std::sort(out.begin(), out.end(), [](const SimBin& a, const SimBin& b) {
    if (a.poolIntersect != b.poolIntersect) return a.poolIntersect < b.poolIntersect;
    return a.selectIntersect < b.selectIntersect;
  });
  return out;
}

}  // namespace efdr
