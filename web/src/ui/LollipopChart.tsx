import type { AnalysisResult } from '../appTypes.ts';
import { lollipopLayout, fmtScore } from '../lollipop.ts';
import { DEFAULT_SETTINGS, figureVars, type FigureSettings } from '../figureSettings.ts';

const ROW = 20;

export function LollipopChart(props: { result: AnalysisResult; onSelect?: (id: string) => void; width?: number; settings?: FigureSettings }) {
  const s = props.settings ?? DEFAULT_SETTINGS;
  const titleH = s.titleText ? s.titleFontSize + 8 : 0;
  const width = (props.width ?? 460) * s.scale;
  const layout = lollipopLayout(props.result, { topN: 20, width, rowHeight: ROW, threshold: 0.05, sortOrder: s.sortOrder });
  if (layout.items.length === 0) return <p className="muted">No significant terms to plot.</p>;
  return (
    <svg className="lollipop" style={figureVars(s)} width={width} height={layout.height + titleH} role="img" aria-label="Lollipop of significant terms">
      {s.titleText && <text className="fig-title" x={8} y={s.titleFontSize} fontSize={s.titleFontSize}>{s.titleText}</text>}
      <g transform={`translate(0, ${titleH})`}>
        {layout.items.map((it) => (
          <g key={it.id} style={{ cursor: 'pointer' }} onClick={() => props.onSelect?.(it.id)}>
            <rect x={0} y={it.y - ROW / 2} width={width} height={ROW} fill="transparent" />
            <text x={layout.plot.x - 6} y={it.y} textAnchor="end" dominantBaseline="middle">{it.label}</text>
            <line x1={layout.plot.x} y1={it.y} x2={it.x} y2={it.y} strokeWidth={1} />
            <circle cx={it.x} cy={it.y} r={4} />
            <text className="fig-value" x={it.x + 8} y={it.y} dominantBaseline="middle">{fmtScore(it.value)}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
