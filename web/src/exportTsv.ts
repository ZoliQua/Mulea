import type { AnalysisResult } from './appTypes.ts';

const EFDR_COLS = ['ontology_id', 'ontology_name', 'nr_common_with_tested_elements', 'nr_common_with_background_elements', 'p_value', 'eFDR'] as const;
const STAT_COLS = ['ontology_id', 'ontology_name', 'p_value', 'adjusted_p_value'] as const;

/** Serialize an AnalysisResult to a TSV string (header + one row per term). */
export function resultToTsv(result: AnalysisResult): string {
  const cols = result.method === 'eFDR' ? EFDR_COLS : STAT_COLS;
  const header = cols.join('\t');
  const body = result.rows
    .map((row) => cols.map((c) => formatCell((row as unknown as Record<string, unknown>)[c])).join('\t'))
    .join('\n');
  return `${header}\n${body}\n`;
}

function formatCell(v: unknown): string {
  if (v === undefined || v === null) return '';
  return String(v);
}

/** Trigger a browser download of the TSV. Browser-only (uses Blob/document). */
export function downloadTsv(result: AnalysisResult, filename = 'mulealab_results.tsv'): void {
  const blob = new Blob([resultToTsv(result)], { type: 'text/tab-separated-values' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
