import type { AnalysisResult } from '../appTypes.ts';
import { lollipopLayout } from '../lollipop.ts';

export function LollipopChart(props: { result: AnalysisResult; width?: number }) {
  const width = props.width ?? 460;
  const layout = lollipopLayout(props.result, { topN: 20, width, rowHeight: 20, threshold: 0.05 });
  if (layout.items.length === 0) return <p className="muted">No significant terms to plot.</p>;
  return (
    <svg className="lollipop" width={width} height={layout.height} role="img" aria-label="Lollipop of significant terms">
      {layout.items.map((it) => (
        <g key={it.id}>
          <text x={layout.plot.x - 6} y={it.y} textAnchor="end" dominantBaseline="middle" fontSize={11}>{it.label}</text>
          <line x1={layout.plot.x} y1={it.y} x2={it.x} y2={it.y} stroke="#888" strokeWidth={1} />
          <circle cx={it.x} cy={it.y} r={4} fill="#c0392b" />
        </g>
      ))}
    </svg>
  );
}
