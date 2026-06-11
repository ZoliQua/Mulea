import type { GseaDotMatrix } from '../multiContrast.ts';
import { scoreToColor } from './colorScale.ts';

const LABEL_W = 170, COL_W = 70, ROW_H = 22, TOP_H = 96, R_MIN = 4, R_MAX = 12, PAD = 14;

/** Multi-contrast GSEA dot plot: colour = significance metric (eFDR/adj-p), size = leading-edge, NES in tooltip. */
export function GseaDotPlot(props: { matrix: GseaDotMatrix; onSelect?: (sel: { contrast: string; term: string }) => void }) {
  const { terms, contrasts, cells, metric } = props.matrix;
  if (terms.length === 0) return <p className="muted">No significant terms in any contrast.</p>;

  const maxLe = Math.max(1, ...cells.map((c) => c.leadingEdge));
  const radius = (n: number) => (maxLe <= 1 ? R_MAX : R_MIN + (R_MAX - R_MIN) * (n / maxLe));
  const colX = (i: number) => LABEL_W + i * COL_W + COL_W / 2;
  const rowY = (i: number) => TOP_H + i * ROW_H + ROW_H / 2;
  const cIndex = new Map(contrasts.map((c, i) => [c, i] as const));
  const tIndex = new Map(terms.map((t, i) => [t.id, i] as const));
  const width = LABEL_W + contrasts.length * COL_W + PAD;
  const height = TOP_H + terms.length * ROW_H + PAD;
  const metricLabel = metric === 'adjusted_p_value' ? 'BH adj p' : 'eFDR';

  return (
    <div className="dotplot-wrap">
      <svg className="dotplot" width={width} height={height} role="img" aria-label="multi-contrast GSEA dot plot">
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
              cx={colX(ci)} cy={rowY(ti)} r={radius(cell.leadingEdge)}
              opacity={cell.significant ? 1 : 0.25}
              style={{ fill: scoreToColor(cell.score), cursor: 'pointer', stroke: cell.nes < 0 ? '#2f6fd0' : 'none', strokeWidth: cell.nes < 0 ? 1.5 : 0 }}
              onClick={() => props.onSelect?.({ contrast: cell.contrast, term: cell.term })}
            >
              <title>{`${cell.term} @ ${cell.contrast}: NES ${cell.nes.toPrecision(3)}, ${metricLabel} ${cell.score.toPrecision(3)}, ${cell.leadingEdge} leading-edge gene(s)`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="dotplot-legend">
        <span className="legend-title">{terms.length} term(s) × {contrasts.length} contrast(s) · colour = {metricLabel}</span>
        <span><span className="swatch" style={{ background: scoreToColor(0.0005) }} /> &lt; 0.001</span>
        <span><span className="swatch" style={{ background: scoreToColor(0.03) }} /> &lt; 0.05</span>
        <span>dot size = leading-edge genes · blue outline = NES &lt; 0 · faded = not significant</span>
      </div>
    </div>
  );
}
