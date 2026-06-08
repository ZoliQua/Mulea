export function HelpDrawer(props: { open: boolean; onClose: () => void }) {
  return (
    <aside className={props.open ? 'help-drawer open' : 'help-drawer'} aria-hidden={!props.open} aria-label="How to use muleaLab">
      <button type="button" className="close" onClick={props.onClose} aria-label="Close help">×</button>
      <h2>How to use muleaLab</h2>
      <p>A client-side functional enrichment tool: set-based <strong>over-representation (ORA)</strong> and ranked-list <strong>GSEA</strong>, with an empirical FDR. Everything runs in your browser — no data is uploaded, and it works offline after the first visit.</p>

      <h3>1 · Inputs</h3>
      <p>Provide an <strong>ontology</strong> (GMT: each line is a term + its genes), a <strong>target</strong> gene list (your hits), and a <strong>background</strong> gene list (the universe). The "Load example" button fills in a bundled <em>E. coli</em> RegulonDB set.</p>
      <p>You can also <strong>browse the muleaData catalog</strong> directly — 877 prebuilt GMT across 27 organisms, fetched on demand — instead of pasting a GMT. For GSEA, provide a <strong>ranked gene–score list</strong> (e.g. logFC) in place of target + background.</p>

      <h3>2 · Methods</h3>
      <p>Each term is tested for over-representation with the <strong>hypergeometric test</strong>. Choose a multiple-testing correction:</p>
      <ul>
        <li><strong>eFDR</strong> — resampling-based empirical false discovery rate (the method from the mulea paper); typically less conservative, so it recovers more true terms.</li>
        <li><strong>BH</strong> — Benjamini–Hochberg FDR.</li>
        <li><strong>Bonferroni</strong> — most conservative.</li>
      </ul>
      <p>A term is "significant" when its score (eFDR / adjusted p-value) is below 0.05. For <strong>resampling eFDR</strong>, the drilldown also shows an approximate Poisson Monte-Carlo <strong>95% confidence interval</strong>. The ORA p-value is validated against <strong>clusterProfiler</strong> to machine precision.</p>
      <p className="muted">The hypergeometric test is <strong>one-tailed</strong>: it detects over-representation, not depletion.</p>

      <h3>3 · Ranked-list GSEA</h3>
      <p>Switch to <strong>GSEA (ranked)</strong> for a gene–score list. muleaLab computes the weighted Kolmogorov–Smirnov <strong>enrichment score</strong> (an exact match to <strong>fgsea</strong>), the <strong>NES</strong> and a permutation <strong>p-value</strong>, and draws the classic running-enrichment plot with leading-edge genes. The <strong>score type</strong> (two-sided / enriched at top / at bottom) and the <strong>weighting exponent</strong> are configurable. ES is exact; the p-value is a seeded permutation null (tolerance-parity with fgsea's multilevel p).</p>

      <h3>4 · Visualizations</h3>
      <p>Switch views with the tabs: sortable <strong>table</strong>, <strong>lollipop</strong>, <strong>bar</strong>, term–gene <strong>network</strong>, <strong>heatmap</strong>, and a <strong>Methods Venn</strong> comparing which terms are significant under eFDR vs BH vs Bonferroni. Click a term/dot to see why it is significant (its hit genes).</p>

      <h3>5 · Multi-contrast</h3>
      <p>Switch to "Multi-contrast" to compare several target lists against one shared ontology + background on a dot-plot matrix (rows = terms, columns = contrasts, dot size = gene overlap, colour = score).</p>

      <h3>6 · Reproduce, share &amp; export</h3>
      <p>"Share link" encodes the analysis into a URL that re-runs deterministically and verifies a fingerprint of the result. "Report" opens a print-ready PDF (provenance + table + figures). The app installs as a PWA and runs fully offline.</p>

      <h3>Privacy</h3>
      <p>All computation is local to your device; nothing is sent to a server.</p>

      <p className="cite">Method: Turek et al., <em>mulea</em>, BMC Bioinformatics 2024, 25:334.</p>
    </aside>
  );
}
