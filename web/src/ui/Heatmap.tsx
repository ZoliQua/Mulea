import type { AnalysisResult } from '../appTypes.ts';
import { heatmapLayout } from '../heatmap.ts';
import { scoreToColor } from './colorScale.ts';
import { DEFAULT_SETTINGS, figureVars, type FigureSettings } from '../figureSettings.ts';

export function Heatmap(props: { result: AnalysisResult; onSelect?: (id: string) => void; settings?: FigureSettings }) {
  const s = props.settings ?? DEFAULT_SETTINGS;
  const titleH = s.titleText ? s.titleFontSize + 8 : 0;
  const layout = heatmapLayout(props.result, { topN: 30, cellW: 12 * s.scale, cellH: 16 * s.scale, threshold: 0.05, sortOrder: s.sortOrder });
  if (layout.rows.length === 0) return <p className="muted">No significant terms to show.</p>;
  return (
    <svg className="heatmap" style={figureVars(s)} width={layout.width} height={layout.height + titleH} role="img" aria-label="Heatmap of terms by hit genes">
      {s.titleText && <text className="fig-title" x={8} y={s.titleFontSize} fontSize={s.titleFontSize}>{s.titleText}</text>}
      <g transform={`translate(0, ${titleH})`}>
        {layout.rows.map((r) => (
          <text key={r.id} x={layout.labelW - 4} y={r.y + layout.cellH * 0.7} textAnchor="end"
            style={{ cursor: 'pointer' }} onClick={() => props.onSelect?.(r.id)}>{r.label}</text>
        ))}
        {layout.cells.filter((c) => c.on).map((c) => (
          <rect key={`${c.r}-${c.c}`} x={layout.cols[c.c]!.x} y={layout.rows[c.r]!.y}
            width={layout.cellW - 1} height={layout.cellH - 1} style={{ fill: scoreToColor(c.score) }} />
        ))}
      </g>
    </svg>
  );
}
