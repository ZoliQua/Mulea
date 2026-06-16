/** Modal: the formal derivation that the analytic eFDR is the S→∞ limit of mulea's resampling. */
export function EfdrDerivation({ onClose }: { onClose: () => void }) {
  return (
    <div className="pkg-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="eFDR derivation">
      <div className="pkg-modal deriv-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pkg-close" onClick={onClose} aria-label="Close">×</button>
        <h2>The analytic eFDR is exact</h2>
        <p>
          mulea's empirical FDR (Turek et al. 2024) estimates an expected rank by <em>resampling</em>.
          mulea also computes that estimate in <strong>closed form</strong> — its deterministic
          S→∞ limit — so the “Exact” result carries no Monte-Carlo noise and is bit-reproducible.
        </p>

        <p>Observed rank of ontology term <em>j</em> (how many terms are at least as significant):</p>
        <div className="deriv-eq">R<sub>j</sub> = Σ<sub>i</sub> 𝟙(p<sub>i</sub> ≤ p<sub>j</sub>)</div>

        <p>
          In one resampling step a random target of size <em>n</em> = |select| is drawn from the
          background (size <em>N</em>). Term <em>i</em> (with <em>m<sub>i</sub></em> genes in the
          background) overlaps it <strong>hypergeometrically</strong>:
        </p>
        <div className="deriv-eq">
          K<sub>i</sub><sup>s</sup> ~ Hypergeometric(N, m<sub>i</sub>, n)   ·   p<sub>i</sub><sup>s</sup> = P<sub>hyp</sub>(X ≥ K<sub>i</sub><sup>s</sup>)   ·   R<sub>j</sub><sup>s</sup> = Σ<sub>i</sub> 𝟙(p<sub>i</sub><sup>s</sup> ≤ p<sub>j</sub>)
        </div>

        <p>
          The expected rank is the mean over steps. By the law of large numbers it converges to a
          closed form — each indicator's expectation is a finite sum over the hypergeometric support:
        </p>
        <div className="deriv-eq">
          R̄<sub>j</sub> = (1/S) Σ<sub>s</sub> R<sub>j</sub><sup>s</sup>   ──S→∞──▶   Σ<sub>i</sub> Σ<sub>k : p<sub>hyp</sub>(k) ≤ p<sub>j</sub></sub> PMF(k; N, m<sub>i</sub>, n)
        </div>

        <p>
          That double sum is exactly what mulea's exact path accumulates. The eFDR is then
          {' '}<span className="deriv-inline">min(R̄<sub>j</sub> / R<sub>j</sub>, 1)</span>.
        </p>

        <h3>Convergence to the limit</h3>
        <p>
          Each R<sub>j</sub><sup>s</sup> is a sum of Bernoulli indicators, so Var(R̄<sub>j</sub>) =
          O(1/S): by the CLT the Monte-Carlo (“Resampling”) estimate approaches the analytic value at
          rate O(1/√steps) — a log-log slope of −0.5. Measured on the E. coli example (error vs the
          analytic path):
        </p>
        <div className="deriv-fig">
          <img src={`${import.meta.env.BASE_URL}efdr-convergence.svg`} alt="Log-log plot: Monte-Carlo eFDR error falls along a slope of −0.5 toward the analytic limit" />
        </div>

        <p className="pkg-cite">
          Derivation &amp; benchmark: PARITY.md · Method: Turek et al., BMC Bioinformatics 2024, 25:334.
        </p>
      </div>
    </div>
  );
}
