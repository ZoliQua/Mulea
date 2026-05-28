// Dependency-free native test driver for the pure-C++ eFDR core.
// Build/run via ./build-native.sh. Exits nonzero if any check fails.
#include <cmath>
#include <cstddef>
#include <cstdio>
#include <vector>

#include "efdr_core.h"
#include "example_data.h"
#include "hyper.h"

static int g_failures = 0;
static int g_checks = 0;

#define CHECK(cond)                                                                \
  do {                                                                             \
    ++g_checks;                                                                    \
    if (!(cond)) {                                                                 \
      ++g_failures;                                                                \
      std::fprintf(stderr, "FAIL %s:%d: %s\n", __FILE__, __LINE__, #cond);         \
    }                                                                              \
  } while (0)

#define CHECK_NEAR(a, b, tol)                                                      \
  do {                                                                             \
    ++g_checks;                                                                    \
    double _ca = (double)(a);                                                      \
    double _cb = (double)(b);                                                      \
    double _d = std::fabs(_ca - _cb);                                              \
    if (_d > (tol)) {                                                              \
      ++g_failures;                                                                \
      std::fprintf(stderr, "FAIL %s:%d: |%.12g - %.12g| = %.3g > %.3g\n",          \
                   __FILE__, __LINE__, _ca, _cb, _d, (double)(tol));               \
    }                                                                              \
  } while (0)

static void test_hyper() {
  using efdr::logChoose;
  CHECK_NEAR(logChoose(0, 0), 0.0, 1e-12);
  CHECK_NEAR(logChoose(5, 2), std::log(10.0), 1e-12);   // C(5,2)=10
  CHECK(std::isinf(logChoose(5, 6)) && logChoose(5, 6) < 0.0);  // k>n -> -inf

  using efdr::hyperUpperTail;
  // P(X>=0) == 1 always (web early-return on commonInSelect==0).
  CHECK_NEAR(hyperUpperTail(0, 5, 10, 5), 1.0, 1e-12);
  // commonInPool==0 or selectSize==0 -> 1.
  CHECK_NEAR(hyperUpperTail(1, 0, 10, 5), 1.0, 1e-12);
  CHECK_NEAR(hyperUpperTail(1, 5, 10, 0), 1.0, 1e-12);
  // N=10, m=5, n=5: P(X>=5) = C(5,5)C(5,0)/C(10,5) = 1/252.
  CHECK_NEAR(hyperUpperTail(5, 5, 10, 5), 1.0 / 252.0, 1e-12);
  // P(X>=1) with N=10,m=5,n=5 = 1 - C(5,0)C(5,5)/C(10,5) = 1 - 1/252.
  CHECK_NEAR(hyperUpperTail(1, 5, 10, 5), 1.0 - 1.0 / 252.0, 1e-12);
  // Impossible overlap (commonInSelect > min(m,n)) -> 0.
  CHECK_NEAR(hyperUpperTail(6, 5, 10, 5), 0.0, 1e-12);
}

static long long total_count(const std::vector<efdr::SimBin>& h) {
  long long s = 0;
  for (const auto& b : h) s += b.count;
  return s;
}

static void test_simulate() {
  using namespace efdr_test;
  const int steps = 1000;

  // Fixture A: single bin (poolIntersect=2, selectIntersect=1), count==steps, RNG-independent.
  auto a = efdr::simulate(A_categoryGenes, A_categoryOffsets, A_nCategories,
                          A_poolIds, A_poolSize, A_selectSize, steps, 42u, A_nGenes);
  CHECK(a.size() == 1);
  if (a.size() == 1) {
    CHECK(a[0].poolIntersect == 2);
    CHECK(a[0].selectIntersect == 1);
    CHECK(a[0].count == steps);
  }

  // Fixture B: histogram count invariant sum == steps * nCategories.
  auto b = efdr::simulate(B_categoryGenes, B_categoryOffsets, B_nCategories,
                          B_poolIds, B_poolSize, B_selectSize, steps, 7u, B_nGenes);
  CHECK(total_count(b) == (long long)steps * B_nCategories);
  // No bin violates the support: selectIntersect <= selectSize and <= poolIntersect.
  for (const auto& bin : b) {
    CHECK(bin.selectIntersect <= B_selectSize);
    CHECK(bin.selectIntersect <= bin.poolIntersect);
  }

  // Zero steps -> empty histogram (guards against poolSize==0 / empty-input UB).
  auto empty = efdr::simulate(B_categoryGenes, B_categoryOffsets, B_nCategories,
                              B_poolIds, B_poolSize, B_selectSize, 0, 7u, B_nGenes);
  CHECK(empty.empty());

  // Determinism: same seed -> identical histogram; different seed may differ but stays valid.
  auto b2 = efdr::simulate(B_categoryGenes, B_categoryOffsets, B_nCategories,
                           B_poolIds, B_poolSize, B_selectSize, steps, 7u, B_nGenes);
  CHECK(b.size() == b2.size());
  bool identical = b.size() == b2.size();
  for (size_t i = 0; identical && i < b.size(); ++i) {
    identical = b[i].poolIntersect == b2[i].poolIntersect &&
                b[i].selectIntersect == b2[i].selectIntersect && b[i].count == b2[i].count;
  }
  CHECK(identical);
}

int main(int /*argc*/, char** /*argv*/) {
  // argv[1] = repo root path; used in later tasks (efdr_core parity test).
  test_hyper();
  test_simulate();
  std::fprintf(stderr, "%d checks, %d failures\n", g_checks, g_failures);
  return g_failures ? 1 : 0;
}
