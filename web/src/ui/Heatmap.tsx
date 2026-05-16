import type { AnalysisResult } from '../appTypes.ts';
import { heatmapLayout } from '../heatmap.ts';
import { scoreToColor } from './colorScale.ts';

export function Heatmap(props: { result: AnalysisResult; onSelect?: (id: string) => void }) {
  const layout = heatmapLayout(props.result, { topN: 30, cellW: 12, cellH: 16, threshold: 0.05 });
  if (layout.rows.length === 0) return <p className="muted">No significant terms to show.</p>;
  return (
    <svg className="heatmap" width={layout.width} height={layout.height} role="img" aria-label="Heatmap of terms by hit genes">
      {layout.rows.map((r) => (
        <text key={r.id} x={layout.labelW - 4} y={r.y + layout.cellH * 0.7} textAnchor="end" fontSize={10}
          style={{ cursor: 'pointer' }} onClick={() => props.onSelect?.(r.id)}>{r.label}</text>
      ))}
      {layout.cells.filter((c) => c.on).map((c) => (
        <rect key={`${c.r}-${c.c}`} x={layout.cols[c.c]!.x} y={layout.rows[c.r]!.y}
          width={layout.cellW - 1} height={layout.cellH - 1} fill={scoreToColor(c.score)} />
      ))}
    </svg>
  );
}
