import type { AnalysisResult } from '../appTypes.ts';
import { barplotLayout } from '../barplot.ts';
import { fmtScore } from '../lollipop.ts';
import { DEFAULT_SETTINGS, figureVars, type FigureSettings } from '../figureSettings.ts';

const ROW = 22;

export function Barplot(props: { result: AnalysisResult; onSelect?: (id: string) => void; width?: number; settings?: FigureSettings }) {
  const s = props.settings ?? DEFAULT_SETTINGS;
  const titleH = s.titleText ? s.titleFontSize + 8 : 0;
  const width = (props.width ?? 460) * s.scale;
  const layout = barplotLayout(props.result, { topN: 20, width, rowHeight: ROW, threshold: 0.05, sortOrder: s.sortOrder });
  if (layout.items.length === 0) return <p className="muted">No significant terms to show.</p>;
  return (
    <svg className="barplot" style={figureVars(s)} width={width} height={layout.height + titleH} role="img" aria-label="Barplot of significant terms">
      {s.titleText && <text className="fig-title" x={8} y={s.titleFontSize} fontSize={s.titleFontSize}>{s.titleText}</text>}
      <g transform={`translate(0, ${titleH})`}>
        {layout.items.map((it) => (
          <g key={it.id} onClick={() => props.onSelect?.(it.id)} style={{ cursor: 'pointer' }}>
            <rect x={0} y={it.y} width={width} height={ROW} fill="transparent" />
            <text x={layout.plot.x - 6} y={it.y + 14} textAnchor="end">{it.label}</text>
            <rect x={layout.plot.x} y={it.y + 4} width={it.barWidth} height={14} />
            <text className="fig-value" x={layout.plot.x + it.barWidth + 4} y={it.y + 14}>{fmtScore(it.score)}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
