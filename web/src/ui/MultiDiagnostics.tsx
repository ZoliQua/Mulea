import type { AnalysisResult } from '../appTypes.ts';

export function MultiDiagnostics({ contrasts }: { contrasts: { label: string; result: AnalysisResult }[] }) {
  const withDiag = contrasts.filter((c) => c.result.diagnostics);
  if (withDiag.length === 0) return null;
  const head = withDiag[0]!.result.diagnostics!;
  return (
    <div className="diagnostics" role="note" aria-label="Resampling diagnostics (per contrast)">
      <strong>Resampling diagnostics</strong>
      <div className="muted">steps {head.steps.toLocaleString()} · seed {head.seed}</div>
      <ul className="per-contrast-diag">
        {withDiag.map((c) => {
          const d = c.result.diagnostics!;
          return (
            <li key={c.label}>
              {c.label}: max |ΔeFDR| {d.maxAbsDeltaVsExact.toFixed(4)}{' '}
              {d.withinNoise ? <span className="ok">✓</span> : <span className="warn">⚠ increase steps</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
