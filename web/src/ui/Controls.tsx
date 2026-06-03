import type { Method, EfdrMode } from '../appTypes.ts';

const SOFT_STEP_WARN = 1_000_000;

const METHODS: { id: Method; label: string }[] = [
  { id: 'eFDR', label: 'eFDR' }, { id: 'BH', label: 'BH' }, { id: 'bonferroni', label: 'Bonferroni' },
];

export function Controls(props: {
  method: Method; onMethod: (m: Method) => void;
  sigOnly: boolean; onSigOnly: (v: boolean) => void;
  efdrMode: EfdrMode; onEfdrMode: (m: EfdrMode) => void;
  steps: number; onSteps: (n: number) => void;
  seed: number; onSeed: (n: number) => void;
  onRandomizeSeed: () => void;
}) {
  return (
    <div className="controls">
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span className="muted" style={{ fontSize: 12 }}>Correction</span>
        <span className="pill-group">
          {METHODS.map((m) => (
            <button key={m.id} type="button" className={props.method === m.id ? 'active' : ''} onClick={() => props.onMethod(m.id)}>{m.label}</button>
          ))}
        </span>
      </span>
      {props.method === 'eFDR' && (
        <span className="efdr-mode" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="muted" style={{ fontSize: 12 }}>eFDR</span>
          <span className="pill-group">
            <button type="button" className={props.efdrMode === 'exact' ? 'active' : ''} onClick={() => props.onEfdrMode('exact')}>Exact</button>
            <button type="button" className={props.efdrMode === 'resampling' ? 'active' : ''} onClick={() => props.onEfdrMode('resampling')}>Resampling</button>
          </span>
          {props.efdrMode === 'resampling' && (
            <>
              <label style={{ fontSize: 12 }}>steps <input type="number" min={1} step={1000} value={props.steps}
                onChange={(e) => props.onSteps(Math.max(1, Math.floor(Number(e.target.value) || 100000)))} style={{ width: 92 }} /></label>
              {props.steps > SOFT_STEP_WARN && <span className="warn" style={{ fontSize: 12 }}>⚠ large — may take a while</span>}
              <label style={{ fontSize: 12 }}>seed <input type="number" value={props.seed}
                onChange={(e) => props.onSeed(Math.floor(Number(e.target.value) || 42))} style={{ width: 64 }} /></label>
              <button type="button" className="dice-btn" aria-label="Randomize seed" title="Random seed" onClick={props.onRandomizeSeed}>🎲</button>
            </>
          )}
        </span>
      )}
      <label style={{ fontSize: 12 }}><input type="checkbox" checked={props.sigOnly} onChange={(e) => props.onSigOnly(e.target.checked)} /> Significant only</label>
    </div>
  );
}
