/**
 * Approximate Monte-Carlo standard error for the resampling eFDR.
 *
 * APPROXIMATION — read this before using the numbers.
 *
 * mulea's resampling eFDR for ontology term *j* is the ratio of an expected rank
 * (estimated by averaging over `steps` permutations) to the observed rank:
 *
 *     eFDR_j = (R_exp_j / steps) / R_obs_j
 *
 * where `R_exp_j` is the total number of permutation "hits" — terms that came out
 * at least as significant as term *j* — summed across all `steps` draws, and
 * `R_obs_j = R_obs(p_j) = Σ_i 1(p_i ≤ p_j)` is the observed rank of term *j* in the
 * real data (computed via `rObsRanks` in `efdr.ts:7`). The derivation of eFDR as the
 * S→∞ limit of this estimator is in `PARITY.md:58-94`.
 *
 * We do NOT have per-permutation hit counts in the browser today: the WASM core
 * (`src/set-based-enrichment-test.cpp` → `src/wasm/efdr_core.wasm`) emits only the
 * aggregated expected rank, not the per-permutation variance needed for an EXACT
 * standard error. So this module gives a *principled* approximation, not the exact SE.
 *
 * Model. Treat the per-permutation hit indicator for term *j* as a rare-ish count and
 * model the total hit count `H_j = R_exp_j` (summed over `steps` draws) as Poisson.
 * For a Poisson count, Var(H_j) ≈ E[H_j] = R_exp_j. Since
 *
 *     eFDR_j = H_j / (steps · R_obs_j)   ⇒   Var(eFDR_j) ≈ Var(H_j) / (steps · R_obs_j)²
 *                                                       = R_exp_j / (steps · R_obs_j)²
 *
 * and R_exp_j = eFDR_j · steps · R_obs_j, substituting gives the closed form
 *
 *     SE(eFDR_j) ≈ sqrt( eFDR_j / (steps · R_obs_j) ).
 *
 * This is the Poisson MC standard error. It scales as O(1/√steps), matching the
 * CLT convergence measured in `web/bench/efdr-convergence.md`. It is an UPPER-ish,
 * conservative estimate: the true indicators are not independent across terms within a
 * permutation (they share one drawn target set), and the Poisson mean≈variance identity
 * over-states variance for non-rare counts. An exact SE requires the WASM core to emit
 * per-permutation variance — a future enhancement, see note above.
 *
 * The exact per-permutation SE is therefore NOT what this returns; this is the
 * principled Poisson approximation usable with today's aggregated core output.
 */

export interface EfdrStandardError {
  /** Approximate Poisson Monte-Carlo standard error of the eFDR estimate. */
  se: number;
  /** Lower 95% CI bound, clamped to [0, 1]. */
  ciLow: number;
  /** Upper 95% CI bound, clamped to [0, 1]. */
  ciHigh: number;
}

/** Normal 95% two-sided multiplier. */
const Z_95 = 1.96;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * Approximate Monte-Carlo standard error and 95% CI for one term's resampling eFDR.
 *
 * @param eFDR  the term's eFDR estimate (the clamped expected/observed-rank ratio).
 * @param steps number of resampling permutations used.
 * @param rObs  the term's observed rank `R_obs(p_j)` — a positive integer in real data.
 *              Compute it from the p-values with `rObsRanks` (`efdr.ts:7`).
 * @returns `{ se, ciLow, ciHigh }`; SE is `sqrt(eFDR / (steps · rObs))`, CI is
 *          `eFDR ± 1.96·se` clamped to [0, 1].
 *
 * Degenerate inputs are handled and always return finite numbers:
 * - `eFDR` NaN/negative, or `steps <= 0`, or `rObs <= 0` → `se = 0` (no information /
 *   undefined); the CI collapses to the clamped point estimate (0 if eFDR is non-finite).
 * - `eFDR = 0` → `se = 0` and a degenerate CI at 0 (no permutation ever beat the term).
 */
export function efdrStandardError(eFDR: number, steps: number, rObs: number): EfdrStandardError {
  // A finite, in-principle-valid point estimate to centre the CI on.
  const point = Number.isFinite(eFDR) && eFDR > 0 ? eFDR : 0;

  // Guard the variance denominator: need real permutations and a real observed rank.
  const denomOk = Number.isFinite(steps) && steps > 0 && Number.isFinite(rObs) && rObs > 0;

  let se = 0;
  if (point > 0 && denomOk) {
    se = Math.sqrt(point / (steps * rObs));
  }

  const ciLow = clamp01(point - Z_95 * se);
  const ciHigh = clamp01(point + Z_95 * se);
  return { se, ciLow, ciHigh };
}
