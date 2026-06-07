import { useMemo } from 'react';
import { runningEnrichment, type RankedItem } from '../gsea.ts';

/** Classic GSEA running-enrichment plot for one term: ES curve + hit ticks + peak. */
export function RunningEsPlot({ termGenes, ranked, label }: {
  termGenes: string[]; ranked: RankedItem[]; label: string;
}) {
  const { curve, hitIndices, es, peak, n } = useMemo(() => runningEnrichment(termGenes, ranked), [termGenes, ranked]);
  if (n === 0 || peak < 0) return <p className="muted">No running-ES (term has no ranked genes).</p>;

  const W = 560; const H = 220; const L = 46; const R = 14; const T = 16; const Bh = 26; const tickH = 18;
  const plotH = H - T - Bh - tickH;
  let lo = 0; let hi = 0;
  for (const v of curve) { if (v < lo) lo = v; if (v > hi) hi = v; }
  const span = hi - lo || 1;
  const x = (i: number) => L + (i / (n - 1)) * (W - L - R);
  const y = (v: number) => T + (hi - v) / span * plotH;

  // downsample the curve to ~700 points for a light SVG
  const step = Math.max(1, Math.floor(n / 700));
  const pts: string[] = [];
  for (let i = 0; i < n; i += step) pts.push(`${x(i).toFixed(1)},${y(curve[i]!).toFixed(1)}`);
  pts.push(`${x(n - 1).toFixed(1)},${y(curve[n - 1]!).toFixed(1)}`);

  const zeroY = y(0);
  const tickTop = H - Bh - tickH;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Running enrichment score for ${label}`}>
      <line x1={L} y1={zeroY} x2={W - R} y2={zeroY} stroke="var(--border)" strokeWidth={1} />
      <polyline points={pts.join(' ')} fill="none" stroke="var(--accent)" strokeWidth={1.6} />
      <line x1={x(peak)} y1={T} x2={x(peak)} y2={tickTop} stroke="var(--ramp-mid, #9b5fc4)" strokeWidth={1} strokeDasharray="4 3" />
      <text x={x(peak) + 4} y={T + 11} fontSize={11} fill="var(--muted)">ES {es.toFixed(3)}</text>
      {hitIndices.map((i) => <line key={i} x1={x(i)} y1={tickTop} x2={x(i)} y2={tickTop + tickH} stroke="var(--text)" strokeWidth={0.6} opacity={0.5} />)}
      <text x={L} y={H - 8} fontSize={11} fill="var(--muted)">high</text>
      <text x={W - R} y={H - 8} fontSize={11} fill="var(--muted)" textAnchor="end">low (rank →)</text>
      <text x={12} y={T + plotH / 2} fontSize={11} fill="var(--muted)" textAnchor="middle" transform={`rotate(-90 12 ${T + plotH / 2})`}>enrichment</text>
    </svg>
  );
}
