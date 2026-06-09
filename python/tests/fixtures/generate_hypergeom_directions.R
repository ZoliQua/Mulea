# Golden fixture: hypergeometric ORA p-values for the three tail directions
# (over / under / two-sided), used to validate the web TS implementation in
# web/tests/oraDirections.test.ts.
#
# Usage (from repo root):
#   Rscript python/tests/fixtures/generate_hypergeom_directions.R
# Requires only base R (stats); no mulea load needed.
#
# Parameterization (matches web/src/statistics.ts hypergeometricPValue):
#   X ~ Hypergeometric(population = N, successes = m, draws = n), observed k.
# In R's phyper(q, m, n_black, draws): m = successes, n_black = N - m, draws = n.
#
# Tails:
#   over      = P(X >= k) = 1 - phyper(k - 1, m, N - m, n)
#   under     = P(X <= k) =     phyper(k,     m, N - m, n)
#   two-sided = Fisher-style sum of dhyper(i) over the support for all i whose
#               probability is <= dhyper(k) * (1 + 1e-7). This is exactly what
#               stats::fisher.test() reports for the 2x2 table and what the TS
#               'two-sided' branch computes.

two_sided <- function(k, m, N, n) {
  support <- max(0, n + m - N):min(n, m)
  d <- dhyper(support, m, N - m, n)
  d_obs <- dhyper(k, m, N - m, n)
  sum(d[d <= d_obs * (1 + 1e-7)])
}

# Test cases: columns k (observed common-in-select), m (common-in-pool / successes),
# N (pool size / population), n (select size / draws). Mix enriched, depleted,
# zero-overlap, and boundary cases.
cases <- data.frame(
  k = c(4,   2,   0,   10,  1,   30),
  m = c(5,   8,   5,   50,  20,  100),
  N = c(20,  40,  10,  500, 100, 1000),
  n = c(5,   10,  4,   60,  5,   200)
)

cases$over <- mapply(function(k, m, N, n) 1 - phyper(k - 1, m, N - m, n),
                     cases$k, cases$m, cases$N, cases$n)
cases$under <- mapply(function(k, m, N, n) phyper(k, m, N - m, n),
                      cases$k, cases$m, cases$N, cases$n)
cases$two_sided <- mapply(two_sided, cases$k, cases$m, cases$N, cases$n)

out <- file.path("python", "tests", "fixtures", "hypergeom_directions_reference.csv")
write.csv(cases, out, row.names = FALSE)
cat("Wrote", nrow(cases), "rows to", out, "\n")
