import type { AnalysisResult, Method } from '../appTypes.ts';
import { reportSummary } from '../report.ts';
import { ResultsTable } from './ResultsTable.tsx';
import { LollipopChart } from './LollipopChart.tsx';
import { Barplot } from './Barplot.tsx';
import { NetworkPlot } from './NetworkPlot.tsx';
import { Heatmap } from './Heatmap.tsx';
import { MethodsVenn } from './MethodsVenn.tsx';

type Inputs = { gmtText: string; target: string[]; background: string[] };

export function ReportView(props: {
  result: AnalysisResult;
  inputs: Inputs | null;
  method: Method;
  onBack: () => void;
}) {
  if (!props.inputs) return <p className="muted">Run an analysis first.</p>;
  const s = reportSummary(props.result, props.inputs, props.method);
  return (
    <div className="report">
      <div className="report-actions">
        <button type="button" onClick={() => window.print()}>⎙ Save as PDF</button>
        <button type="button" onClick={props.onBack}>← Back</button>
      </div>
      <div className="print-report">
        <header className="report-header">
          <h1>muleaLab — enrichment report</h1>
          <p className="report-method">Multiple-testing correction: <strong>{s.method}</strong></p>
          {props.result.method === 'eFDR' && (
            <p className="report-method">eFDR: <strong>{
              props.result.efdrMode === 'resampling' && props.result.diagnostics
                ? `resampling (steps = ${props.result.diagnostics.steps}, seed = ${props.result.diagnostics.seed})`
                : 'exact (analytic)'
            }</strong></p>
          )}
          <dl className="report-prov">
            <div><dt>Target genes</dt><dd>{s.nTargetGenes}{s.nTargetDropped ? ` (${s.nTargetDropped} not in background, dropped)` : ''}</dd></div>
            <div><dt>Background genes</dt><dd>{s.nBackgroundGenes}</dd></div>
            <div><dt>Pool size</dt><dd>{s.poolSize}</dd></div>
            <div><dt>Terms tested</dt><dd>{s.nTermsTested} (size &gt; {s.minNrOfElements} and &lt; {s.maxNrOfElements})</dd></div>
            <div><dt>Significant terms</dt><dd>{s.nSignificant} (score &lt; 0.05)</dd></div>
          </dl>
          <p className="report-note">Computed fully in-browser; no data left this device. The exact inputs are reproducible via a shareable capsule link (see the Share button).</p>
        </header>

        <section className="report-section">
          <h3>Significant terms</h3>
          <ResultsTable result={props.result} sigOnly={true} />
        </section>

        <section className="report-section"><h3>Lollipop (top terms by score)</h3><LollipopChart result={props.result} /></section>
        <section className="report-section"><h3>Bar plot</h3><Barplot result={props.result} /></section>
        <section className="report-section"><h3>Term–gene network</h3><NetworkPlot result={props.result} /></section>
        <section className="report-section"><h3>Term × gene heatmap</h3><Heatmap result={props.result} /></section>
        <section className="report-section"><h3>Methods comparison (eFDR vs BH vs Bonferroni)</h3><MethodsVenn inputs={props.inputs} /></section>
      </div>
    </div>
  );
}
