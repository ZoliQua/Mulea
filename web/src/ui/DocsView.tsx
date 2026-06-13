import { useState, type ReactNode } from 'react';

const BASE = import.meta.env.BASE_URL;

/** A fenced code block in the docs. */
function Code({ lang, children }: { lang?: string; children: string }) {
  return <pre className="docs-code" data-lang={lang}><code>{children}</code></pre>;
}
function Fig({ src, alt, caption }: { src: string; alt: string; caption: string }) {
  return (
    <figure className="docs-fig">
      <img src={`${BASE}${src}`} alt={alt} />
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** Simple inline architecture diagram (no external asset). */
function ArchDiagram() {
  const box = (x: number, label: string, sub: string, fill: string) => (
    <g>
      <rect x={x} y={40} width={150} height={66} rx={10} fill={fill} stroke="#46c8b2" strokeWidth={1.2} />
      <text x={x + 75} y={66} textAnchor="middle" fontSize={14} fontWeight={700} fill="#eaf3f5">{label}</text>
      <text x={x + 75} y={86} textAnchor="middle" fontSize={11} fill="#9fb6c2">{sub}</text>
    </g>
  );
  return (
    <svg className="docs-arch" viewBox="0 0 560 180" width="100%" role="img" aria-label="muleaLab architecture">
      <rect x={180} y={140} width={200} height={30} rx={8} fill="#0d1e2b" stroke="rgba(140,185,200,0.25)" />
      <text x={280} y={159} textAnchor="middle" fontSize={12} fill="#cfe0e7">empirical FDR method (Turek et al. 2024)</text>
      {box(20, 'R · mulea', 'reference / oracle', '#10243a')}
      {box(205, 'Python · mulealab', 'headless library + CLI', '#10243a')}
      {box(390, 'Web · muleaLab', 'client-side, in-browser', '#10243a')}
      {[95, 280, 465].map((x) => <line key={x} x1={x} y1={106} x2={x === 280 ? 280 : 280} y2={140} stroke="rgba(140,185,200,0.3)" strokeDasharray="4 3" />)}
      <text x={280} y={126} textAnchor="middle" fontSize={11} fill="#46c8b2">numerical parity (checksummed gold-standard)</text>
    </svg>
  );
}

interface Section { id: string; leg: string; title: string; body: ReactNode }

const SECTIONS: Section[] = [
  // ---------------- Overview ----------------
  {
    id: 'overview', leg: 'Overview', title: 'What is muleaLab?',
    body: (
      <>
        <p><strong>muleaLab</strong> brings the <em>mulea</em> empirical-FDR (eFDR) enrichment method
          (Turek et al., <em>BMC Bioinformatics</em> 2024, 25:334) to three interoperating legs that
          share one method but no server:</p>
        <ul>
          <li><strong>R · <code>mulea</code></strong> — the original package and numerical reference.</li>
          <li><strong>Python · <code>mulealab</code></strong> — a headless NumPy/SciPy library + CLI for scripted pipelines.</li>
          <li><strong>Web · muleaLab</strong> — a 100% client-side, install-free, privacy-preserving browser tool.</li>
        </ul>
        <ArchDiagram />
        <p>The three legs are kept in <strong>numerical parity</strong>, enforced by a checksummed
          gold-standard reference and validated against independent tools (clusterProfiler, g:Profiler,
          fgsea). This documentation details <em>every</em> function of each leg.</p>
        <p className="docs-tip">Tip: pick a leg in the sidebar. Each page explains what the feature does,
          when to use it, and a runnable example.</p>
      </>
    ),
  },
  {
    id: 'overview-methods', leg: 'Overview', title: 'The methods, in brief',
    body: (
      <>
        <h4>Overrepresentation analysis (ORA)</h4>
        <p>Tests whether a target gene set overlaps an ontology term more than chance, with the
          one-tailed hypergeometric (Fisher exact) test. Also supports the depletion and two-sided tails.</p>
        <h4>Empirical FDR (eFDR)</h4>
        <p>A resampling-based false discovery rate designed for the interdependent terms of biological
          ontologies, where Bonferroni/BH over-correct. muleaLab computes it two ways: a <strong>resampling</strong>
          Monte-Carlo estimate and its <strong>deterministic analytic limit</strong> (noise-free, bit-reproducible).</p>
        <h4>GSEA</h4>
        <p>Ranked-list enrichment via the weighted Kolmogorov–Smirnov score, with a rank-based eFDR
          extended from ORA to the NES statistic.</p>
      </>
    ),
  },
  // ---------------- Web tool ----------------
  {
    id: 'web-inputs', leg: 'Web tool', title: 'Inputs & the ontology catalog',
    body: (
      <>
        <p>Provide an <strong>ontology (GMT)</strong> plus either a <strong>target + background</strong>
          gene list (ORA) or a <strong>ranked gene–score list</strong> (GSEA). Each input has a
          Paste/Upload toggle and a “?” that explains the format in a side panel.</p>
        <p>Instead of supplying a GMT you can <strong>browse the muleaData catalog</strong> — 877 prebuilt
          gene-set files across 27 organisms — with a cascading organism → ontology picker; the chosen
          file is fetched from its public repository and cached for offline reuse.</p>
        <Code lang="gmt">{`# GMT: one term per line — id <TAB> name <TAB> gene1 <TAB> gene2 …
LexA\tLexA regulon\tlexA\trecA\tuvrA\tsulA …`}</Code>
        <p className="docs-tip">“Load example” fills in a bundled <em>E. coli</em> RegulonDB set so you can try every view immediately.</p>
      </>
    ),
  },
  {
    id: 'web-ora', leg: 'Web tool', title: 'Overrepresentation (ORA)',
    body: (
      <>
        <p>Each term is tested with the hypergeometric test; pick a multiple-testing correction in the
          top bar: <strong>eFDR</strong>, <strong>BH</strong> or <strong>Bonferroni</strong>. A term is
          “significant” when its score is below 0.05.</p>
        <h4>Tail / direction</h4>
        <p>For BH/Bonferroni a <strong>tail</strong> selector chooses <em>over-representation</em>
          (default), <em>depletion</em> (P(X≤k)) or <em>two-sided</em> (the minimum-likelihood
          hypergeometric, equal to R’s <code>fisher.test</code>). eFDR is always over-representation.</p>
        <h4>Effect size</h4>
        <p>Click a term to open the drilldown: it shows the <strong>fold-enrichment</strong> (k/n)/(K/N),
          the <strong>odds ratio with a 95% CI</strong> (Haldane–Anscombe corrected), the overlap counts
          and the hit genes — effect size, not only significance.</p>
      </>
    ),
  },
  {
    id: 'web-efdr', leg: 'Web tool', title: 'Empirical FDR & convergence',
    body: (
      <>
        <p>eFDR runs in two modes (top bar → <strong>eFDR</strong>):</p>
        <ul>
          <li><strong>Exact</strong> — the deterministic analytic eFDR, the S→∞ closed-form limit of the
            resampling estimator. Instant, noise-free, bit-reproducible. The ∑ icon opens its derivation.</li>
          <li><strong>Resampling</strong> — the Monte-Carlo estimate (a WebAssembly core, seedable),
            reproducing the paper’s procedure. Configure <em>steps</em> and <em>seed</em>; 🎲 randomizes.</li>
        </ul>
        <p>The Monte-Carlo error falls at the central-limit rate <code>O(1/√steps)</code> toward the
          analytic value; the drilldown also reports an approximate Poisson 95% CI per term. The clamp
          (“clamp ≤1”) can be turned off to match base-R’s raw ratio.</p>
        <Fig src="efdr-convergence.svg" alt="eFDR Monte-Carlo to analytic convergence, log-log slope -0.5"
          caption="Monte-Carlo eFDR converges to the deterministic analytic value at the predicted O(1/√steps) rate (fitted slope −0.52)." />
      </>
    ),
  },
  {
    id: 'web-gsea', leg: 'Web tool', title: 'Ranked-list GSEA',
    body: (
      <>
        <p>Switch to <strong>GSEA (ranked)</strong> and supply a gene–score list (e.g. logFC). muleaLab
          computes the weighted-KS <strong>enrichment score</strong> (exact match to <code>fgsea::calcGseaStat</code>),
          the <strong>NES</strong>, a permutation <strong>p-value</strong>, and the mulea rank-based
          <strong> eFDR</strong> extended to the NES statistic — shown together in the results table.</p>
        <p>The <strong>score type</strong> (two-sided / enriched at top / at bottom) and the
          <strong> weighting exponent</strong> are configurable. Click a term for the classic
          <strong> running-enrichment plot</strong> with its leading-edge genes.</p>
        <h4>Multi-contrast GSEA</h4>
        <p>In Multi-contrast mode, switch ORA→GSEA to compare several ranked lists against one ontology on
          a dot-plot (colour = eFDR, dot size = leading edge, blue outline = negative NES).</p>
      </>
    ),
  },
  {
    id: 'web-viz', leg: 'Web tool', title: 'Visualizations',
    body: (
      <>
        <p>Results are shown as a sortable <strong>table</strong> and as <strong>lollipop</strong>,
          <strong> bar</strong>, term–gene <strong>network</strong> and <strong>heatmap</strong> plots,
          plus a <strong>Methods Venn / UpSet</strong> comparing which terms are significant under eFDR
          vs BH vs Bonferroni on your own data, and the multi-contrast <strong>dot-plot</strong>. Every
          figure exports as SVG; a print-ready <strong>Report</strong> bundles the table and figures.</p>
      </>
    ),
  },
  {
    id: 'web-repro', leg: 'Web tool', title: 'Reproducibility, privacy & validation',
    body: (
      <>
        <p>Any analysis serialises into a deterministic <strong>capsule</strong> — inputs, parameters,
          ontology and seed encoded into a shareable link that re-runs and verifies a fingerprint of the
          result. The app installs as a <strong>PWA</strong> and runs fully offline; nothing is uploaded.</p>
        <p>The overrepresentation core is validated against independent tools: it matches
          <strong> clusterProfiler</strong> to floating-point precision (E. coli, human, mouse), and is
          concordant with <strong>g:Profiler</strong> (different g:SCS correction). The ✓ button opens
          this validation in-app.</p>
        <Fig src="validation-cp.svg" alt="muleaLab vs clusterProfiler p-value scatter on the y=x line"
          caption="muleaLab’s hypergeometric p-values are floating-point identical to clusterProfiler (every point on y = x)." />
      </>
    ),
  },
  // ---------------- Python ----------------
  {
    id: 'py-install', leg: 'Python package', title: 'Install & overview',
    body: (
      <>
        <p>The <code>mulealab</code> Python companion mirrors the web tool for scripted, reproducible
          pipelines (NumPy/SciPy), in numerical parity with the R package.</p>
        <Code lang="bash">{`pip install mulealab     # requires Python ≥ 3.10`}</Code>
        <Code lang="python">{`from mulealab import (read_gmt, write_gmt, filter_ontology, ora,
                      set_based_enrichment_test, gsea,
                      hypergeometric_pvalue, p_adjust, effect_size)`}</Code>
      </>
    ),
  },
  {
    id: 'py-io', leg: 'Python package', title: 'GMT I/O & filtering',
    body: (
      <>
        <p><code>read_gmt</code> / <code>write_gmt</code> parse and write the GMT format to/from a pandas
          DataFrame (columns <code>ontology_id, ontology_name, list_of_values</code>);
          <code> filter_ontology</code> drops ill-sized terms (strict <code>3 &lt; size &lt; 400</code> by default).</p>
        <Code lang="python">{`gmt = read_gmt("ontology.gmt")
gmt = filter_ontology(gmt, min_nr_of_elements=3, max_nr_of_elements=400)
write_gmt(gmt, "filtered.gmt")`}</Code>
      </>
    ),
  },
  {
    id: 'py-ora', leg: 'Python package', title: 'ora() — overrepresentation',
    body: (
      <>
        <p>Hypergeometric ORA returning a tidy DataFrame. Supports the correction method, the
          <code> direction</code> (over/under/two-sided), effect-size columns, and the optional eFDR clamp.</p>
        <Code lang="python">{`# BH-corrected, two-sided, with effect size columns
res = ora(gmt, target, background,
          p_value_adjustment_method="BH", direction="two-sided")
# columns: ontology_id, ontology_name, p_value, adjusted_p_value,
#          direction, fold_enrichment, log_odds_ratio, or_ci_low, or_ci_high

# empirical FDR — exact (analytic) or resampling (Monte-Carlo)
efdr = ora(gmt, target, background,
           p_value_adjustment_method="eFDR",
           efdr_mode="resampling", number_of_permutations=10000)`}</Code>
      </>
    ),
  },
  {
    id: 'py-efdr', leg: 'Python package', title: 'set_based_enrichment_test() — eFDR engine',
    body: (
      <>
        <p>The eFDR engine directly. <code>mode="exact"</code> is the analytic limit;
          <code> mode="mc"</code> the Monte-Carlo estimate. <code>clamp=False</code> returns the raw
          rExp/rObs ratio (base-R match).</p>
        <Code lang="python">{`res = set_based_enrichment_test(
    gmt, element_names=target, background_element_names=background,
    mode="resampling", number_of_permutations=10000, random_seed=42,
    clamp=True)`}</Code>
      </>
    ),
  },
  {
    id: 'py-gsea', leg: 'Python package', title: 'gsea() — ranked-list GSEA',
    body: (
      <>
        <p>Weighted-KS ES (exact vs <code>fgsea::calcGseaStat</code>), NES, a permutation p-value, the
          rank-based eFDR, configurable <code>score_type</code>/<code>gsea_param</code>, and the
          leading edge — NumPy-vectorised.</p>
        <Code lang="python">{`# ranked: DataFrame with columns [gene, score] (e.g. logFC)
res = gsea(gmt, ranked, permutations=1000, seed=42,
           score_type="std", gsea_param=1)
# columns: ontology_id, ontology_name, size, es, nes,
#          p_value, adjusted_p_value, efdr, leading_edge`}</Code>
      </>
    ),
  },
  {
    id: 'py-stats', leg: 'Python package', title: 'Statistics helpers',
    body: (
      <>
        <p>Lower-level building blocks, all R-parity tested:</p>
        <Code lang="python">{`hypergeometric_pvalue(k, m, N, n, direction="over")  # over / under / two-sided
p_adjust(pvalues, method="BH")                       # BH or bonferroni
effect_size(k, K, N, n)  # → fold_enrichment, log_odds_ratio, or_ci_low, or_ci_high`}</Code>
      </>
    ),
  },
  {
    id: 'py-cli', leg: 'Python package', title: 'Command-line interface',
    body: (
      <>
        <p>The <code>mulealab</code> entry point lands on your PATH:</p>
        <Code lang="bash">{`mulealab ora ontology.gmt target.txt background.txt --method BH
mulealab gsea ontology.gmt ranked.tsv --permutations 1000 --seed 42`}</Code>
        <p>Each prints the result table as CSV to stdout.</p>
      </>
    ),
  },
  // ---------------- R ----------------
  {
    id: 'r-install', leg: 'R package', title: 'Install & overview',
    body: (
      <>
        <p>The original <code>mulea</code> R package is the reference implementation; ranked-list GSEA is
          pulled from Bioconductor’s <code>fgsea</code>.</p>
        <Code lang="r">{`if (!requireNamespace("BiocManager", quietly = TRUE)) install.packages("BiocManager")
BiocManager::install("fgsea")          # GSEA dependency
install.packages("mulea")              # from CRAN`}</Code>
        <p>Exported functions: <code>read_gmt</code>, <code>write_gmt</code>, <code>list_to_gmt</code>,
          <code> filter_ontology</code>, <code>ora</code>, <code>gsea</code>, <code>run_test</code>,
          <code> reshape_results</code>, and the <code>plot_*</code> family.</p>
      </>
    ),
  },
  {
    id: 'r-ora', leg: 'R package', title: 'ORA: ora() → run_test() → reshape_results()',
    body: (
      <>
        <p>mulea builds a model object, runs it, then tidies the results for plotting.</p>
        <Code lang="r">{`gmt   <- read_gmt("ontology.gmt")
gmt_f <- filter_ontology(gmt, min_nr_of_elements = 3, max_nr_of_elements = 400)

ora_model <- ora(gmt = gmt_f,
                 element_names = target,
                 background_element_names = background,
                 p_value_adjustment_method = "eFDR",   # or "BH" / "bonferroni"
                 number_of_permutations = 10000)
ora_results <- run_test(ora_model)

df <- reshape_results(model = ora_model, model_results = ora_results,
                      p_value_type_colname = "eFDR")`}</Code>
      </>
    ),
  },
  {
    id: 'r-gsea', leg: 'R package', title: 'GSEA: gsea() → run_test()',
    body: (
      <>
        <p>For a ranked gene list, supply scores (e.g. logFC) and a score type.</p>
        <Code lang="r">{`gsea_model <- gsea(gmt = gmt_f,
                   element_names = ranked_genes,
                   element_scores = ranked_scores,
                   element_score_type = "std",   # "std" / "pos" / "neg"
                   number_of_permutations = 10000)
gsea_results <- run_test(gsea_model)`}</Code>
      </>
    ),
  },
  {
    id: 'r-plots', leg: 'R package', title: 'Plots',
    body: (
      <>
        <p>The reshaped results feed the plotting functions:</p>
        <Code lang="r">{`plot_lollipop(reshaped_results = df, ontology_id_colname = "ontology_id")
plot_barplot (reshaped_results = df, ontology_id_colname = "ontology_id")
plot_graph   (reshaped_results = df, ontology_id_colname = "ontology_id")  # term–gene network
plot_heatmap (reshaped_results = df, ontology_id_colname = "ontology_id")`}</Code>
      </>
    ),
  },
];

const LEG_ORDER = ['Overview', 'Web tool', 'Python package', 'R package'];

export function DocsView({ onHome, onStart }: { onHome: () => void; onStart: () => void }) {
  const [active, setActive] = useState('overview');
  const [query, setQuery] = useState('');
  const sec = SECTIONS.find((s) => s.id === active) ?? SECTIONS[0]!;
  const q = query.trim().toLowerCase();
  const match = (s: Section) => !q || s.title.toLowerCase().includes(q) || s.leg.toLowerCase().includes(q);

  return (
    <div className="docs-view" data-theme="dark">
      <header className="docs-top">
        <button type="button" className="home-btn" onClick={onHome}>← Home</button>
        <img className="docs-logo" src={`${BASE}mulea-logo.png`} alt="" height={22} />
        <strong>Documentation</strong>
        <span className="spacer" />
        <input className="docs-search" placeholder="Filter…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Filter sections" />
        <button type="button" className="run-btn" onClick={onStart}>Open the tool ▶</button>
      </header>
      <div className="docs-body">
        <nav className="docs-nav" aria-label="Documentation sections">
          {LEG_ORDER.map((leg) => {
            const items = SECTIONS.filter((s) => s.leg === leg && match(s));
            if (items.length === 0) return null;
            return (
              <div key={leg} className="docs-nav-group">
                <div className="docs-nav-leg">{leg}</div>
                {items.map((s) => (
                  <button key={s.id} type="button"
                    className={s.id === active ? 'docs-nav-item active' : 'docs-nav-item'}
                    onClick={() => setActive(s.id)}>{s.title}</button>
                ))}
              </div>
            );
          })}
        </nav>
        <main className="docs-content">
          <div className="docs-crumb">{sec.leg}</div>
          <h2>{sec.title}</h2>
          {sec.body}
        </main>
      </div>
    </div>
  );
}
