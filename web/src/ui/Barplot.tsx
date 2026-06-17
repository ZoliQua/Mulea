import type { AnalysisResult } from '../appTypes.ts';
import { barplotLayout } from '../barplot.ts';
import { fmtScore } from '../lollipop.ts';
import { DEFAULT_SETTINGS, figureVars, type FigureSettings } from '../figureSettings.ts';
import { scoreToColor } from './colorScale.ts';

const ROW = 22;

export function Barplot(props: { result: AnalysisResult; onSelect?: (id: string) => void; width?: number; settings?: FigureSettings }) {
  const s = props.settings ?? DEFAULT_SETTINGS;
  const titleH = s.titleText ? s.titleFontSize + 8 : 0;
  const width = (props.width ?? 460) * s.scale;
  const layout = barplotLayout(props.result, { topN: 20, width, rowHeight: ROW, threshold: 0.05, sortOrder: s.sortOrder });
  if (layout.items.length === 0) return <p className="muted">No significant terms to show.</p>;
  return (
    <svg className="barplot" style={figureVars(s)} width={width} height={layout.height + titleH + 20} role="img" aria-label="Barplot of significant terms">
      {s.titleText && <text className="fig-title" x={8} y={s.titleFontSize} fontSize={s.titleFontSize}>{s.titleText}</text>}
      <g transform={`translate(0, ${titleH})`}>
        <line x1={layout.plot.x} y1={4} x2={layout.plot.x} y2={layout.height} stroke="var(--border)" strokeWidth={1} />
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={layout.plot.x + layout.plot.width * f} y1={4} x2={layout.plot.x + layout.plot.width * f} y2={layout.height} stroke="var(--border-soft)" strokeWidth={1} />
        ))}
        {layout.items.map((it) => (
          <g key={it.id} onClick={() => props.onSelect?.(it.id)} style={{ cursor: 'pointer' }}>
            <rect x={0} y={it.y} width={width} height={ROW} style={{ fill: 'transparent' }} />
            <text x={layout.plot.x - 6} y={it.y + 14} textAnchor="end">{it.label}</text>
            <rect x={layout.plot.x} y={it.y + 4} width={it.barWidth} height={14} rx={2} style={{ fill: scoreToColor(it.score) }} />
            <text className="fig-value" x={layout.plot.x + it.barWidth + 4} y={it.y + 14}>{fmtScore(it.score)}</text>
          </g>
        ))}
        <text x={8} y={layout.height + 14} fontSize={10} fill="var(--muted)">−log₁₀ →</text>
      </g>
    </svg>
  );
}
