import type { Method } from '../appTypes.ts';

export function Controls(props: {
  method: Method;
  onMethod: (m: Method) => void;
  sigOnly: boolean;
  onSigOnly: (v: boolean) => void;
}) {
  return (
    <div className="controls">
      <label>
        Method:{' '}
        <select value={props.method} onChange={(e) => props.onMethod(e.target.value as Method)}>
          <option value="eFDR">eFDR (exact)</option>
          <option value="BH">Benjamini–Hochberg</option>
          <option value="bonferroni">Bonferroni</option>
        </select>
      </label>
      <label>
        <input type="checkbox" checked={props.sigOnly} onChange={(e) => props.onSigOnly(e.target.checked)} /> significant only
      </label>
    </div>
  );
}
