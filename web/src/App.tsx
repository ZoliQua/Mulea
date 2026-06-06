import { useEffect, useMemo, useState } from 'react';
import type { AnalysisInput, Method, EfdrMode } from './appTypes.ts';
import { useAnalysis } from './hooks/useAnalysis.ts';
import { InputPanel } from './ui/InputPanel.tsx';
import { Controls } from './ui/Controls.tsx';
import { ResultsTable } from './ui/ResultsTable.tsx';
import { LollipopChart } from './ui/LollipopChart.tsx';
import { PrivacyNote } from './ui/PrivacyNote.tsx';
import { IntroAbout, IntroCite } from './ui/IntroPanel.tsx';
import { InputHelp, type InputKind } from './ui/InputHelp.tsx';
import { downloadTsv } from './exportTsv.ts';
import { runAnalysis } from './analysis.ts';
import { downloadQcCsv } from './efdrQc.ts';
import { ViewTabs, type ViewId } from './ui/ViewTabs.tsx';
import { Barplot } from './ui/Barplot.tsx';
import { NetworkPlot } from './ui/NetworkPlot.tsx';
import { Heatmap } from './ui/Heatmap.tsx';
import { DrilldownPanel } from './ui/DrilldownPanel.tsx';
import { MethodsVenn } from './ui/MethodsVenn.tsx';
import { UpSetPlot } from './ui/UpSetPlot.tsx';
import { CapsuleBar } from './ui/CapsuleBar.tsx';
import { fingerprintResult, encodeCapsule, decodeCapsule, capsuleFitsUrl, type Capsule } from './capsule.ts';
import { ReportView } from './ui/ReportView.tsx';
import { OfflineBadge } from './ui/OfflineBadge.tsx';
import { DiagnosticsPanel } from './ui/DiagnosticsPanel.tsx';
import { MultiContrastPanel } from './ui/MultiContrastPanel.tsx';
import { DotPlot } from './ui/DotPlot.tsx';
import { MultiDiagnostics } from './ui/MultiDiagnostics.tsx';
import { useMultiContrast } from './hooks/useMultiContrast.ts';
import { dotMatrix, type Contrast } from './multiContrast.ts';
import { ThemeToggle } from './ui/ThemeToggle.tsx';
import { HelpDrawer } from './ui/HelpDrawer.tsx';
import { ValidationDrawer } from './ui/ValidationDrawer.tsx';
import { EfdrDerivation } from './ui/EfdrDerivation.tsx';
import { Landing } from './Landing.tsx';
import { FigureCard } from './ui/FigureCard.tsx';
import { SettingsDrawer } from './ui/SettingsDrawer.tsx';
import { effectiveSettings, type FigureSettings, type Palette } from './figureSettings.ts';

const RUN_DEFAULTS = { minNrOfElements: 3, maxNrOfElements: 400 } as const;

const VIEW_TITLES: Record<ViewId, string> = {
  table: 'Results table', lollipop: 'Lollipop', barplot: 'Bar plot',
  network: 'Term–gene network', heatmap: 'Heatmap', venn: 'Venn Diagram', upset: 'UpSet plot',
};
const titleForView = (v: ViewId): string => VIEW_TITLES[v];

function readCapsuleFromHash(): { cap?: Capsule; invalid?: boolean } | null {
  if (typeof window === 'undefined') return null;
  const h = window.location.hash;
  if (!h.startsWith('#c=')) return null;
  const cap = decodeCapsule(h.slice(3));
  return cap ? { cap } : { invalid: true };
}

