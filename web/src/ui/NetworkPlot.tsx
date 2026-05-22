import type { AnalysisResult } from '../appTypes.ts';
import { networkLayout } from '../network.ts';
import { scoreToColor } from './colorScale.ts';
import { DEFAULT_SETTINGS, figureVars, type FigureSettings } from '../figureSettings.ts';

export function NetworkPlot(props: { result: AnalysisResult; onSelect?: (id: string) => void; size?: number; settings?: FigureSettings }) {
  const s = props.settings ?? DEFAULT_SETTINGS;
  const size = (props.size ?? 460) * s.scale;
  const layout = networkLayout(props.result, { topN: 40, width: size, height: size, threshold: 0.05 });
  if (layout.nodes.length === 0) return <p className="muted">No significant terms to show.</p>;
  const pos = new Map(layout.nodes.map((n) => [n.id, n]));
  return (
    <svg className="network" style={figureVars(s)} width={size} height={size} role="img" aria-label="Network of significant terms">
      {layout.edges.map((e) => {
        const a = pos.get(e.a)!, b = pos.get(e.b)!;
        return <line key={`${e.a}-${e.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={Math.min(4, e.weight)} />;
      })}
      {layout.nodes.map((n) => (
        <g key={n.id} onClick={() => props.onSelect?.(n.id)} style={{ cursor: 'pointer' }}>
          <circle cx={n.x} cy={n.y} r={7} style={{ fill: scoreToColor(n.score) }} />
          <text x={n.x + 9} y={n.y + 4}>{n.label}</text>
        </g>
      ))}
    </svg>
  );
}
