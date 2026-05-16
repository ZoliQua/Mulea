import type { AnalysisResult } from '../appTypes.ts';
import { barplotLayout } from '../barplot.ts';

export function Barplot(props: { result: AnalysisResult; onSelect?: (id: string) => void; width?: number }) {
  const width = props.width ?? 460;
  const layout = barplotLayout(props.result, { topN: 20, width, rowHeight: 22, threshold: 0.05 });
  if (layout.items.length === 0) return <p className="muted">No significant terms to show.</p>;
  return (
    <svg className="barplot" width={width} height={layout.height} role="img" aria-label="Barplot of significant terms">
      {layout.items.map((it) => (
        <g key={it.id} onClick={() => props.onSelect?.(it.id)} style={{ cursor: 'pointer' }}>
          <text x={layout.plot.x - 6} y={it.y + 14} textAnchor="end" fontSize={11}>{it.label}</text>
          <rect x={layout.plot.x} y={it.y + 4} width={it.barWidth} height={14} fill="#c0392b" />
        </g>
      ))}
    </svg>
  );
}
