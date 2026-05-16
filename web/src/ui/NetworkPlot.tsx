import type { AnalysisResult } from '../appTypes.ts';
import { networkLayout } from '../network.ts';
import { scoreToColor } from './colorScale.ts';

export function NetworkPlot(props: { result: AnalysisResult; onSelect?: (id: string) => void; size?: number }) {
  const size = props.size ?? 460;
  const layout = networkLayout(props.result, { topN: 40, width: size, height: size, threshold: 0.05 });
  if (layout.nodes.length === 0) return <p className="muted">No significant terms to show.</p>;
  const pos = new Map(layout.nodes.map((n) => [n.id, n]));
  return (
    <svg className="network" width={size} height={size} role="img" aria-label="Network of significant terms">
      {layout.edges.map((e) => {
        const a = pos.get(e.a)!, b = pos.get(e.b)!;
        return <line key={`${e.a}-${e.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#bbb" strokeWidth={Math.min(4, e.weight)} />;
      })}
      {layout.nodes.map((n) => (
        <g key={n.id} onClick={() => props.onSelect?.(n.id)} style={{ cursor: 'pointer' }}>
          <circle cx={n.x} cy={n.y} r={7} fill={scoreToColor(n.score)} />
          <text x={n.x + 9} y={n.y + 4} fontSize={10}>{n.label}</text>
        </g>
      ))}
    </svg>
  );
}