export default function App() {
  const { state, run } = useAnalysis();
  const mc = useMultiContrast();
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [mcSelected, setMcSelected] = useState<{ contrast: string; term: string } | null>(null);
  const [loaded] = useState(() => readCapsuleFromHash());
  const [view, setView] = useState<'landing' | 'tool'>(
    (typeof window !== 'undefined' && window.location.hash.startsWith('#c=')) ? 'tool' : 'landing',
  );
  const [introDismissed, setIntroDismissed] = useState(() => {
    try { return localStorage.getItem('mulealab-intro-dismissed') === '1'; } catch { return false; }
  });
  const [helpFor, setHelpFor] = useState<InputKind | null>(null);
  const [method, setMethod] = useState<Method>(loaded?.cap?.inputs.method ?? 'eFDR');
  const [efdrMode, setEfdrMode] = useState<EfdrMode>(loaded?.cap?.inputs.efdrMode ?? 'exact');
  const [steps, setSteps] = useState<number>(loaded?.cap?.inputs.steps ?? 100000);
  const [seed, setSeed] = useState<number>(loaded?.cap?.inputs.seed ?? 42);
  const [sigOnly, setSigOnly] = useState(false);
  const [lastInputs, setLastInputs] = useState<Omit<AnalysisInput, 'method' | 'minNrOfElements' | 'maxNrOfElements'> | null>(
    loaded?.cap ? { gmtText: loaded.cap.inputs.gmtText, target: loaded.cap.inputs.target, background: loaded.cap.inputs.background } : null,
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [viewId, setViewId] = useState<ViewId>('table');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [report, setReport] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [validationOpen, setValidationOpen] = useState(false);
  const [derivationOpen, setDerivationOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'focused' | 'dashboard'>('focused');
  const [globalSettings, setGlobalSettings] = useState<Partial<FigureSettings>>({});
  const [perFigure, setPerFigure] = useState<Record<string, Partial<FigureSettings>>>({});
  const [palette, setPalette] = useState<Palette>('default');
  const [settingsFor, setSettingsFor] = useState<ViewId | null>(null);
  const [settingsTab, setSettingsTab] = useState<'global' | 'figure'>('figure');

  const randomizeSeed = () => setSeed(Math.floor(Math.random() * 2 ** 31));

  const start = (i: { gmtText: string; target: string[]; background: string[] }) => {
    setShareUrl(null);
    setLastInputs(i);
    run({ ...i, method, efdrMode, steps, seed, ...RUN_DEFAULTS });
  };
  useEffect(() => {
    setShareUrl(null);
    if (lastInputs && mode === 'single') run({ ...lastInputs, method, efdrMode, steps, seed, ...RUN_DEFAULTS });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, efdrMode]);

  const doneResult = state.status === 'done' ? state.result : null;
  const currentFp = useMemo(() => (doneResult ? fingerprintResult(doneResult) : null), [doneResult]);
  const shareSteps = doneResult?.diagnostics?.steps ?? steps;
  const shareSeed = doneResult?.diagnostics?.seed ?? seed;
  const capsuleFp = loaded?.cap?.fp ?? null;
  const replay: 'none' | 'ok' | 'differs' | 'invalid' =
    loaded?.invalid ? 'invalid'
    : currentFp !== null && capsuleFp !== null ? (currentFp === capsuleFp ? 'ok' : 'differs')
    : 'none';
  // CapsuleBar renders only in the done branch, where lastInputs/currentFp are always set —
  // so the guard below reduces to the URL-size check (the only reason the share button is disabled there).
  const shareDisabled = useMemo(() => {
    if (!lastInputs || !currentFp) return true;
    return !capsuleFitsUrl(encodeCapsule({ v: 1, inputs: { ...lastInputs, method, efdrMode, steps: shareSteps, seed: shareSeed, ...RUN_DEFAULTS }, fp: currentFp }));
  }, [lastInputs, currentFp, method, efdrMode, shareSteps, shareSeed]);

  const mcDoneResult = mc.state.status === 'done' ? mc.state.result : null;
  const mcMatrix = useMemo(() => (mcDoneResult ? dotMatrix(mcDoneResult) : null), [mcDoneResult]);
  const runMulti = (i: { gmtText: string; background: string[]; contrasts: Contrast[] }) =>
    mc.run({ ...i, method, efdrMode, steps, seed, ...RUN_DEFAULTS });
  const switchMode = (m: 'single' | 'multi') => { setMode(m); setReport(false); setSelectedId(null); setMcSelected(null); };

  const settingsOf = (id: ViewId): FigureSettings => effectiveSettings(globalSettings, perFigure[id] ?? {});
  const openSettings = (id: ViewId) => { setSettingsFor(id); setSettingsTab('figure'); };
  const drawerValue: FigureSettings = settingsTab === 'global' || !settingsFor
    ? effectiveSettings(globalSettings, {})
    : settingsOf(settingsFor);
  const applyDrawerPatch = (patch: Partial<FigureSettings>) => {
    if (settingsTab === 'global' || !settingsFor) { setGlobalSettings((g) => ({ ...g, ...patch })); return; }
    const id = settingsFor;
    setPerFigure((m) => ({ ...m, [id]: { ...(m[id] ?? {}), ...patch } }));
  };

  if (view === 'landing') {
    return (
      <Landing
        onStart={() => setView('tool')}
        onDocs={() => window.open('https://github.com/ELTEbioinformatics/mulea', '_blank', 'noopener')}
      />
    );
  }

  return (
    <div className="layout" data-palette={palette}>
      <header className="topbar">
        <button type="button" className="home-btn" aria-label="Home" title="Home" onClick={() => setView('landing')}>
          <img className="topbar-icon" src="icon.svg" alt="" width={22} height={22} />
          <strong>Mulea</strong>
        </button>
        <span className="muted">· enrichment workspace</span>
        <span className="mode-toggle">
          <button type="button" className={mode === 'single' ? 'active' : ''} onClick={() => switchMode('single')}>Single</button>
          <button type="button" className={mode === 'multi' ? 'active' : ''} onClick={() => switchMode('multi')}>Multi-contrast</button>
        </span>
        <span className="spacer"></span>
        <button type="button" className="icon-btn" aria-label="Help" title="How to use muleaLab" onClick={() => setHelpOpen(true)}>?</button>
        <button type="button" className="icon-btn" aria-label="External validation" title="External validation (vs clusterProfiler)" onClick={() => setValidationOpen(true)}>✓</button>
        <ThemeToggle />
        <OfflineBadge />
      </header>
      {!introDismissed && (
        <div className="intro-top">
          <IntroAbout onClose={() => {
            try { localStorage.setItem('mulealab-intro-dismissed', '1'); } catch { /* ignore */ }
            setIntroDismissed(true);
          }} />
        </div>
      )}
      <div className="two-panel">
        <aside className="left">
          <details className="input-disclosure" open>
            <summary>{mode === 'single' ? 'Inputs' : 'Multi-contrast'}</summary>
            {mode === 'single' ? (
              <InputPanel onRun={start} disabled={state.status === 'running'} onHelp={setHelpFor}
                initial={loaded?.cap ? { gmtText: loaded.cap.inputs.gmtText, target: loaded.cap.inputs.target, background: loaded.cap.inputs.background } : undefined} />
            ) : (
              <MultiContrastPanel onRun={runMulti} disabled={mc.state.status === 'running'} onHelp={setHelpFor} />
            )}
          </details>
          <PrivacyNote />
          <IntroCite />
        </aside>
        <main className="right">
          {helpFor ? (
            <InputHelp which={helpFor} onClose={() => setHelpFor(null)} />
          ) : (
          <>
          <Controls method={method} onMethod={setMethod} sigOnly={sigOnly} onSigOnly={setSigOnly}
            efdrMode={efdrMode} onEfdrMode={setEfdrMode} steps={steps} onSteps={setSteps} seed={seed} onSeed={setSeed} onRandomizeSeed={randomizeSeed}
            onShowDerivation={() => setDerivationOpen(true)} />
          {mode === 'single' ? (
            <>
              {replay === 'invalid' && (
                <div className="error-card"><span className="error-icon">⚠</span><div><strong>Invalid shared link</strong><p>This link's analysis capsule couldn't be decoded.</p></div></div>
              )}
              {state.status === 'idle' && replay !== 'invalid' && <div className="state-card">Load inputs (or the example) and press Run.</div>}
              {state.status === 'running' && <div className="state-card">Computing… resampling background for eFDR</div>}
              {state.status === 'error' && (
                <div className="error-card"><span className="error-icon">⚠</span><div><strong>Couldn't run the analysis</strong><p>{state.error}</p></div></div>
              )}
              {state.status === 'done' && (
                <>
                  {state.result.warnings.map((w) => <p key={w} className="warn">{w}</p>)}
                  <span className="summary-pill">{state.result.rows.filter((r) => (r.eFDR ?? r.adjusted_p_value ?? r.p_value) < 0.05).length} significant terms · {method} &lt; 0.05</span>
                  {state.result.diagnostics && (
                    <DiagnosticsPanel
                      d={state.result.diagnostics}
                      onDownloadQc={() => {
                        if (!lastInputs || !doneResult) return;
                        const exact = runAnalysis({ ...lastInputs, method: 'eFDR', efdrMode: 'exact', ...RUN_DEFAULTS });
                        downloadQcCsv(doneResult, exact);
                      }}
                    />
                  )}
                  <button type="button" onClick={() => downloadTsv(state.result)}>⤓ TSV</button>
                  <button type="button" onClick={() => setReport(true)}>⎙ Report</button>
                  <CapsuleBar
                    onShare={() => {
                      if (!lastInputs || !currentFp) return;
                      const capsule: Capsule = { v: 1, inputs: { ...lastInputs, method, efdrMode, steps: shareSteps, seed: shareSeed, ...RUN_DEFAULTS }, fp: currentFp };
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
                      <div className="layout-toggle">
                        <button type="button" className={layoutMode === 'focused' ? 'active' : ''} onClick={() => setLayoutMode('focused')}>Focused</button>
                        <button type="button" className={layoutMode === 'dashboard' ? 'active' : ''} onClick={() => setLayoutMode('dashboard')}>Dashboard</button>
                      </div>
                      {layoutMode === 'dashboard' ? (
                        <div className="dashboard">
                          {selectedId && (() => {
                            const row = state.result.rows.find((r) => r.ontology_id === selectedId);
                            return row ? <DrilldownPanel row={row} meta={state.result.meta} onClose={() => setSelectedId(null)} /> : null;
                          })()}
                          <FigureCard title="Results table" onSettings={() => openSettings('table')}><ResultsTable key={state.result.method} result={state.result} sigOnly={sigOnly} onSelect={setSelectedId} settings={settingsOf('table')} /></FigureCard>
                          <FigureCard title="Lollipop" svgExport onSettings={() => openSettings('lollipop')}><LollipopChart result={state.result} onSelect={setSelectedId} settings={settingsOf('lollipop')} /></FigureCard>
                          <FigureCard title="Bar plot" svgExport onSettings={() => openSettings('barplot')}><Barplot result={state.result} onSelect={setSelectedId} settings={settingsOf('barplot')} /></FigureCard>
                          <FigureCard title="Term–gene network" svgExport onSettings={() => openSettings('network')}><NetworkPlot result={state.result} onSelect={setSelectedId} settings={settingsOf('network')} /></FigureCard>
                          <FigureCard title="Heatmap" svgExport onSettings={() => openSettings('heatmap')}><Heatmap result={state.result} onSelect={setSelectedId} settings={settingsOf('heatmap')} /></FigureCard>
                          <FigureCard title="Venn Diagram" svgExport onSettings={() => openSettings('venn')}><MethodsVenn inputs={lastInputs} settings={settingsOf('venn')} /></FigureCard>
                          <FigureCard title="UpSet plot" svgExport onSettings={() => openSettings('upset')}><UpSetPlot inputs={lastInputs} settings={settingsOf('upset')} /></FigureCard>
                        </div>
                      ) : (
                        <>
                          <ViewTabs active={viewId} onChange={(v) => { setViewId(v); setSelectedId(null); }} />
                          <div className="view-row">
                            <div className="view-main">
                              <FigureCard title={titleForView(viewId)} svgExport={viewId !== 'table'} onSettings={() => openSettings(viewId)}>
                                {viewId === 'table' && <ResultsTable key={state.result.method} result={state.result} sigOnly={sigOnly} onSelect={setSelectedId} settings={settingsOf('table')} />}
                                {viewId === 'lollipop' && <LollipopChart result={state.result} onSelect={setSelectedId} settings={settingsOf('lollipop')} />}
                                {viewId === 'barplot' && <Barplot result={state.result} onSelect={setSelectedId} settings={settingsOf('barplot')} />}
                                {viewId === 'network' && <NetworkPlot result={state.result} onSelect={setSelectedId} settings={settingsOf('network')} />}
                                {viewId === 'heatmap' && <Heatmap result={state.result} onSelect={setSelectedId} settings={settingsOf('heatmap')} />}
                                {viewId === 'venn' && <MethodsVenn inputs={lastInputs} settings={settingsOf('venn')} />}
                                {viewId === 'upset' && <UpSetPlot inputs={lastInputs} settings={settingsOf('upset')} />}
                              </FigureCard>
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
                </>
              )}
            </>
          ) : (
            <>
              {mc.state.status === 'idle' && <div className="state-card">Add a shared ontology + background and ≥2 contrasts, then Compare.</div>}
              {mc.state.status === 'running' && <div className="state-card">Computing…</div>}
              {mc.state.status === 'error' && (
                <div className="error-card"><span className="error-icon">⚠</span><div><strong>Couldn't run the comparison</strong><p>{mc.state.error}</p></div></div>
              )}
              {mc.state.status === 'done' && mcMatrix && (
                <div className="view-row">
                  <div className="view-main">
                    {mcDoneResult && <MultiDiagnostics contrasts={mcDoneResult.contrasts} />}
                    <DotPlot matrix={mcMatrix} onSelect={setMcSelected} />
                  </div>
                  {mcSelected && (() => {
                    const cr = mcDoneResult?.contrasts.find((c) => c.label === mcSelected.contrast);
                    const row = cr?.result.rows.find((r) => r.ontology_id === mcSelected.term);
                    return row && cr ? <DrilldownPanel row={row} meta={cr.result.meta} onClose={() => setMcSelected(null)} /> : null;
                  })()}
                </div>
              )}
            </>
          )}
          </>
          )}
        </main>
      </div>
      {helpOpen && <div className="help-overlay" onClick={() => setHelpOpen(false)} />}
      <HelpDrawer open={helpOpen} onClose={() => setHelpOpen(false)} />
      {validationOpen && <div className="help-overlay" onClick={() => setValidationOpen(false)} />}
      <ValidationDrawer open={validationOpen} onClose={() => setValidationOpen(false)} />
      {derivationOpen && <EfdrDerivation onClose={() => setDerivationOpen(false)} />}
      {settingsFor && <div className="help-overlay" onClick={() => setSettingsFor(null)} />}
      <SettingsDrawer
        open={settingsFor !== null}
        onClose={() => setSettingsFor(null)}
        figureTitle={settingsFor ? titleForView(settingsFor) : 'This figure'}
        tab={settingsTab}
        onTab={setSettingsTab}
        value={drawerValue}
        onChange={applyDrawerPatch}
        palette={palette}
        onPalette={setPalette}
      />
    </div>
  );
}
