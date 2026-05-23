import type { AnalysisResult } from '../appTypes.ts';
import { lollipopLayout } from '../lollipop.ts';
import { DEFAULT_SETTINGS, figureVars, type FigureSettings } from '../figureSettings.ts';

export function LollipopChart(props: { result: AnalysisResult; width?: number; settings?: FigureSettings }) {
  const s = props.settings ?? DEFAULT_SETTINGS;
  const titleH = s.titleText ? s.titleFontSize + 8 : 0;
  const width = (props.width ?? 460) * s.scale;
  const layout = lollipopLayout(props.result, { topN: 20, width, rowHeight: 20, threshold: 0.05, sortOrder: s.sortOrder });
  if (layout.items.length === 0) return <p className="muted">No significant terms to plot.</p>;
  return (
    <svg className="lollipop" style={figureVars(s)} width={width} height={layout.height + titleH} role="img" aria-label="Lollipop of significant terms">
      {s.titleText && <text className="fig-title" x={8} y={s.titleFontSize} fontSize={s.titleFontSize}>{s.titleText}</text>}
      <g transform={`translate(0, ${titleH})`}>
        {layout.items.map((it) => (
          <g key={it.id}>
            <text x={layout.plot.x - 6} y={it.y} textAnchor="end" dominantBaseline="middle">{it.label}</text>
            <line x1={layout.plot.x} y1={it.y} x2={it.x} y2={it.y} strokeWidth={1} />
            <circle cx={it.x} cy={it.y} r={4} />
          </g>
        ))}
      </g>
    </svg>
  );
}
