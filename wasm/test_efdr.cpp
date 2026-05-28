// Dependency-free native test driver for the pure-C++ eFDR core.
// Build/run via ./build-native.sh. Exits nonzero if any check fails.
#include <cmath>
#include <cstdio>

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

int main(int /*argc*/, char** /*argv*/) {
  // argv[1] = repo root path; used in later tasks (efdr_core parity test).
  test_hyper();
  std::fprintf(stderr, "%d checks, %d failures\n", g_checks, g_failures);
  return g_failures ? 1 : 0;
}
