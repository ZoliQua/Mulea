import { useMemo, useState } from 'react';
import type { AnalysisResult } from '../appTypes.ts';
import { columnsFor, filterSignificant, isSignificant, sortRows } from '../tableView.ts';
import { DEFAULT_SETTINGS, figureVars, type FigureSettings } from '../figureSettings.ts';

export function ResultsTable(props: { result: AnalysisResult; sigOnly: boolean; onSelect?: (id: string) => void; settings?: FigureSettings }) {
  const cols = columnsFor(props.result.method);
  const defaultKey = props.result.method === 'eFDR' ? 'eFDR' : 'adjusted_p_value';
  const [sortKey, setSortKey] = useState(defaultKey);
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');

  const rows = useMemo(() => {
    const base = props.sigOnly ? filterSignificant(props.result.rows) : props.result.rows;
    return sortRows(base, sortKey, dir);
  }, [props.result, props.sigOnly, sortKey, dir]);

  const onHeader = (c: string) => {
    if (c === sortKey) setDir(dir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(c); setDir('asc'); }
  };
  const fmt = (c: string, v: unknown) =>
    v === undefined ? '' : c === 'p_value' ? Number(v).toExponential(2) : c.includes('eFDR') || c.includes('adjusted') ? Number(v).toPrecision(3) : String(v);

  const s = props.settings ?? DEFAULT_SETTINGS;
  return (
    <table className="results" style={figureVars(s)}>
      {s.titleText && <caption className="fig-title-html" style={{ captionSide: 'top', textAlign: 'left' }}>{s.titleText}</caption>}
      <thead>
        <tr>{cols.map((c) => <th key={c} onClick={() => onHeader(c)}>{c}{sortKey === c ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.ontology_id} className={isSignificant(row) ? 'sig' : ''} onClick={() => props.onSelect?.(row.ontology_id)} style={{ cursor: 'pointer' }}>
            {cols.map((c) => <td key={c}>{fmt(c, (row as unknown as Record<string, unknown>)[c])}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
