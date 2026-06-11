import { useState } from 'react';
import { loadExample } from '../samples.ts';
import { parseContrasts, parseRankedContrasts, type Contrast, type RankedContrast } from '../multiContrast.ts';
import { InputField } from './InputPanel.tsx';
import type { InputKind } from './InputHelp.tsx';

const BASE = import.meta.env.BASE_URL;

export function MultiContrastPanel(props: {
  kind?: 'ora' | 'gsea';
  onRun: (i: { gmtText: string; background: string[]; contrasts: Contrast[] }) => void;
  onRunGsea?: (i: { gmtText: string; contrasts: RankedContrast[] }) => void;
  disabled: boolean;
  onHelp: (which: InputKind) => void;
}) {
  const [gmtText, setGmtText] = useState('');
  const [backgroundText, setBackgroundText] = useState('');
  const [contrastsText, setContrastsText] = useState('');
  const [fileContrasts, setFileContrasts] = useState<Contrast[]>([]);
  const [contrastMode, setContrastMode] = useState<'paste' | 'upload'>('paste');

  const lines = (t: string) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // ---- GSEA multi-contrast (ranked lists, no background, paste-only) ----
  if (props.kind === 'gsea') {
    const gseaContrasts = parseRankedContrasts(contrastsText);
    const ready = gmtText.trim() !== '' && gseaContrasts.length >= 2;
    const loadGseaExample = async () => {
      const [gmt, ranked] = await Promise.all([
        fetch(`${BASE}examples/ecoli_regulondb.gmt`).then((r) => r.text()),
        fetch(`${BASE}examples/ecoli_ranked.tsv`).then((r) => r.text()),
      ]);
      setGmtText(gmt);
      const rows = ranked.split('\n').slice(1).map((l) => l.trim()).filter(Boolean);
      const negated = rows.map((l) => { const p = l.split(/\t/); return `${p[0]}\t${-Number(p[1])}`; });
      setContrastsText(`>up-regulated\n${rows.join('\n')}\n>down-regulated\n${negated.join('\n')}`);
    };
    return (
      <div className="input-panel">
        <InputField kind="gmt" label="Ontology (GMT)" accept=".gmt,.txt" placeholder="paste GMT…"
          value={gmtText} onChange={setGmtText} onHelp={() => props.onHelp('gmt')} />
        <section className="input-card">
          <div className="input-head">
            <label>Ranked contrasts (gene ⇥ score per &gt;label)</label>
            <button type="button" className="help-q" aria-label="What are ranked contrasts?" title="What is this?" onClick={() => props.onHelp('contrasts')}>?</button>
          </div>
          <textarea value={contrastsText} onChange={(e) => setContrastsText(e.target.value)} rows={6}
            placeholder={'>condition A\ngeneX\t2.3\ngeneY\t-1.1\n>condition B\ngeneZ\t0.7\n…'} />
        </section>
        <div className="actions">
          <button type="button" onClick={loadGseaExample}>★ Load example (2 contrasts)</button>
          <button type="button" className="primary" disabled={!ready || props.disabled}
            onClick={() => props.onRunGsea?.({ gmtText, contrasts: gseaContrasts })}>Compare ▶</button>
        </div>
      </div>
    );
  }

  // ---- ORA multi-contrast (target lists + background, paste/upload) ----
  const contrasts = [...fileContrasts, ...parseContrasts(contrastsText)];
  const ready = gmtText.trim() !== '' && lines(backgroundText).length > 0 && contrasts.length >= 2;
  const addFiles = (files: FileList) => {
    Promise.all(
      [...files].map(async (f) => ({ label: f.name.replace(/\.[^.]+$/, ''), target: lines(await f.text()) })),
    ).then((cs) => setFileContrasts((prev) => [...prev, ...cs])).catch(() => {});
  };

  return (
    <div className="input-panel">
      <InputField kind="gmt" label="Ontology (GMT)" accept=".gmt,.txt" placeholder="paste GMT…"
        value={gmtText} onChange={setGmtText} onHelp={() => props.onHelp('gmt')} />
      <InputField kind="background" label="Background genes (one per line)" accept=".txt" placeholder="Paste, or load the example…"
        value={backgroundText} onChange={setBackgroundText} onHelp={() => props.onHelp('background')} />
      <section className="input-card">
        <div className="input-head">
          <label>Contrasts</label>
          <button type="button" className="help-q" aria-label="What are contrasts?" title="What is this?" onClick={() => props.onHelp('contrasts')}>?</button>
          <span className="io-toggle pill-group">
            <button type="button" className={contrastMode === 'paste' ? 'active' : ''} onClick={() => setContrastMode('paste')}>Paste</button>
            <button type="button" className={contrastMode === 'upload' ? 'active' : ''} onClick={() => setContrastMode('upload')}>Upload</button>
          </span>
        </div>
        {contrastMode === 'paste' ? (
          <textarea value={contrastsText} onChange={(e) => setContrastsText(e.target.value)} rows={6}
            placeholder={'>condition A\ngeneX\ngeneY\n>condition B\ngeneZ\n…'} />
        ) : (
          <div className="upload-zone">
            <label className="file-btn">
              ⤒ Choose files
              <input type="file" accept=".txt" multiple hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
            </label>
            {fileContrasts.length > 0 ? (
              <div className="contrasts-files">
                {fileContrasts.map((c, i) => (
                  <span key={i} className="chip">
                    {c.label} ({c.target.length})
                    <button type="button" onClick={() => setFileContrasts((prev) => prev.filter((_, j) => j !== i))} aria-label={`remove ${c.label}`}> ×</button>
                  </span>
                ))}
              </div>
            ) : (
              <span className="muted" style={{ fontSize: 12 }}>One .txt file per contrast — the file name is the label.</span>
            )}
          </div>
        )}
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
            setContrastMode('paste');
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
