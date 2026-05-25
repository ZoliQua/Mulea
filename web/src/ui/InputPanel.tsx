import { useState } from 'react';
import { loadExample } from '../samples.ts';

export function InputPanel(props: {
  onRun: (i: { gmtText: string; target: string[]; background: string[] }) => void;
  disabled: boolean;
  initial?: { gmtText: string; target: string[]; background: string[] };
}) {
  const [gmtText, setGmtText] = useState(props.initial?.gmtText ?? '');
  const [targetText, setTargetText] = useState(props.initial ? props.initial.target.join('\n') : '');
  const [backgroundText, setBackgroundText] = useState(props.initial ? props.initial.background.join('\n') : '');

  const lines = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const ready = gmtText.trim() !== '' && lines(targetText).length > 0 && lines(backgroundText).length > 0;

  const readFile = (f: File, set: (s: string) => void) => f.text().then(set);

  return (
    <div className="input-panel">
      <section className="input-card">
        <label>Ontology (GMT)</label>
        <input type="file" accept=".gmt,.txt" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], setGmtText)} />
        <textarea value={gmtText} onChange={(e) => setGmtText(e.target.value)} placeholder="paste GMT…" rows={4} />
      </section>
      <section className="input-card">
        <label>Target genes (one per line)</label>
        <input type="file" accept=".txt" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], setTargetText)} />
        <textarea value={targetText} onChange={(e) => setTargetText(e.target.value)} rows={4} />
      </section>
      <section className="input-card">
        <label>Background genes (one per line)</label>
        <input type="file" accept=".txt" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], setBackgroundText)} />
        <textarea value={backgroundText} onChange={(e) => setBackgroundText(e.target.value)} rows={4} />
      </section>
      <div className="actions">
        <button
          type="button"
          onClick={async () => {
            const ex = await loadExample();
            setGmtText(ex.gmtText);
            setTargetText(ex.target.join('\n'));
            setBackgroundText(ex.background.join('\n'));
          }}
        >
          ★ Load E. coli example
        </button>
        <button
          type="button"
          className="primary"
          disabled={!ready || props.disabled}
          onClick={() => props.onRun({ gmtText, target: lines(targetText), background: lines(backgroundText) })}
        >
          Run ▶
        </button>
      </div>
    </div>
  );
}
