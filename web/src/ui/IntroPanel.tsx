/** Intro "about" card — what muleaLab does + how to use it (shown centered above the workspace). */
export function IntroAbout({ onClose }: { onClose?: () => void }) {
  return (
    <section className="intro-card intro-top-card" aria-label="About muleaLab">
      {onClose && (
        <button type="button" className="intro-close" aria-label="Dismiss intro" title="Dismiss" onClick={onClose}>×</button>
      )}
      <h3>What it does</h3>
      <ul>
        <li>Finds <strong>ontology terms</strong> (gene-set categories) over-represented in your genes of interest.</li>
        <li>Corrects for multiple testing — <strong>eFDR</strong> (empirical FDR), <strong>BH</strong>, or <strong>Bonferroni</strong>.</li>
        <li>Runs <strong>entirely in your browser</strong>: private, offline-capable, nothing uploaded.</li>
      </ul>
      <h3>How to use it</h3>
      <ol>
        <li>Provide an <strong>ontology (GMT)</strong>, your <strong>target genes</strong>, and a <strong>background</strong> — paste, upload, or hit <strong>★ Load E. coli example</strong>.</li>
        <li>Pick a <strong>correction</strong>; for eFDR choose <strong>Exact</strong> (instant) or <strong>Resampling</strong> (Monte-Carlo).</li>
        <li>Press <strong>Run ▶</strong>, then explore the table and figures, click a term to drill down, and share or export.</li>
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
