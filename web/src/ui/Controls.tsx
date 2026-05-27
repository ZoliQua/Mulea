import type { Method } from '../appTypes.ts';

const METHODS: { id: Method; label: string }[] = [
  { id: 'eFDR', label: 'eFDR' }, { id: 'BH', label: 'BH' }, { id: 'bonferroni', label: 'Bonferroni' },
];

export function Controls(props: { method: Method; onMethod: (m: Method) => void; sigOnly: boolean; onSigOnly: (v: boolean) => void }) {
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
      <label style={{ fontSize: 12 }}><input type="checkbox" checked={props.sigOnly} onChange={(e) => props.onSigOnly(e.target.checked)} /> Significant only</label>
    </div>
  );
}
