import type { AnalysisResult, ResultRow, EfdrDiagnostics } from './appTypes.ts';

const QC_COLS = ['ontology_id', 'ontology_name', 'eFDR_mc', 'eFDR_exact', 'abs_delta', 'p_value'] as const;

/**
 * Per-term MC-vs-exact eFDR QC table (TAB-separated, with a `#` provenance header).
 * mcRows and exactRows are joined by index (both share the same term order).
 */
export function qcCsv(mcRows: ResultRow[], exactRows: ResultRow[], d: EfdrDiagnostics): string {
  const prov = [
    '# mulea — eFDR QC (MC vs exact analytic)',
    `# steps=${d.steps}; seed=${d.seed}`,
  ];
  const header = QC_COLS.join('\t');
  const body = mcRows
    .map((mc, i) => {
      const exE = exactRows[i]?.eFDR ?? NaN;
      const mcE = mc.eFDR ?? NaN;
      const absDelta = Number.isFinite(mcE) && Number.isFinite(exE) ? Math.abs(mcE - exE) : NaN;
      return [mc.ontology_id, mc.ontology_name, String(mcE), String(exE), String(absDelta), String(mc.p_value)].join('\t');
    })
    .join('\n');
  return `${prov.join('\n')}\n${header}\n${body}\n`;
}

/** Trigger a browser download of the QC table. Browser-only (Blob/document). No-op without diagnostics. */
export function downloadQcCsv(mcResult: AnalysisResult, exactResult: AnalysisResult, filename = 'mulea_efdr_qc.tsv'): void {
  if (!mcResult.diagnostics) return;
  const blob = new Blob([qcCsv(mcResult.rows, exactResult.rows, mcResult.diagnostics)], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
