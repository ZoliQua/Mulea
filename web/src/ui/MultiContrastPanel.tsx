import { useState } from 'react';
import { loadExample } from '../samples.ts';
import { parseContrasts, type Contrast } from '../multiContrast.ts';

export function MultiContrastPanel(props: {
  onRun: (i: { gmtText: string; background: string[]; contrasts: Contrast[] }) => void;
  disabled: boolean;
}) {
  const [gmtText, setGmtText] = useState('');
  const [backgroundText, setBackgroundText] = useState('');
  const [contrastsText, setContrastsText] = useState('');
  const [fileContrasts, setFileContrasts] = useState<Contrast[]>([]);

  const lines = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const contrasts = [...fileContrasts, ...parseContrasts(contrastsText)];
  const ready = gmtText.trim() !== '' && lines(backgroundText).length > 0 && contrasts.length >= 2;

  const readFile = (f: File, set: (s: string) => void) => f.text().then(set);
  const addFiles = (files: FileList) => {
    Promise.all(
      [...files].map(async (f) => ({ label: f.name.replace(/\.[^.]+$/, ''), target: lines(await f.text()) })),
    ).then((cs) => setFileContrasts((prev) => [...prev, ...cs])).catch(() => {});
  };

  return (
    <div className="input-panel">
      <section>
        <label>Ontology (GMT)</label>
        <input type="file" accept=".gmt,.txt" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], setGmtText)} />
        <textarea value={gmtText} onChange={(e) => setGmtText(e.target.value)} placeholder="paste GMT…" rows={4} />
      </section>
      <section>
        <label>Background genes (one per line)</label>
        <input type="file" accept=".txt" onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0], setBackgroundText)} />
        <textarea value={backgroundText} onChange={(e) => setBackgroundText(e.target.value)} rows={4} />
      </section>
      <section>
        <label>Contrasts (&gt;label then genes; or upload files)</label>
        <input type="file" accept=".txt" multiple onChange={(e) => e.target.files && addFiles(e.target.files)} />
        {fileContrasts.length > 0 && (
          <div className="contrasts-files">
            {fileContrasts.map((c, i) => (
              <span key={i} className="chip">
                {c.label} ({c.target.length})
                <button type="button" onClick={() => setFileContrasts((prev) => prev.filter((_, j) => j !== i))} aria-label={`remove ${c.label}`}> ×</button>
              </span>
            ))}
          </div>
        )}
        <textarea value={contrastsText} onChange={(e) => setContrastsText(e.target.value)} rows={6}
          placeholder={'>condition A\ngeneX\ngeneY\n>condition B\ngeneZ\n…'} />
      </section>
      <div className="actions">
        <button
          type="button"
          onClick={async () => {
            const ex = await loadExample();
            setGmtText(ex.gmtText);
            setBackgroundText(ex.background.join('\n'));
            const half = Math.ceil(ex.target.length / 2);
            setContrastsText(`>E. coli (subset 1)\n${ex.target.slice(0, half).join('\n')}\n>E. coli (subset 2)\n${ex.target.slice(half).join('\n')}`);
            setFileContrasts([]);
          }}
        >
          ★ Load example (2 contrasts)
        </button>
        <button type="button" className="primary" disabled={!ready || props.disabled}
          onClick={() => props.onRun({ gmtText, background: lines(backgroundText), contrasts })}>
          Compare ▶
        </button>
      </div>
    </div>
  );
}
