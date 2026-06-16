export type InputKind = 'gmt' | 'target' | 'background' | 'contrasts';

const HELP: Record<InputKind, { title: string; body: React.ReactNode }> = {
  gmt: {
    title: 'Ontology (GMT)',
    body: (
      <>
        <p>The <strong>ontology</strong> defines the gene-set categories (ontology terms) that mulea tests for over-representation — e.g. GO Biological Processes, KEGG pathways, or transcription-factor target sets.</p>
        <h4>Format — GMT (tab-separated)</h4>
        <p>One term per line. Each line is:</p>
        <pre>term_id&#9;term_name&#9;gene1&#9;gene2&#9;gene3 …</pre>
        <ul>
          <li><strong>Fields are separated by TAB</strong> (not spaces or commas).</li>
          <li>Column 1 = term ID, column 2 = term name, columns 3+ = the member genes.</li>
          <li>Gene symbols must match those in your target/background lists.</li>
        </ul>
        <p className="muted">Get GMT files from MSigDB, the mulea ontology collection (27 organisms), or export your own. The bundled <strong>★ Load E. coli example</strong> fills a valid GMT for you.</p>
      </>
    ),
  },
  target: {
    title: 'Target genes',
    body: (
      <>
        <p>Your <strong>genes of interest</strong> — the foreground list to test for enrichment (e.g. differentially expressed genes from an experiment).</p>
        <h4>Format</h4>
        <ul>
          <li><strong>One gene symbol per line.</strong></li>
          <li>Symbols must match the genes used in the ontology (GMT) and be a subset of the background.</li>
          <li>Genes not present in the background are dropped (you'll see a warning).</li>
        </ul>
        <p className="muted">mulea counts how many target genes fall in each ontology term vs. how many would be expected by chance from the background.</p>
      </>
    ),
  },
  contrasts: {
    title: 'Contrasts',
    body: (
      <>
        <p>In <strong>multi-contrast</strong> mode you compare several target gene lists against one shared ontology + background. Each list is a <strong>contrast</strong> (e.g. a time point, treatment, or cell type); mulea runs the same enrichment per contrast and shows them side-by-side on a dot plot.</p>
        <h4>Format</h4>
        <p><strong>Paste</strong> — label each contrast with a <code>&gt;label</code> line, then its genes (one per line):</p>
        <pre>&gt;condition A&#10;geneX&#10;geneY&#10;&gt;condition B&#10;geneZ …</pre>
        <p><strong>Upload</strong> — drop one <code>.txt</code> file per contrast (the file name becomes the contrast label).</p>
        <ul>
          <li>Provide <strong>at least two</strong> contrasts to compare.</li>
          <li>All contrasts share the same ontology and background.</li>
        </ul>
      </>
    ),
  },
  background: {
    title: 'Background genes',
    body: (
      <>
        <p>The <strong>statistical universe</strong> — every gene that could have been detected/selected (e.g. all genes expressed in your assay). It defines the population the target was drawn from.</p>
        <h4>Format</h4>
        <ul>
          <li><strong>One gene symbol per line.</strong></li>
          <li>Should be a superset of your target list.</li>
          <li>A well-chosen background is essential: an inappropriate one biases the p-values and the eFDR.</li>
        </ul>
        <p className="muted">For the bundled example this is the full E. coli gene set; for your own data use the genes assayed on your platform.</p>
      </>
    ),
  },
};

/** Right-panel detailed explanation of an input, shown when its "?" is clicked. */
export function InputHelp({ which, onClose }: { which: InputKind; onClose: () => void }) {
  const h = HELP[which];
  return (
    <div className="input-help" role="region" aria-label={`About: ${h.title}`}>
      <div className="input-help-head">
        <h2>{h.title}</h2>
        <button type="button" onClick={onClose}>← Back to results</button>
      </div>
      <div className="input-help-body">{h.body}</div>
    </div>
  );
}
