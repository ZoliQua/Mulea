import type { AnalysisResult } from '../appTypes.ts';
import { heatmapLayout } from '../heatmap.ts';
import { scoreToColor } from './colorScale.ts';
import { fmtScore } from '../lollipop.ts';
import { DEFAULT_SETTINGS, figureVars, type FigureSettings } from '../figureSettings.ts';

export function Heatmap(props: { result: AnalysisResult; onSelect?: (id: string) => void; settings?: FigureSettings }) {
  const s = props.settings ?? DEFAULT_SETTINGS;
  const titleH = s.titleText ? s.titleFontSize + 8 : 0;
  const layout = heatmapLayout(props.result, { topN: 30, cellW: 12 * s.scale, cellH: 16 * s.scale, threshold: 0.05, sortOrder: s.sortOrder });
  if (layout.rows.length === 0) return <p className="muted">No significant terms to show.</p>;
  const select = (id: string) => props.onSelect?.(id);
  return (
    <svg className="heatmap" style={figureVars(s)} width={layout.width} height={layout.height + titleH} role="img" aria-label="Heatmap of terms by hit genes">
      {s.titleText && <text className="fig-title" x={8} y={s.titleFontSize} fontSize={s.titleFontSize}>{s.titleText}</text>}
      <g transform={`translate(0, ${titleH})`}>
        {layout.cols.map((col) => (
          <text key={col.gene} className="fig-value" x={col.x + layout.cellW / 2} y={layout.colLabelH - 4}
            transform={`rotate(-45 ${col.x + layout.cellW / 2} ${layout.colLabelH - 4})`} textAnchor="start">{col.gene}</text>
        ))}
        {layout.rows.map((r) => (
          <g key={r.id} style={{ cursor: 'pointer' }} onClick={() => select(r.id)}>
            <text className="fig-value" x={2} y={r.y + layout.cellH * 0.7}>{fmtScore(r.score)}</text>
            <text x={layout.labelW - 4} y={r.y + layout.cellH * 0.7} textAnchor="end">{r.label}</text>
          </g>
        ))}
        {layout.cells.filter((c) => c.on).map((c) => (
          <rect key={`${c.r}-${c.c}`} x={layout.cols[c.c]!.x} y={layout.rows[c.r]!.y}
            width={layout.cellW - 1} height={layout.cellH - 1} style={{ fill: scoreToColor(c.score), cursor: 'pointer' }}
            onClick={() => select(layout.rows[c.r]!.id)} />
        ))}
      </g>
    </svg>
  );
}
