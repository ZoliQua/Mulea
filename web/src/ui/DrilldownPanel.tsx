import type { AnalysisResult, ResultRow } from '../appTypes.ts';
import { termDrilldown } from '../drilldown.ts';

export function DrilldownPanel(props: { row: ResultRow; meta: AnalysisResult['meta']; onClose: () => void }) {
  const d = termDrilldown(props.row, props.meta);
  return (
    <aside className="drilldown">
      <button type="button" className="close" onClick={props.onClose} aria-label="Close details">×</button>
      <h3>{d.ontology_name}</h3>
      <div className="dd-grid">
        <span className="dd-key">score (eFDR/adj)</span><span className="dd-val"><strong>{d.score.toPrecision(3)}</strong></span>
        {props.row.efdrCiLow !== undefined && (
          <><span className="dd-key" title="Approximate Poisson Monte-Carlo 95% CI for the resampling eFDR">≈ 95% CI (MC)</span>
          <span className="dd-val">[{props.row.efdrCiLow.toPrecision(2)}, {props.row.efdrCiHigh!.toPrecision(2)}]</span></>
        )}
        <span className="dd-key">p-value</span><span className="dd-val">{d.p_value.toExponential(2)}</span>
        <span className="dd-key">target overlap</span><span className="dd-val">{d.nrCommonWithTested}</span>
        {d.nrCommonWithBackground !== undefined && <><span className="dd-key">background overlap</span><span className="dd-val">{d.nrCommonWithBackground}</span></>}
        <span className="dd-key">pool size</span><span className="dd-val">{d.poolSize}</span>
      </div>
      <p>hit genes ({d.hits.length}):</p>
      <div className="hits">{d.hits.length ? d.hits.map((g) => <span key={g} className="gene-pill">{g}</span>) : '—'}</div>
    </aside>
  );
}
