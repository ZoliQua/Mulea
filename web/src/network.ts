import type { AnalysisResult } from './appTypes.ts';
import { rowScore } from './lollipop.ts';

export interface NetworkNode { id: string; label: string; x: number; y: number; score: number }
export interface NetworkEdge { a: string; b: string; weight: number }
export interface NetworkLayout { width: number; height: number; nodes: NetworkNode[]; edges: NetworkEdge[] }
export interface NetworkOptions { topN: number; width: number; height: number; threshold: number; iterations?: number }

/**
 * Deterministic force-directed layout (vennDiagramLab pattern): circular initialization +
 * a fixed number of repulsion/attraction iterations. NO randomness, so the output is pure
 * and reproducible. Nodes = significant terms; edges connect terms sharing ≥1 hit gene.
 */
export function networkLayout(result: AnalysisResult, opts: NetworkOptions): NetworkLayout {
  const sig = result.rows
    .filter((r) => rowScore(r) < opts.threshold)
    .sort((a, b) => rowScore(a) - rowScore(b))
    .slice(0, opts.topN);

  const edges: NetworkEdge[] = [];
  for (let i = 0; i < sig.length; i++) {
    const hi = new Set(sig[i]!.hits ?? []);
    for (let j = i + 1; j < sig.length; j++) {
      const shared = (sig[j]!.hits ?? []).filter((g) => hi.has(g)).length;
      if (shared > 0) edges.push({ a: sig[i]!.ontology_id, b: sig[j]!.ontology_id, weight: shared });
    }
  }

  const n = sig.length;
  const cx = opts.width / 2, cy = opts.height / 2;
  const initR = Math.min(opts.width, opts.height) * 0.35;
  const nodes: NetworkNode[] = sig.map((r, i) => ({
    id: r.ontology_id, label: r.ontology_name, score: rowScore(r),
    x: cx + initR * Math.cos((2 * Math.PI * i) / Math.max(1, n) - Math.PI / 2),
    y: cy + initR * Math.sin((2 * Math.PI * i) / Math.max(1, n) - Math.PI / 2),
  }));

  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const ITER = opts.iterations ?? 200;
  const REPULSION = 4000, SPRING = 0.02;
  const maxW = Math.max(1, ...edges.map((e) => e.weight));

  for (let it = 0; it < ITER; it++) {
    const fx = new Array<number>(n).fill(0);
    const fy = new Array<number>(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = nodes[i]!.x - nodes[j]!.x;
        const dy = nodes[i]!.y - nodes[j]!.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = REPULSION / (dist * dist);
        fx[i]! += (dx / dist) * f; fy[i]! += (dy / dist) * f;
        fx[j]! -= (dx / dist) * f; fy[j]! -= (dy / dist) * f;
      }
    }
    for (const e of edges) {
      const i = idx.get(e.a)!, j = idx.get(e.b)!;
      const dx = nodes[j]!.x - nodes[i]!.x;
      const dy = nodes[j]!.y - nodes[i]!.y;
      const f = SPRING * (e.weight / maxW);
      fx[i]! += dx * f; fy[i]! += dy * f; fx[j]! -= dx * f; fy[j]! -= dy * f;
    }
    for (let i = 0; i < n; i++) {
      nodes[i]!.x = Math.max(8, Math.min(opts.width - 8, nodes[i]!.x + Math.max(-10, Math.min(10, fx[i]!))));
      nodes[i]!.y = Math.max(8, Math.min(opts.height - 8, nodes[i]!.y + Math.max(-10, Math.min(10, fy[i]!))));
    }
  }
  return { width: opts.width, height: opts.height, nodes, edges };
}
