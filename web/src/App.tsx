import { useEffect, useMemo, useState } from 'react';
import type { AnalysisInput, Method } from './appTypes.ts';
import { useAnalysis } from './hooks/useAnalysis.ts';
import { InputPanel } from './ui/InputPanel.tsx';
import { Controls } from './ui/Controls.tsx';
import { ResultsTable } from './ui/ResultsTable.tsx';
import { LollipopChart } from './ui/LollipopChart.tsx';
import { PrivacyNote } from './ui/PrivacyNote.tsx';
import { downloadTsv } from './exportTsv.ts';
import { ViewTabs, type ViewId } from './ui/ViewTabs.tsx';
import { Barplot } from './ui/Barplot.tsx';
import { NetworkPlot } from './ui/NetworkPlot.tsx';
import { Heatmap } from './ui/Heatmap.tsx';
import { DrilldownPanel } from './ui/DrilldownPanel.tsx';
import { MethodsVenn } from './ui/MethodsVenn.tsx';
import { CapsuleBar } from './ui/CapsuleBar.tsx';
import { fingerprintResult, encodeCapsule, decodeCapsule, capsuleFitsUrl, type Capsule } from './capsule.ts';
import { ReportView } from './ui/ReportView.tsx';

const RUN_DEFAULTS = { minNrOfElements: 3, maxNrOfElements: 400 } as const;

function readCapsuleFromHash(): { cap?: Capsule; invalid?: boolean } | null {
  if (typeof window === 'undefined') return null;
  const h = window.location.hash;
  if (!h.startsWith('#c=')) return null;
  const cap = decodeCapsule(h.slice(3));
  return cap ? { cap } : { invalid: true };
}

export default function App() {
  const { state, run } = useAnalysis();
  const [loaded] = useState(() => readCapsuleFromHash());
  const [method, setMethod] = useState<Method>(loaded?.cap?.inputs.method ?? 'eFDR');
  const [sigOnly, setSigOnly] = useState(false);
  const [lastInputs, setLastInputs] = useState<Omit<AnalysisInput, 'method' | 'minNrOfElements' | 'maxNrOfElements'> | null>(
    loaded?.cap ? { gmtText: loaded.cap.inputs.gmtText, target: loaded.cap.inputs.target, background: loaded.cap.inputs.background } : null,
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [viewId, setViewId] = useState<ViewId>('table');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState(false);

  const start = (i: { gmtText: string; target: string[]; background: string[] }) => {
    setShareUrl(null); // a freshly-shared URL must reflect the new run, not a stale one
    setLastInputs(i);
    run({ ...i, method, ...RUN_DEFAULTS });
  };
  useEffect(() => {
    setShareUrl(null);
    if (lastInputs) run({ ...lastInputs, method, ...RUN_DEFAULTS });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method]);

  const doneResult = state.status === 'done' ? state.result : null;
  const currentFp = useMemo(() => (doneResult ? fingerprintResult(doneResult) : null), [doneResult]);
  const capsuleFp = loaded?.cap?.fp ?? null;
  const replay: 'none' | 'ok' | 'differs' | 'invalid' =
    loaded?.invalid ? 'invalid'
    : currentFp !== null && capsuleFp !== null ? (currentFp === capsuleFp ? 'ok' : 'differs')
    : 'none';
  // CapsuleBar renders only in the done branch, where lastInputs/currentFp are always set —
  // so the guard below reduces to the URL-size check (the only reason the share button is disabled there).
  const shareDisabled = useMemo(() => {
    if (!lastInputs || !currentFp) return true;
    return !capsuleFitsUrl(encodeCapsule({ v: 1, inputs: { ...lastInputs, method, ...RUN_DEFAULTS }, fp: currentFp }));
  }, [lastInputs, currentFp, method]);

  return (
    <div className="layout">
      <header className="topbar"><strong>muleaLab</strong> · client-side enrichment + eFDR</header>
      <div className="two-panel">
        <aside className="left">
          <InputPanel onRun={start} disabled={state.status === 'running'}
            initial={loaded?.cap ? { gmtText: loaded.cap.inputs.gmtText, target: loaded.cap.inputs.target, background: loaded.cap.inputs.background } : undefined} />
          <PrivacyNote />
        </aside>
        <main className="right">
          <Controls method={method} onMethod={setMethod} sigOnly={sigOnly} onSigOnly={setSigOnly} />
          {replay === 'invalid' && <p className="error">This shared link is invalid.</p>}
          {state.status === 'idle' && replay !== 'invalid' && <p className="muted">Load inputs (or the example) and press Run.</p>}
          {state.status === 'running' && <p className="muted">Computing…</p>}
          {state.status === 'error' && <p className="error">Error: {state.error}</p>}
          {state.status === 'done' && (
            <>
              {state.result.warnings.map((w) => <p key={w} className="warn">{w}</p>)}
              <button type="button" onClick={() => downloadTsv(state.result)}>⤓ TSV</button>
              <button type="button" onClick={() => setReport(true)}>⎙ Report</button>
              <CapsuleBar
                onShare={() => {
                  if (!lastInputs || !currentFp) return;
                  const capsule: Capsule = { v: 1, inputs: { ...lastInputs, method, ...RUN_DEFAULTS }, fp: currentFp };
                  const enc = encodeCapsule(capsule);
                  const url = `${window.location.origin}${window.location.pathname}#c=${enc}`;
                  setShareUrl(url);
                  void navigator.clipboard?.writeText(url).catch(() => {});
                }}
                shareDisabled={shareDisabled}
                shareUrl={shareUrl}
                replay={replay}
              />
              {report ? (
                <ReportView result={state.result} inputs={lastInputs} method={method} onBack={() => setReport(false)} />
              ) : (
                <>
                  <ViewTabs active={viewId} onChange={setViewId} />
                  <div className="view-row">
                    <div className="view-main">
                      {viewId === 'table' && <ResultsTable key={state.result.method} result={state.result} sigOnly={sigOnly} onSelect={setSelectedId} />}
                      {viewId === 'lollipop' && <LollipopChart result={state.result} />}
                      {viewId === 'barplot' && <Barplot result={state.result} onSelect={setSelectedId} />}
                      {viewId === 'network' && <NetworkPlot result={state.result} onSelect={setSelectedId} />}
                      {viewId === 'heatmap' && <Heatmap result={state.result} onSelect={setSelectedId} />}
                      {viewId === 'venn' && <MethodsVenn inputs={lastInputs} />}
                    </div>
                    {selectedId && (() => {
                      const row = state.result.rows.find((r) => r.ontology_id === selectedId);
                      return row ? <DrilldownPanel row={row} meta={state.result.meta} onClose={() => setSelectedId(null)} /> : null;
                    })()}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
