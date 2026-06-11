import { runAnalysis, runAnalysisMc } from './analysis.ts';
import type { AnalysisResult, Method, EfdrMode } from './appTypes.ts';
import { rowScore } from './lollipop.ts';
import { parseGmt } from './io.ts';
import { filterOntology } from './ontology.ts';
import { gsea, parseRanked, type GseaRow, type RankedItem, type ScoreType } from './gsea.ts';

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

// ──────────────────────────────────────────────────────────────────────────────
// GSEA multi-contrast — run ranked-list GSEA per contrast against a shared GMT.
// Mirrors the ORA multi-contrast structure above but keyed on NES/eFDR per (term,
// contrast) rather than ORA score/hits. ORA paths above are unchanged.
// ──────────────────────────────────────────────────────────────────────────────

/** One named ranked list (gene→score), the GSEA analogue of a `Contrast`'s target set. */
export interface RankedContrast { label: string; ranked: RankedItem[] }

/** Parse `>label`-delimited blocks of `gene<TAB>score` rows into ranked contrasts. */
export function parseRankedContrasts(text: string): RankedContrast[] {
  const out: RankedContrast[] = [];
  let label: string | null = null;
  let buf: string[] = [];
  const flush = () => { if (label !== null) out.push({ label, ranked: parseRanked(buf.join('\n')) }); };
  for (const raw of text.split(/\r?\n/)) {
    const t = raw.trim();
    if (t.startsWith('>')) { flush(); label = t.slice(1).trim() || `contrast ${out.length + 1}`; buf = []; }
    else if (label !== null && t !== '') buf.push(raw);
  }
  flush();
  return out;
}

export interface MultiContrastGseaInput {
  gmtText: string;
  contrasts: RankedContrast[];
  minNrOfElements: number;
  maxNrOfElements: number;
  /** Forwarded verbatim to `gsea()` so every contrast shares one null model. */
  permutations?: number;
  seed?: number;
  gseaParam?: number;
  scoreType?: ScoreType;
}

export interface MultiContrastGseaResult {
  contrasts: { label: string; rows: GseaRow[] }[];
}

/** Which GseaRow field drives dot colour and the <0.05 significance flag. */
export type GseaSigMetric = 'efdr' | 'adjusted_p_value';

export interface GseaDotCell {
  term: string;
  contrast: string;
  nes: number;
  /** The significance metric value (eFDR or BH-adjusted p) — drives colour + the flag. */
  score: number;
  leadingEdge: number;
  significant: boolean;
}
export interface GseaDotMatrix {
  terms: { id: string; name: string }[];
  contrasts: string[];
  cells: GseaDotCell[];
  metric: GseaSigMetric;
}

const GSEA_THRESHOLD = 0.05;

/** GseaRow's significance score under the chosen metric (default: mulea's rank-based eFDR). */
function gseaScore(row: GseaRow, metric: GseaSigMetric): number {
  return metric === 'adjusted_p_value' ? row.adjusted_p_value : row.efdr;
}

/**
 * Run ranked-list GSEA once per contrast against one shared, once-filtered GMT. Every contrast
 * uses the SAME seed / permutations / scoreType / gseaParam so the null models are comparable
 * across columns (cf. `runMultiContrastMc` sharing steps/seed for ORA eFDR).
 */
export function runMultiContrastGsea(input: MultiContrastGseaInput): MultiContrastGseaResult {
  const gmt = filterOntology(parseGmt(input.gmtText), input.minNrOfElements, input.maxNrOfElements);
  return {
    contrasts: input.contrasts.map((c) => ({
      label: c.label,
      rows: gsea(gmt, c.ranked, {
        permutations: input.permutations,
        seed: input.seed,
        gseaParam: input.gseaParam,
        scoreType: input.scoreType,
      }),
    })),
  };
}

/**
 * Build the GSEA dot-plot matrix: rows = terms significant (metric < 0.05) in ≥1 contrast,
 * columns = contrasts. Per cell: `nes` (sign + magnitude), `score` (the chosen metric → colour),
 * `leadingEdge` (leading-edge gene count → dot size). Mirrors `dotMatrix` for ORA.
 */
export function gseaDotMatrix(
  mc: MultiContrastGseaResult, metric: GseaSigMetric = 'efdr',
): GseaDotMatrix {
  const sig = new Map<string, string>();
  for (const c of mc.contrasts) {
    for (const row of c.rows) {
      if (gseaScore(row, metric) < GSEA_THRESHOLD) sig.set(row.ontology_id, row.ontology_name);
    }
  }
  const terms = [...sig].map(([id, name]) => ({ id, name }));
  const cells: GseaDotCell[] = [];
  for (const c of mc.contrasts) {
    const byId = new Map(c.rows.map((row) => [row.ontology_id, row]));
    for (const { id } of terms) {
      const row = byId.get(id);
      if (!row) continue;
      const score = gseaScore(row, metric);
      cells.push({
        term: id,
        contrast: c.label,
        nes: row.nes,
        score,
        leadingEdge: row.leading_edge.length,
        significant: score < GSEA_THRESHOLD,
      });
    }
  }
  return { terms, contrasts: mc.contrasts.map((c) => c.label), cells, metric };
}
