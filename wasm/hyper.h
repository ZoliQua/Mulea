#ifndef MULEA_HYPER_H
#define MULEA_HYPER_H

namespace efdr {

// Overflow-safe log-binomial coefficient. Mirrors web/src/statistics.ts logChoose.
double logChoose(int n, int k);

// One-tailed hypergeometric overrepresentation p-value P(X >= commonInSelect),
// X ~ Hypergeometric(population=poolSize, successes=commonInPool, draws=selectSize).
// Mirrors web/src/statistics.ts hypergeometricPValue and R 1-phyper(k-1, m, N-m, n).
double hyperUpperTail(int commonInSelect, int commonInPool, int poolSize, int selectSize);

}  // namespace efdr

#endif
