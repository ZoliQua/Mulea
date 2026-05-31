import { runAnalysis, runAnalysisMc } from './analysis.ts';
import type { AnalysisResult, Method, EfdrMode } from './appTypes.ts';
import { rowScore } from './lollipop.ts';

export interface Contrast { label: string; target: string[] }

export interface MultiContrastInput {
  gmtText: string;
  background: string[];
  contrasts: Contrast[];
  method: Method;
  minNrOfElements: number;
  maxNrOfElements: number;
  efdrMode?: EfdrMode;
  steps?: number;
  seed?: number;
}

export interface MultiContrastResult {
  contrasts: { label: string; result: AnalysisResult }[];
}

export interface DotCell { term: string; contrast: string; score: number; nHits: number; significant: boolean }
export interface DotMatrix {
  terms: { id: string; name: string }[];
  contrasts: string[];
  cells: DotCell[];
}

/** Parse `>label`-delimited contrast blocks. Lines before the first `>` are ignored. Empty label → "contrast N". */
export function parseContrasts(text: string): Contrast[] {
  const out: Contrast[] = [];
  let cur: Contrast | null = null;
  for (const raw of text.split(/\r?\n/).map((l) => l.trim())) {
    if (raw.startsWith('>')) {
      cur = { label: raw.slice(1).trim() || `contrast ${out.length + 1}`, target: [] };
      out.push(cur);
    } else if (cur && raw !== '') {
      cur.target.push(raw);
    }
  }
  return out;
}

/** Run the single-contrast engine once per contrast against the shared GMT + background + method. */
export function runMultiContrast(input: MultiContrastInput): MultiContrastResult {
  return {
    contrasts: input.contrasts.map((c) => ({
      label: c.label,
      result: runAnalysis({
        gmtText: input.gmtText,
        target: c.target,
        background: input.background,
        method: input.method,
        minNrOfElements: input.minNrOfElements,
        maxNrOfElements: input.maxNrOfElements,
      }),
    })),
  };
}

/** Resampling variant: run the async MC engine once per contrast (shared steps/seed). */
export async function runMultiContrastMc(input: MultiContrastInput): Promise<MultiContrastResult> {
  const contrasts: { label: string; result: AnalysisResult }[] = [];
  for (const c of input.contrasts) {
    const result = await runAnalysisMc({
      gmtText: input.gmtText, target: c.target, background: input.background, method: input.method,
      minNrOfElements: input.minNrOfElements, maxNrOfElements: input.maxNrOfElements,
      efdrMode: input.efdrMode, steps: input.steps, seed: input.seed,
    });
    contrasts.push({ label: c.label, result });
  }
  return { contrasts };
}

/** Build the dot-plot matrix: rows = terms significant (score<0.05) in >=1 contrast; cells = present (term, contrast). */
export function dotMatrix(mc: MultiContrastResult): DotMatrix {
  const sig = new Map<string, string>();
  for (const c of mc.contrasts) {
    for (const row of c.result.rows) {
      if (rowScore(row) < 0.05) sig.set(row.ontology_id, row.ontology_name);
    }
  }
  const terms = [...sig].map(([id, name]) => ({ id, name }));
  const cells: DotCell[] = [];
  for (const c of mc.contrasts) {
    const byId = new Map(c.result.rows.map((row) => [row.ontology_id, row]));
    for (const { id } of terms) {
      const row = byId.get(id);
      if (!row) continue;
      const score = rowScore(row);
      cells.push({ term: id, contrast: c.label, score, nHits: row.hits?.length ?? 0, significant: score < 0.05 });
    }
  }
  return { terms, contrasts: mc.contrasts.map((c) => c.label), cells };
}
