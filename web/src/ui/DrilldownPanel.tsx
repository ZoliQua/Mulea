import type { AnalysisResult, ResultRow } from '../appTypes.ts';
import { termDrilldown } from '../drilldown.ts';

export function DrilldownPanel(props: { row: ResultRow; meta: AnalysisResult['meta']; onClose: () => void }) {
  const d = termDrilldown(props.row, props.meta);
  return (
    <aside className="drilldown">
      <button type="button" className="close" onClick={props.onClose} aria-label="Close details">×</button>
      <h3>{d.ontology_name}</h3>
      <p>score (eFDR/adj): <strong>{d.score.toPrecision(3)}</strong> · p-value: {d.p_value.toExponential(2)}</p>
      <p>
        target overlap: {d.nrCommonWithTested}
        {d.nrCommonWithBackground !== undefined ? ` · background overlap: ${d.nrCommonWithBackground}` : ''}
        {' '}· pool size: {d.poolSize}
      </p>
      <p>hit genes ({d.hits.length}):</p>
      <div className="hits">{d.hits.join(', ') || '—'}</div>
    </aside>
  );
}
