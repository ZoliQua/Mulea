/** Intro "about" card — what mulea does + how to use it (shown centered above the workspace). */
export function IntroAbout({ onClose }: { onClose?: () => void }) {
  return (
    <section className="intro-card intro-top-card" aria-label="About mulea">
      {onClose && (
        <button type="button" className="intro-close" aria-label="Dismiss intro" title="Dismiss" onClick={onClose}>×</button>
      )}
      <h3>What it does</h3>
      <ul>
        <li>Finds <strong>ontology terms</strong> over-represented in your gene set (<strong>ORA</strong>), or enriched along a ranked list (<strong>GSEA</strong>).</li>
        <li>Corrects for multiple testing — <strong>eFDR</strong> (empirical FDR), <strong>BH</strong>, or <strong>Bonferroni</strong>; cross-checked against clusterProfiler &amp; fgsea.</li>
        <li>Runs <strong>entirely in your browser</strong>: private, offline-capable, nothing uploaded.</li>
      </ul>
      <h3>How to use it</h3>
      <ol>
        <li>Provide an <strong>ontology (GMT)</strong> — paste, upload, or <strong>browse the muleaData catalog</strong> (877 GMT, 27 organisms) — plus your genes.</li>
        <li>Pick <strong>ORA</strong> (target + background) or <strong>GSEA (ranked)</strong> (a gene–score list); for eFDR choose <strong>Exact</strong> or <strong>Resampling</strong>.</li>
        <li>Press <strong>Run ▶</strong>, then explore the figures, click a term to drill down (with an approximate eFDR confidence interval), and share or export.</li>
      </ol>
    </section>
  );
}

/** Citation card — shown in the left rail. */
export function IntroCite() {
  return (
    <section className="intro-card intro-cite-card" aria-label="How to cite">
      <h3>How to cite</h3>
      <p className="intro-cite">
        Turek et al. <em>mulea: an R package for enrichment analysis using multiple ontologies and empirical false discovery rate.</em> BMC Bioinformatics 2024, 25:334.
      </p>
    </section>
  );
}
