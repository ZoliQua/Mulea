import { useState } from 'react';
import { loadExample } from '../samples.ts';
import type { InputKind } from './InputHelp.tsx';

const countLines = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).length;

/** Validity + row-count summary for the loaded/typed text, per input kind. */
function summarize(kind: InputKind, text: string): { rows: number; ok: boolean; note: string } {
  const rows = countLines(text);
  if (kind === 'gmt') {
    const terms = text.split(/\r?\n/).filter((l) => l.split('\t').length >= 3).length;
    return terms > 0
      ? { rows, ok: true, note: `valid GMT · ${terms} term${terms === 1 ? '' : 's'}` }
      : { rows, ok: false, note: 'not tab-separated — need id⇥name⇥genes' };
  }
  return rows > 0
    ? { rows, ok: true, note: `${rows} gene${rows === 1 ? '' : 's'}` }
    : { rows, ok: false, note: 'no genes found' };
}

type Mode = 'paste' | 'upload';

export function InputField(props: {
  kind: InputKind;
  label: string;
  accept: string;
  placeholder: string;
  value: string;
  onChange: (s: string) => void;
  onHelp: () => void;
}) {
  const [mode, setMode] = useState<Mode>('paste');
  const [file, setFile] = useState<{ name: string; type: string } | null>(null);
  const s = summarize(props.kind, props.value);
  return (
    <section className="input-card">
      <div className="input-head">
        <label>{props.label}</label>
        <button type="button" className="help-q" aria-label={`What is ${props.label}?`} title="What is this?" onClick={props.onHelp}>?</button>
        <span className="io-toggle pill-group">
          <button type="button" className={mode === 'paste' ? 'active' : ''} onClick={() => setMode('paste')}>Paste</button>
          <button type="button" className={mode === 'upload' ? 'active' : ''} onClick={() => setMode('upload')}>Upload</button>
        </span>
      </div>
      {mode === 'paste' ? (
        <textarea value={props.value} onChange={(e) => props.onChange(e.target.value)} placeholder={props.placeholder} rows={4} />
      ) : (
        <div className="upload-zone">
          <label className="file-btn">
            ⤒ Choose file
            <input type="file" accept={props.accept} hidden onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setFile({ name: f.name, type: f.type || `.${f.name.split('.').pop() ?? 'file'}` });
              void f.text().then(props.onChange);
            }} />
          </label>
          {file && (
            <div className="file-meta">
              <span className="file-name" title={file.name}>{file.name}</span>
              <span className="muted">{s.rows} row{s.rows === 1 ? '' : 's'} · {file.type}</span>
              <span className={s.ok ? 'file-ok' : 'file-bad'}>{s.ok ? '✓' : '⚠'} {s.note}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export function InputPanel(props: {
  onRun: (i: { gmtText: string; target: string[]; background: string[] }) => void;
  disabled: boolean;
  onHelp: (which: InputKind) => void;
  initial?: { gmtText: string; target: string[]; background: string[] };
}) {
  const [gmtText, setGmtText] = useState(props.initial?.gmtText ?? '');
  const [targetText, setTargetText] = useState(props.initial ? props.initial.target.join('\n') : '');
  const [backgroundText, setBackgroundText] = useState(props.initial ? props.initial.background.join('\n') : '');

  const lines = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const ready = gmtText.trim() !== '' && lines(targetText).length > 0 && lines(backgroundText).length > 0;

  return (
    <div className="input-panel">
      <InputField kind="gmt" label="Ontology (GMT)" accept=".gmt,.txt" placeholder="paste GMT…"
        value={gmtText} onChange={setGmtText} onHelp={() => props.onHelp('gmt')} />
      <InputField kind="target" label="Target genes (one per line)" accept=".txt" placeholder="Paste, or load the example…"
        value={targetText} onChange={setTargetText} onHelp={() => props.onHelp('target')} />
      <InputField kind="background" label="Background genes (one per line)" accept=".txt" placeholder="Paste, or load the example…"
        value={backgroundText} onChange={setBackgroundText} onHelp={() => props.onHelp('background')} />
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
