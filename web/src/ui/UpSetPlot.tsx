import { useMemo, useState } from 'react';
import { runComparison } from '../comparison.ts';
import { upsetLayout, type UpsetSet } from '../upset.ts';
import type { RegionKey } from '../venn3.ts';
import { DEFAULT_SETTINGS, figureVars, methodVars, type FigureSettings } from '../figureSettings.ts';

interface VennInputs { gmtText: string; target: string[]; background: string[] }

const SETW = 86, COLW = 30, BAR_H = 90, ROW_H = 22, PAD = 12;
const SET_LABEL: Record<UpsetSet, string> = { efdr: 'eFDR', bh: 'BH', bonferroni: 'Bonferroni' };
const SET_VAR: Record<UpsetSet, string> = { efdr: 'var(--method-efdr)', bh: 'var(--method-bh)', bonferroni: 'var(--method-bonf)' };

export function UpSetPlot(props: { inputs: VennInputs | null; settings?: FigureSettings }) {
  const comparison = useMemo(
    () => (props.inputs ? runComparison({ ...props.inputs, minNrOfElements: 3, maxNrOfElements: 400 }) : null),
    [props.inputs],
  );
  const [selected, setSelected] = useState<RegionKey | null>(null);
  if (!comparison) return <p className="muted">Run an analysis first.</p>;
  const s = props.settings ?? DEFAULT_SETTINGS;
  const layout = upsetLayout(comparison);
  if (layout.intersections.length === 0) return <p className="muted">No overlapping significant terms.</p>;

  const maxSize = Math.max(1, ...layout.intersections.map((i) => i.size));
  const matrixTop = BAR_H + 14;
  const colX = (i: number) => SETW + i * COLW + COLW / 2;
  const dotY = (r: number) => matrixTop + r * ROW_H + ROW_H / 2;
  const vbW = SETW + layout.intersections.length * COLW + PAD;
  const vbH = matrixTop + layout.sets.length * ROW_H + PAD;
  const sel = selected ? layout.intersections.find((i) => i.key === selected) ?? null : null;

  return (
    <div className="upset" style={methodVars(s)}>
      {s.titleText && <h4 className="fig-title-html" style={{ fontSize: s.titleFontSize }}>{s.titleText}</h4>}
      <svg style={figureVars(s)} width={vbW * s.scale} height={vbH * s.scale} viewBox={`0 0 ${vbW} ${vbH}`}
        role="img" aria-label="UpSet plot of significant terms by correction method">
        {layout.sets.map((set, r) => (
          <text key={set} x={SETW - 8} y={dotY(r) + 4} textAnchor="end" style={{ fill: SET_VAR[set], fontWeight: 600 }}>{SET_LABEL[set]}</text>
        ))}
        {layout.intersections.map((it, i) => {
          const x = colX(i);
          const h = (it.size / maxSize) * (BAR_H - 16);
          const onRows = layout.sets.map((set, r) => ({ r, on: it.sets.includes(set) })).filter((m) => m.on).map((m) => m.r);
          return (
            <g key={it.key} style={{ cursor: 'pointer' }} onClick={() => setSelected(it.key)}>
              <rect x={SETW + i * COLW} y={0} width={COLW} height={vbH} fill={selected === it.key ? 'var(--accent-weak)' : 'transparent'} />
              <rect x={x - 7} y={BAR_H - h} width={14} height={h} style={{ fill: 'var(--accent)' }} />
              <text className="fig-value" x={x} y={BAR_H - h - 3} textAnchor="middle">{it.size}</text>
              {onRows.length > 1 && <line x1={x} y1={dotY(onRows[0]!)} x2={x} y2={dotY(onRows[onRows.length - 1]!)} stroke="var(--text)" strokeWidth={2} />}
              {layout.sets.map((set, r) => (
                <circle key={set} cx={x} cy={dotY(r)} r={5} style={{ fill: it.sets.includes(set) ? SET_VAR[set] : 'var(--border)' }} />
              ))}
            </g>
          );
        })}
      </svg>
      {sel && (
        <div className="venn-region">
          <strong>{sel.sets.map((x) => SET_LABEL[x]).join(' ∩ ')}</strong> ({sel.size}): {sel.ids.map((id) => comparison.names[id] ?? id).join(', ') || '—'}
        </div>
      )}
    </div>
  );
}
