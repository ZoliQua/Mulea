import { useState } from 'react';

export type Pkg = 'r' | 'python';
type Tab = 'quickstart' | 'features' | 'links';

interface Block { label: string; code: string; note?: string }
interface Feature { title: string; blurb: string; code: string; note?: string }
interface PkgInfo {
  name: string;
  kind: string;
  version: string;
  tagline: string;
  quickstart: Block[];
  features: Feature[];
  cite?: string;
  links: { label: string; href: string }[];
}

const DATA: Record<Pkg, PkgInfo> = {
  r: {
    name: 'mulea',
    kind: 'R package · CRAN / Bioconductor',
    version: 'v1.1.1',
    tagline: 'The reference implementation — enrichment analysis across multiple ontologies with empirical FDR.',
    quickstart: [
      {
        label: '1 · Install',
        code: `# fgsea dependency (Bioconductor)
if (!require("BiocManager", quietly = TRUE)) install.packages("BiocManager")
BiocManager::install("fgsea")

# mulea from CRAN …
install.packages("mulea")
# … or the development version
devtools::install_github("ELTEbioinformatics/mulea")`,
        note: 'mulea pulls ranked-list GSEA from the Bioconductor package fgsea, so install that first.',
      },
      {
        label: '2 · Read & filter an ontology',
        code: `library(mulea)

# a GMT file: term_id <tab> term_name <tab> gene1 <tab> gene2 …
gmt <- read_gmt("ontology.gmt")

# keep terms of a sensible size
gmt <- filter_ontology(gmt, min_nr_of_elements = 3, max_nr_of_elements = 400)`,
        note: 'read_gmt accepts a local path or a URL (e.g. the GMT_files_for_mulea repo).',
      },
      {
        label: '3 · Over-representation analysis (with eFDR)',
        code: `ora_model <- ora(gmt = gmt,
                 element_names            = target_set,      # genes of interest
                 background_element_names = background_set,   # the gene universe
                 p_value_adjustment_method = "eFDR",         # or "BH" / "bonferroni"
                 number_of_permutations    = 10000)

ora_results <- run_test(ora_model)                          # run it`,
        note: 'ora builds the model; run_test executes it. With "eFDR" the background is resampled to estimate the empirical FDR.',
      },
      {
        label: '4 · Reshape & visualise',
        code: `df <- reshape_results(model = ora_model,
                      model_results = ora_results,
                      p_value_type_colname = "eFDR")

plot_lollipop(reshaped_results = df, ontology_id_colname = "ontology_id")
# also: plot_barplot() · plot_graph() · plot_heatmap()`,
        note: 'reshape_results tidies the model + results into the long form the plot_* functions consume. For a ranked gene list use gsea() instead of ora().',
      },
    ],
    features: [
      {
        title: 'Over-representation (ORA)',
        blurb: 'Hypergeometric test per ontology term.',
        code: `ora_model <- ora(gmt, target, background,
                 p_value_adjustment_method = "BH")
ora_results <- run_test(ora_model)`,
        note: 'run_test executes the model and returns the per-term results table.',
      },
      {
        title: 'Empirical FDR',
        blurb: 'Permutation-resampled FDR — robust for dependent gene sets.',
        code: `ora_model <- ora(gmt, target, background,
                 p_value_adjustment_method = "eFDR",
                 number_of_permutations = 10000)
ora_results <- run_test(ora_model)`,
        note: 'The background is resampled number_of_permutations times to estimate the eFDR.',
      },
      {
        title: 'Ranked GSEA',
        blurb: 'Enrichment on a scored/ranked gene list (via fgsea).',
        code: `gsea_model <- gsea(gmt,
                   element_names      = ranked$gene,
                   element_scores     = ranked$logFC,
                   element_score_type = "pos",
                   number_of_permutations = 10000)
gsea_results <- run_test(gsea_model)`,
        note: 'element_score_type is "pos", "neg" or "all".',
      },
      {
        title: 'Visualisations',
        blurb: 'Lollipop, bar, network graph & heatmap from one table.',
        code: `df <- reshape_results(model = ora_model,
                      model_results = ora_results,
                      p_value_type_colname = "eFDR")
plot_lollipop(reshaped_results = df, ontology_id_colname = "ontology_id")
plot_barplot(reshaped_results = df, ontology_id_colname = "ontology_id")
plot_graph(reshaped_results = df, ontology_id_colname = "ontology_id")`,
        note: 'All plots are built from the reshaped results data frame.',
      },
      {
        title: 'Ontology I/O & filtering',
        blurb: 'Read / write GMT, build from lists, drop ill-sized terms.',
        code: `gmt <- read_gmt("ontology.gmt")          # local path or URL
gmt <- filter_ontology(gmt, min_nr_of_elements = 3,
                            max_nr_of_elements = 400)
write_gmt(gmt, "filtered.gmt")`,
        note: 'list_to_gmt() builds a GMT data frame from named gene lists.',
      },
      {
        title: 'Many ontologies & organisms',
        blurb: '27 organisms · 22 ontology types · 16 databases.',
        code: `# 879 ready-made GMTs via the Bioconductor data package
library(muleaData)
# … or download from ELTEbioinformatics/GMT_files_for_mulea`,
        note: 'Covers GO, KEGG, Reactome, transcription factors, miRNA targets, protein domains, …',
      },
    ],
    cite: 'Turek et al. mulea: an R package for enrichment analysis using multiple ontologies and empirical false discovery rate. BMC Bioinformatics 2024, 25:334.',
    links: [
      { label: 'Source + vignette (GitHub)', href: 'https://github.com/ELTEbioinformatics/mulea' },
      { label: 'Ontology GMT files (879)', href: 'https://github.com/ELTEbioinformatics/GMT_files_for_mulea' },
      { label: 'muleaData (Bioconductor)', href: 'https://bioconductor.org/packages/release/data/experiment/html/muleaData.html' },
    ],
  },
  python: {
    name: 'mulealab',
    kind: 'Python package · pip + CLI',
    version: 'v0.1.0',
    tagline: 'Headless multi-ontology enrichment — NumPy/SciPy, in numerical parity with the R package.',
    quickstart: [
      {
        label: '1 · Install',
        code: `pip install mulealab     # requires Python ≥ 3.10`,
        note: 'Pulls pandas, numpy, scipy and typer. The CLI entry point mulealab lands on your PATH.',
      },
      {
        label: '2 · Command line',
        code: `mulealab ora ontology.gmt target.txt background.txt --method BH`,
        note: 'Pass the GMT, a target gene file and a background gene file (one gene per line). --method is BH (default) or bonferroni.',
      },
      {
        label: '3 · As a library',
        code: `from mulealab import read_gmt, filter_ontology, ora

gmt = read_gmt("ontology.gmt")
gmt = filter_ontology(gmt, min_nr_of_elements=3, max_nr_of_elements=400)

# over-representation (returns a pandas DataFrame)
res = ora(gmt, target, background, p_value_adjustment_method="BH")

# empirical FDR — exact (analytic) or resampling (Monte-Carlo)
efdr = ora(gmt, target, background,
           p_value_adjustment_method="eFDR",
           efdr_mode="resampling", number_of_permutations=10000)`,
        note: 'Every function accepts/returns pandas objects.',
      },
    ],
    features: [
      {
        title: 'Over-representation (ORA)',
        blurb: 'Hypergeometric test → tidy pandas DataFrame.',
        code: `res = ora(gmt, target, background,
          p_value_adjustment_method="BH")`,
        note: 'p_value_adjustment_method: "BH", "bonferroni" or "eFDR".',
      },
      {
        title: 'Empirical FDR',
        blurb: 'eFDR — exact (analytic) or resampling (Monte-Carlo).',
        code: `res = ora(gmt, target, background,
          p_value_adjustment_method="eFDR",
          efdr_mode="resampling",
          number_of_permutations=10000)`,
        note: 'set_based_enrichment_test(gmt, target, background, mode="resampling") exposes the histogram engine directly.',
      },
      {
        title: 'Ranked GSEA',
        blurb: 'Weighted-KS enrichment score + permutation NES/p.',
        code: `from mulealab import gsea
# ranked: DataFrame [gene, score] (e.g. logFC)
res = gsea(gmt, ranked, permutations=1000, seed=42)`,
        note: 'ES & leading edge match fgsea::calcGseaStat exactly; NES/p use a seeded permutation null. CLI: mulealab gsea ontology.gmt ranked.tsv.',
      },
      {
        title: 'GMT I/O & filtering',
        blurb: 'Read / write GMT and drop ill-sized terms.',
        code: `gmt = read_gmt("ontology.gmt")
gmt = filter_ontology(gmt, min_nr_of_elements=3,
                           max_nr_of_elements=400)
write_gmt(gmt, "filtered.gmt")`,
        note: 'filter_ontology bounds are optional (keep terms strictly between them).',
      },
      {
        title: 'Command-line tool',
        blurb: 'One-shot enrichment from the shell (Typer).',
        code: `mulealab ora ontology.gmt target.txt background.txt --method BH`,
        note: '--method: BH (default) or bonferroni.',
      },
      {
        title: 'Stats building blocks',
        blurb: 'The primitives, exported for reuse.',
        code: `from mulealab import hypergeometric_pvalue, p_adjust

p   = hypergeometric_pvalue(common_in_select, common_in_pool,
                            pool_size, select_size)
adj = p_adjust(pvalues, "BH")`,
        note: 'p_adjust matches R stats::p.adjust for "BH" and "bonferroni".',
      },
      {
        title: 'R-parity tested',
        blurb: 'Numerically validated against the R package.',
        code: `pytest        # parity tests vs mulea (R) reference fixtures`,
        note: 'Deterministic ORA / BH match R exactly; eFDR agrees within Monte-Carlo tolerance.',
      },
    ],
    links: [
      { label: 'Source + tests (GitHub)', href: 'https://github.com/ELTEbioinformatics/mulea' },
    ],
  },
};

