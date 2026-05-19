import type { DotMatrix } from '../multiContrast.ts';
import { scoreToColor } from './colorScale.ts';

const LABEL_W = 170, COL_W = 70, ROW_H = 22, TOP_H = 96, R_MIN = 4, R_MAX = 12, PAD = 14;

export function DotPlot(props: { matrix: DotMatrix; onSelect?: (sel: { contrast: string; term: string }) => void }) {
  const { terms, contrasts, cells } = props.matrix;
  if (terms.length === 0) return <p className="muted">No significant terms in any contrast.</p>;

  const maxHits = Math.max(1, ...cells.map((c) => c.nHits));
  const radius = (n: number) => (maxHits <= 1 ? R_MAX : R_MIN + (R_MAX - R_MIN) * (n / maxHits));
  const colX = (i: number) => LABEL_W + i * COL_W + COL_W / 2;
  const rowY = (i: number) => TOP_H + i * ROW_H + ROW_H / 2;
  const cIndex = new Map(contrasts.map((c, i) => [c, i] as const));
  const tIndex = new Map(terms.map((t, i) => [t.id, i] as const));
  const width = LABEL_W + contrasts.length * COL_W + PAD;
  const height = TOP_H + terms.length * ROW_H + PAD;

  return (
    <div className="dotplot-wrap">
      <svg className="dotplot" width={width} height={height} role="img" aria-label="multi-contrast dot plot">
        {contrasts.map((c, i) => (
          <text key={c} x={colX(i)} y={TOP_H - 10} transform={`rotate(-40 ${colX(i)} ${TOP_H - 10})`} fontSize={11} textAnchor="start">{c}</text>
        ))}
        {terms.map((t, i) => (
          <text key={t.id} x={LABEL_W - 8} y={rowY(i) + 4} fontSize={11} textAnchor="end">{t.name}</text>
        ))}
        {cells.map((cell) => {
          const ci = cIndex.get(cell.contrast)!;
          const ti = tIndex.get(cell.term)!;
          return (
            <circle
              key={`${cell.term}|${cell.contrast}`}
              cx={colX(ci)} cy={rowY(ti)} r={radius(cell.nHits)}
              fill={scoreToColor(cell.score)} opacity={cell.significant ? 1 : 0.25}
              style={{ cursor: 'pointer' }}
              onClick={() => props.onSelect?.({ contrast: cell.contrast, term: cell.term })}
            >
              <title>{`${cell.term} @ ${cell.contrast}: score ${cell.score.toPrecision(3)}, ${cell.nHits} hit gene(s)`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="dotplot-legend">
        <span className="legend-title">{terms.length} term(s) × {contrasts.length} contrast(s)</span>
        <span><span className="swatch" style={{ background: scoreToColor(0.0005) }} /> score &lt; 0.001</span>
        <span><span className="swatch" style={{ background: scoreToColor(0.005) }} /> &lt; 0.01</span>
        <span><span className="swatch" style={{ background: scoreToColor(0.03) }} /> &lt; 0.05</span>
        <span>dot size = hit genes · faded = not significant</span>
      </div>
    </div>
  );
}
