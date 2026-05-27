import type { AnalysisResult } from '../appTypes.ts';
import { lollipopLayout, fmtScore } from '../lollipop.ts';
import { DEFAULT_SETTINGS, figureVars, type FigureSettings } from '../figureSettings.ts';
import { scoreToColor } from './colorScale.ts';

const ROW = 20;

export function LollipopChart(props: { result: AnalysisResult; onSelect?: (id: string) => void; width?: number; settings?: FigureSettings }) {
  const s = props.settings ?? DEFAULT_SETTINGS;
  const titleH = s.titleText ? s.titleFontSize + 8 : 0;
  const width = (props.width ?? 460) * s.scale;
  const layout = lollipopLayout(props.result, { topN: 20, width, rowHeight: ROW, threshold: 0.05, sortOrder: s.sortOrder });
  if (layout.items.length === 0) return <p className="muted">No significant terms to plot.</p>;
  return (
    <svg className="lollipop" style={figureVars(s)} width={width} height={layout.height + titleH + 20} role="img" aria-label="Lollipop of significant terms">
      {s.titleText && <text className="fig-title" x={8} y={s.titleFontSize} fontSize={s.titleFontSize}>{s.titleText}</text>}
      <g transform={`translate(0, ${titleH})`}>
        <line x1={layout.plot.x} y1={4} x2={layout.plot.x} y2={layout.height} stroke="var(--border)" strokeWidth={1} />
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={layout.plot.x + layout.plot.width * f} y1={4} x2={layout.plot.x + layout.plot.width * f} y2={layout.height} stroke="var(--border-soft)" strokeWidth={1} />
        ))}
        {layout.items.map((it) => (
          <g key={it.id} style={{ cursor: 'pointer' }} onClick={() => props.onSelect?.(it.id)}>
            <rect x={0} y={it.y - ROW / 2} width={width} height={ROW} fill="transparent" />
            <text x={layout.plot.x - 6} y={it.y} textAnchor="end" dominantBaseline="middle">{it.label}</text>
            <line x1={layout.plot.x} y1={it.y} x2={it.x} y2={it.y} stroke="var(--muted)" opacity={0.55} strokeWidth={1.5} />
            <circle cx={it.x} cy={it.y} r={4} style={{ fill: scoreToColor(it.value) }} />
            <text className="fig-value" x={it.x + 8} y={it.y} dominantBaseline="middle">{fmtScore(it.value)}</text>
          </g>
        ))}
        <text x={8} y={layout.height + 14} fontSize={10} fill="var(--muted)">← more significant</text>
      </g>
    </svg>
  );
}