const TABS: { id: Tab; label: string }[] = [
  { id: 'quickstart', label: 'Quickstart' },
  { id: 'features', label: 'Features' },
  { id: 'links', label: 'Links' },
];

/** Tabbed package showcase (Quickstart / clickable Feature tiles / Links), shown from the landing. */
export function PackageModal({ pkg, onClose }: { pkg: Pkg; onClose: () => void }) {
  const d = DATA[pkg];
  const [tab, setTab] = useState<Tab>('quickstart');
  const [feat, setFeat] = useState<number | null>(null);
  const selectTab = (t: Tab) => { setTab(t); setFeat(null); };

  return (
    <div className="pkg-overlay" onClick={onClose} role="presentation">
      <div className="pkg-modal" role="dialog" aria-modal="true" aria-label={`${d.name} — ${d.kind}`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pkg-close" aria-label="Close" onClick={onClose}>×</button>
        <div className="pkg-head">
          <h2>{d.name} <span className="pkg-ver">{d.version}</span></h2>
          <div className="pkg-kind">{d.kind}</div>
          <p className="pkg-tagline">{d.tagline}</p>
        </div>

        <div className="pkg-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
              className={tab === t.id ? 'active' : ''} onClick={() => selectTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {tab === 'quickstart' && (
          <div className="pkg-tabpanel">
            {d.quickstart.map((b) => (
              <div key={b.label}>
                <div className="pkg-block-label">{b.label}</div>
                <pre className="pkg-code"><code>{b.code}</code></pre>
                {b.note && <p className="pkg-note">{b.note}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === 'features' && (
          <div className="pkg-tabpanel">
            {feat === null ? (
              <div className="pkg-tiles">
                {d.features.map((f, i) => (
                  <button key={f.title} type="button" className="pkg-tile" onClick={() => setFeat(i)}>
                    <span className="pkg-tile-title">{f.title}</span>
                    <span className="pkg-tile-blurb">{f.blurb}</span>
                    <span className="pkg-tile-cta">View usage →</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="pkg-feature-detail">
                <button type="button" className="pkg-back" onClick={() => setFeat(null)}>← All features</button>
                <div className="pkg-block-label">{d.features[feat]!.title}</div>
                <p className="pkg-note" style={{ marginTop: 0 }}>{d.features[feat]!.blurb}</p>
                <pre className="pkg-code"><code>{d.features[feat]!.code}</code></pre>
                {d.features[feat]!.note && <p className="pkg-note">{d.features[feat]!.note}</p>}
              </div>
            )}
          </div>
        )}

        {tab === 'links' && (
          <div className="pkg-tabpanel">
            <ul className="pkg-links">
              {d.links.map((l) => (
                <li key={l.href}><a href={l.href} target="_blank" rel="noopener noreferrer">{l.label} ↗</a></li>
              ))}
            </ul>
            {d.cite && (
              <>
                <div className="pkg-block-label">Cite</div>
                <p className="pkg-cite">{d.cite}</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
