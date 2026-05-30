import type { EfdrDiagnostics } from '../appTypes.ts';

export function DiagnosticsPanel({ d }: { d: EfdrDiagnostics }) {
  return (
    <div className="diagnostics" role="note" aria-label="Resampling eFDR diagnostics">
      <strong>Resampling eFDR diagnostics</strong>
      <div className="muted">steps {d.steps.toLocaleString()} · seed {d.seed} · ran {(d.runtimeMs / 1000).toFixed(1)}s</div>
      <div>
        convergence vs exact analytic: max |ΔeFDR| = {d.maxAbsDeltaVsExact.toFixed(4)}{' '}
        {d.withinNoise
          ? <span className="ok">✓ within MC noise</span>
          : <span className="warn">⚠ increase steps to reduce Monte-Carlo error</span>}
      </div>
      {d.clampedToOne && (
        <div className="muted">note: ≥1 term at the eFDR=1 ceiling (web clamps to ≤1; base R does not clamp)</div>
      )}
    </div>
  );
}
