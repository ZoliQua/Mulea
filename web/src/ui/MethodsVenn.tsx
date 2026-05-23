import { useMemo, useState } from 'react';
import { runComparison } from '../comparison.ts';
import { venn3Regions, type RegionKey } from '../venn3.ts';
import { DEFAULT_SETTINGS, figureVars, type FigureSettings } from '../figureSettings.ts';

interface VennInputs { gmtText: string; target: string[]; background: string[] }

const CIRCLES = [
  { key: 'A', cx: 130, cy: 120, label: 'eFDR', fill: 'var(--method-efdr)' },
  { key: 'B', cx: 210, cy: 120, label: 'BH', fill: 'var(--method-bh)' },
  { key: 'C', cx: 170, cy: 190, label: 'Bonferroni', fill: 'var(--method-bonf)' },
] as const;
const R = 70;
const CENTROIDS: Record<RegionKey, { x: number; y: number }> = {
  Aonly: { x: 95, y: 110 }, Bonly: { x: 245, y: 110 }, Conly: { x: 170, y: 225 },
  AB: { x: 170, y: 95 }, AC: { x: 125, y: 175 }, BC: { x: 215, y: 175 }, ABC: { x: 170, y: 150 },
};

export function MethodsVenn(props: { inputs: VennInputs | null; settings?: FigureSettings }) {
  const comparison = useMemo(
    () => (props.inputs ? runComparison({ ...props.inputs, minNrOfElements: 3, maxNrOfElements: 400 }) : null),
    [props.inputs],
  );
  const [region, setRegion] = useState<RegionKey | null>(null);

  if (!comparison) return <p className="muted">Run an analysis first.</p>;
  const s = props.settings ?? DEFAULT_SETTINGS;
  const regions = venn3Regions(comparison.efdr, comparison.bh, comparison.bonferroni);

  return (
    <div className="methods-venn">
      {s.titleText && <h4 className="fig-title-html">{s.titleText}</h4>}
      <svg style={figureVars(s)} width={340 * s.scale} height={280 * s.scale} viewBox="0 0 340 280" role="img" aria-label="Significant terms by correction method">
        {CIRCLES.map((c) => (
          <circle key={c.key} cx={c.cx} cy={c.cy} r={R} style={{ fill: c.fill, stroke: c.fill, fillOpacity: s.vennTransparency }} />
        ))}
        {(Object.keys(CENTROIDS) as RegionKey[]).map((k) => (
          <text key={k} x={CENTROIDS[k].x} y={CENTROIDS[k].y} textAnchor="middle"
            style={{ cursor: 'pointer', fontWeight: region === k ? 700 : 400 }} onClick={() => setRegion(k)}>
            {regions[k].count}
          </text>
        ))}
      </svg>
      <ul className="venn-legend">
        <li><span style={{ color: 'var(--method-efdr)' }}>●</span> eFDR — {comparison.efdr.length} significant</li>
        <li><span style={{ color: 'var(--method-bh)' }}>●</span> BH — {comparison.bh.length} significant</li>
        <li><span style={{ color: 'var(--method-bonf)' }}>●</span> Bonferroni — {comparison.bonferroni.length} significant</li>
      </ul>
      {region && (
        <div className="venn-region">
          <strong>{region}</strong> ({regions[region].count}): {regions[region].ids.join(', ') || '—'}
        </div>
      )}
    </div>
  );
}
