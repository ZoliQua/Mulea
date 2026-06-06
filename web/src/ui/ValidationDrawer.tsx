/** Right-hand drawer: graphical summary of the external validation vs clusterProfiler. */
export function ValidationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <aside className={open ? 'help-drawer val-drawer open' : 'help-drawer val-drawer'}
      aria-hidden={!open} aria-label="External validation">
      <button type="button" className="close" onClick={onClose} aria-label="Close validation">×</button>
      <h2>External validation</h2>
      <p>
        muleaLab's overrepresentation core is checked against an independent, published tool —
        <strong> clusterProfiler::enricher</strong> (Bioconductor 4.20.0) — on the same
        <em> E. coli</em> RegulonDB data, so the agreement isn't just “we match ourselves”.
      </p>

      <div className="val-fig">
        <img src={`${import.meta.env.BASE_URL}validation-cp.svg`}
          alt="Scatter of muleaLab vs clusterProfiler p-values; all 153 points lie on the y = x line" />
      </div>

      <h3>Result</h3>
      <p>
        On the 153 shared terms the hypergeometric p-values are <strong>floating-point identical</strong>
        (max relative difference ≈ 2.5×10⁻¹³) — every point sits on the <em>y = x</em> line. BH-adjusted
        values match too on the shared tested set.
      </p>

      <h3>The one matched convention</h3>
      <p>
        clusterProfiler tests against the <em>annotated</em> universe (genes in ≥ 1 term: N = 1326,
        n = 81), while muleaLab defaults to the full background (7381 / 241). Neither is wrong — it is a
        choice about unannotated genes. We run muleaLab on that same annotated universe, so the
        statistic is compared, not the convention.
      </p>

      <h3>Scope</h3>
      <p>
        This validates the ORA core (hypergeometric p-value + BH). clusterProfiler has no eFDR — the
        eFDR is covered by the cross-language gold-standard parity instead.
      </p>

      <p className="cite">Detail: VALIDATION.md · clusterProfiler 4.20.0 · Turek et al., BMC Bioinformatics 2024, 25:334.</p>
    </aside>
  );
}
