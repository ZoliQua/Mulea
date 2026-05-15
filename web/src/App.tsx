import { useEffect, useState } from 'react';
import type { AnalysisInput, Method } from './appTypes.ts';
import { useAnalysis } from './hooks/useAnalysis.ts';
import { InputPanel } from './ui/InputPanel.tsx';
import { Controls } from './ui/Controls.tsx';
import { ResultsTable } from './ui/ResultsTable.tsx';
import { LollipopChart } from './ui/LollipopChart.tsx';
import { PrivacyNote } from './ui/PrivacyNote.tsx';
import { downloadTsv } from './exportTsv.ts';

export default function App() {
  const { state, run } = useAnalysis();
  const [method, setMethod] = useState<Method>('eFDR');
  const [sigOnly, setSigOnly] = useState(false);
  const [lastInputs, setLastInputs] = useState<Omit<AnalysisInput, 'method' | 'minNrOfElements' | 'maxNrOfElements'> | null>(null);

  const start = (i: { gmtText: string; target: string[]; background: string[] }) => {
    setLastInputs(i);
    run({ ...i, method, minNrOfElements: 3, maxNrOfElements: 400 });
  };
  useEffect(() => {
    if (lastInputs) run({ ...lastInputs, method, minNrOfElements: 3, maxNrOfElements: 400 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method]);

  return (
    <div className="layout">
      <header className="topbar"><strong>muleaLab</strong> · client-side enrichment + eFDR</header>
      <div className="two-panel">
        <aside className="left">
          <InputPanel onRun={start} disabled={state.status === 'running'} />
          <PrivacyNote />
        </aside>
        <main className="right">
          <Controls method={method} onMethod={setMethod} sigOnly={sigOnly} onSigOnly={setSigOnly} />
          {state.status === 'idle' && <p className="muted">Load inputs (or the example) and press Run.</p>}
          {state.status === 'running' && <p className="muted">Computing…</p>}
          {state.status === 'error' && <p className="error">Error: {state.error}</p>}
          {state.status === 'done' && (
            <>
              {state.result.warnings.map((w) => <p key={w} className="warn">{w}</p>)}
              <button type="button" onClick={() => downloadTsv(state.result)}>⤓ TSV</button>
              <ResultsTable key={state.result.method} result={state.result} sigOnly={sigOnly} />
              <LollipopChart result={state.result} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
