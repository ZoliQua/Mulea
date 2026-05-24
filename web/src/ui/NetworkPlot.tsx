import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { AnalysisResult } from '../appTypes.ts';
import { networkLayout } from '../network.ts';
import { scoreToColor } from './colorScale.ts';
import { DEFAULT_SETTINGS, figureVars, type FigureSettings } from '../figureSettings.ts';

export function NetworkPlot(props: { result: AnalysisResult; onSelect?: (id: string) => void; size?: number; settings?: FigureSettings }) {
  const s = props.settings ?? DEFAULT_SETTINGS;
  const size = (props.size ?? 460) * s.scale;
  const titleH = s.titleText ? s.titleFontSize + 8 : 0;
  const layout = networkLayout(props.result, { topN: 40, width: size, height: size, threshold: 0.05 });

  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; x0: number; y0: number; moved: boolean } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { x: number; y: number }>>({});
  // Reset dragged positions whenever the underlying layout changes (new data or size).
  useEffect(() => { setOverrides({}); }, [props.result, size]);

  if (layout.nodes.length === 0) return <p className="muted">No significant terms to show.</p>;

  const posMap = new Map(layout.nodes.map((n) => [n.id, overrides[n.id] ?? { x: n.x, y: n.y }]));

  const svgPoint = (e: PointerEvent): { x: number; y: number } => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top - titleH };
  };
  const onDown = (id: string) => (e: PointerEvent) => {
    const p = svgPoint(e);
    drag.current = { id, x0: p.x, y0: p.y, moved: false };
    svgRef.current?.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = svgPoint(e);
    if (!d.moved && Math.hypot(p.x - d.x0, p.y - d.y0) < 4) return; // ignore click jitter
    d.moved = true;
    setOverrides((o) => ({ ...o, [d.id]: p }));
  };
  const onUp = () => {
    const d = drag.current;
    if (d && !d.moved) props.onSelect?.(d.id); // a click (no drag) drills down
    drag.current = null;
  };

  return (
    <svg ref={svgRef} className="network" style={figureVars(s)} width={size} height={size + titleH}
      role="img" aria-label="Network of significant terms"
      onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} onPointerCancel={onUp}>
      {s.titleText && <text className="fig-title" x={8} y={s.titleFontSize} fontSize={s.titleFontSize}>{s.titleText}</text>}
      <g transform={`translate(0, ${titleH})`}>
        {layout.edges.map((e) => {
          const a = posMap.get(e.a)!, b = posMap.get(e.b)!;
          return <line key={`${e.a}-${e.b}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} strokeWidth={Math.min(4, e.weight)} />;
        })}
        {layout.nodes.map((n) => {
          const p = posMap.get(n.id)!;
          return (
            <g key={n.id} className="net-node" onPointerDown={onDown(n.id)}>
              <circle cx={p.x} cy={p.y} r={7} style={{ fill: scoreToColor(n.score) }} />
              <text x={p.x + 9} y={p.y + 4}>{n.label}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
