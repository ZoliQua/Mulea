import { useMemo, useState } from 'react';
import { parseGmt } from '../io.ts';
import { filterOntology } from '../ontology.ts';
import { parseRanked, gsea, type GseaRow, type RankedItem, type ScoreType } from '../gsea.ts';
import { RunningEsPlot } from './RunningEsPlot.tsx';

const BASE = import.meta.env.BASE_URL;

/** Ranked-list GSEA view: GMT + (gene, score) list → weighted-KS ES, NES, permutation p. */
export function GseaView() {
  const [gmtText, setGmtText] = useState('');
  const [rankedText, setRankedText] = useState('');
  const [permutations, setPermutations] = useState(1000);
  const [seed, setSeed] = useState(42);
  const [gseaParam, setGseaParam] = useState(1);
  const [scoreType, setScoreType] = useState<ScoreType>('std');
  const [computing, setComputing] = useState(false);
  const [rows, setRows] = useState<GseaRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const ranked: RankedItem[] = useMemo(() => parseRanked(rankedText), [rankedText]);

  const loadExample = async () => {
    const [g, r] = await Promise.all([
      fetch(`${BASE}examples/ecoli_regulondb.gmt`).then((x) => x.text()),
      fetch(`${BASE}examples/ecoli_ranked.tsv`).then((x) => x.text()),
    ]);
    setGmtText(g); setRankedText(r); setRows(null); setSelected(null); setError(null);
  };

  const run = () => {
    setError(null);
    const gmt = filterOntology(parseGmt(gmtText), 3, 400);
    const rk = parseRanked(rankedText);
    if (gmt.length === 0) { setError('No ontology terms passed the size filter — check the GMT.'); return; }
    if (rk.length === 0) { setError('No ranked genes parsed — expected lines of "gene<TAB>score".'); return; }
    setComputing(true); setRows(null); setSelected(null);
    setTimeout(() => {
      try {
        const res = gsea(gmt, rk, { permutations, seed, gseaParam, scoreType }).sort((a, b) => Math.abs(b.nes) - Math.abs(a.nes));
        setRows(res);
      } catch (e) { setError(String(e)); }
      setComputing(false);
    }, 20);
  };

  const selRow = rows?.find((r) => r.ontology_id === selected) ?? null;
  const selGenes = selRow ? (filterOntology(parseGmt(gmtText), 3, 400).find((t) => t.ontology_id === selected)?.list_of_values ?? []) : [];

  return (
    <div className="gsea-view">
      <div className="gsea-inputs">
        <div className="input-head"><strong>Ontology (GMT)</strong></div>
        <textarea value={gmtText} onChange={(e) => setGmtText(e.target.value)} rows={4} placeholder="term_id&#9;name&#9;gene1&#9;gene2 …" />
        <div className="input-head"><strong>Ranked list</strong> <span className="muted">gene ⇥ score (e.g. logFC)</span></div>
        <textarea value={rankedText} onChange={(e) => setRankedText(e.target.value)} rows={4} placeholder="geneA&#9;2.31&#10;geneB&#9;-1.07 …" />
        <div className="gsea-controls">
          <label style={{ fontSize: 12 }}>permutations <input type="number" min={100} step={100} value={permutations}
            onChange={(e) => setPermutations(Math.max(100, Math.floor(Number(e.target.value) || 1000)))} style={{ width: 88 }} /></label>
          <label style={{ fontSize: 12 }}>seed <input type="number" value={seed}
            onChange={(e) => setSeed(Math.floor(Number(e.target.value) || 42))} style={{ width: 64 }} /></label>
          <label style={{ fontSize: 12 }} title="fgsea gseaParam: per-gene weight = |score|^p">weight p <input type="number" min={0} max={2} step={0.1} value={gseaParam}
            onChange={(e) => setGseaParam(Math.max(0, Number(e.target.value) || 1))} style={{ width: 56 }} /></label>
          <label style={{ fontSize: 12 }} title="fgsea scoreType">score
            <select value={scoreType} onChange={(e) => setScoreType(e.target.value as ScoreType)} style={{ marginLeft: 4 }}>
              <option value="std">two-sided</option>
              <option value="pos">enriched at top</option>
              <option value="neg">enriched at bottom</option>
            </select></label>
          <button type="button" onClick={loadExample}>Load example</button>
          <button type="button" className="run-btn" onClick={run} disabled={computing}>{computing ? 'Computing…' : 'Run GSEA'}</button>
          <span className="muted" style={{ fontSize: 12 }}>{ranked.length} ranked genes</span>
        </div>
        {error && <div className="error-card"><span className="error-icon">⚠</span><div><strong>Cannot run</strong><p>{error}</p></div></div>}
      </div>

      {rows && (
        <div className="gsea-results">
          <span className="summary-pill">{rows.filter((r) => r.adjusted_p_value < 0.05).length} significant terms · BH &lt; 0.05 · {permutations} perms</span>
          <div className="gsea-table-wrap">
            <table className="gsea-table">
              <thead><tr><th>Term</th><th>size</th><th>ES</th><th>NES</th><th>p</th><th>adj p</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.ontology_id} className={r.ontology_id === selected ? 'sel' : ''} onClick={() => setSelected(r.ontology_id)}>
                    <td>{r.ontology_name || r.ontology_id}</td><td>{r.size}</td>
                    <td>{r.es.toFixed(3)}</td><td>{r.nes.toFixed(3)}</td>
                    <td>{r.p_value.toExponential(1)}</td>
                    <td className={r.adjusted_p_value < 0.05 ? 'sig' : ''}>{r.adjusted_p_value.toExponential(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selRow && (
            <div className="gsea-plot">
              <div className="input-head"><strong>{selRow.ontology_name || selRow.ontology_id}</strong> <span className="muted">NES {selRow.nes.toFixed(2)} · adj p {selRow.adjusted_p_value.toExponential(1)} · {selRow.leading_edge.length} leading-edge genes</span></div>
              <RunningEsPlot termGenes={selGenes} ranked={ranked} label={selRow.ontology_id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
