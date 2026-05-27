import { useEffect, useMemo, useState } from 'react';
import type { AnalysisResult } from '../appTypes.ts';
import { columnsFor, filterByQuery, filterSignificant, isSignificant, sortRows } from '../tableView.ts';
import { DEFAULT_SETTINGS, figureVars, type FigureSettings } from '../figureSettings.ts';
import { scoreToColor } from './colorScale.ts';
import { rowScore } from '../lollipop.ts';

export function ResultsTable(props: { result: AnalysisResult; sigOnly: boolean; onSelect?: (id: string) => void; settings?: FigureSettings }) {
  const cols = columnsFor(props.result.method);
  const defaultKey = props.result.method === 'eFDR' ? 'eFDR' : 'adjusted_p_value';
  const [sortKey, setSortKey] = useState(defaultKey);
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [query, setQuery] = useState('');
  useEffect(() => { setQuery(''); }, [props.result]); // clear a stale search when a new analysis arrives

  const rows = useMemo(() => {
    const base = props.sigOnly ? filterSignificant(props.result.rows) : props.result.rows;
    return sortRows(filterByQuery(base, query), sortKey, dir);
  }, [props.result, props.sigOnly, query, sortKey, dir]);

  const onHeader = (c: string) => {
    if (c === sortKey) setDir(dir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(c); setDir('asc'); }
  };
  const fmt = (c: string, v: unknown) =>
    v === undefined ? '' : c === 'p_value' ? Number(v).toExponential(2) : c.includes('eFDR') || c.includes('adjusted') ? Number(v).toPrecision(3) : String(v);

  const s = props.settings ?? DEFAULT_SETTINGS;
  return (
    <div className="results-wrap">
      <input className="table-search" type="search" placeholder="Search terms…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search terms" />
      <table className="results" style={figureVars(s)}>
        {s.titleText && <caption className="fig-title-html" style={{ captionSide: 'top', textAlign: 'left', fontSize: s.titleFontSize }}>{s.titleText}</caption>}
        <thead>
          <tr><th aria-hidden="true" />{cols.map((c) => <th key={c} onClick={() => onHeader(c)}>{c}{sortKey === c ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ontology_id} className={isSignificant(row) ? 'sig' : ''} onClick={() => props.onSelect?.(row.ontology_id)} style={{ cursor: 'pointer' }}>
              <td><span className="sig-dot" style={{ background: isSignificant(row) ? scoreToColor(rowScore(row)) : 'var(--border)' }} /></td>
              {cols.map((c) => <td key={c}>{fmt(c, (row as unknown as Record<string, unknown>)[c])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="muted">No matching terms.</p>}
    </div>
  );
}
