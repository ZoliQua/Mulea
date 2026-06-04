export function HelpDrawer(props: { open: boolean; onClose: () => void }) {
  return (
    <aside className={props.open ? 'help-drawer open' : 'help-drawer'} aria-hidden={!props.open} aria-label="How to use muleaLab">
      <button type="button" className="close" onClick={props.onClose} aria-label="Close help">×</button>
      <h2>How to use muleaLab</h2>
      <p>A client-side functional enrichment tool with empirical FDR. Everything runs in your browser — no data is uploaded, and it works offline after the first visit.</p>

      <h3>1 · Inputs</h3>
      <p>Provide an <strong>ontology</strong> (GMT: each line is a term + its genes), a <strong>target</strong> gene list (your hits), and a <strong>background</strong> gene list (the universe). The "Load example" button fills in a bundled <em>E. coli</em> RegulonDB set.</p>

      <h3>2 · Methods</h3>
      <p>Each term is tested for over-representation with the <strong>hypergeometric test</strong>. Choose a multiple-testing correction:</p>
      <ul>
        <li><strong>eFDR</strong> — resampling-based empirical false discovery rate (the method from the mulea paper); typically less conservative, so it recovers more true terms.</li>
        <li><strong>BH</strong> — Benjamini–Hochberg FDR.</li>
        <li><strong>Bonferroni</strong> — most conservative.</li>
      </ul>
      <p>A term is "significant" when its score (eFDR / adjusted p-value) is below 0.05.</p>
      <p className="muted">The hypergeometric test is <strong>one-tailed</strong>: it detects over-representation of your genes in a term, not depletion. (Ranked-list GSEA is available in the <em>mulea</em> R package.)</p>

      <h3>3 · Visualizations</h3>
      <p>Switch views with the tabs: sortable <strong>table</strong>, <strong>lollipop</strong>, <strong>bar</strong>, term–gene <strong>network</strong>, <strong>heatmap</strong>, and a <strong>Methods Venn</strong> comparing which terms are significant under eFDR vs BH vs Bonferroni. Click a term/dot to see why it is significant (its hit genes).</p>

      <h3>4 · Multi-contrast</h3>
      <p>Switch to "Multi-contrast" to compare several target lists against one shared ontology + background on a dot-plot matrix (rows = terms, columns = contrasts, dot size = gene overlap, colour = score).</p>

      <h3>5 · Reproduce, share &amp; export</h3>
      <p>"Share link" encodes the analysis into a URL that re-runs deterministically and verifies a fingerprint of the result. "Report" opens a print-ready PDF (provenance + table + figures). The app installs as a PWA and runs fully offline.</p>

      <h3>Privacy</h3>
      <p>All computation is local to your device; nothing is sent to a server.</p>

      <p className="cite">Method: Turek et al., <em>mulea</em>, BMC Bioinformatics 2024, 25:334.</p>
    </aside>
  );
}
