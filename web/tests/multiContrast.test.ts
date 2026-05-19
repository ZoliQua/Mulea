import { describe, it, expect } from 'vitest';
import { parseContrasts, runMultiContrast, dotMatrix, type MultiContrastResult } from '../src/multiContrast.ts';
import { runAnalysis } from '../src/analysis.ts';
import type { AnalysisResult } from '../src/appTypes.ts';

const GMT = 'T1\tterm one\tg1\tg2\tg3\tg4\nT2\tterm two\tg3\tg4\tg5\tg6';
const BG = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'];

describe('parseContrasts', () => {
  it('parses >label-delimited blocks', () => {
    const cs = parseContrasts('junk before\n>cond A\ng1\ng2\n\n>cond B\ng5\ng6');
    expect(cs).toEqual([
      { label: 'cond A', target: ['g1', 'g2'] },
      { label: 'cond B', target: ['g5', 'g6'] },
    ]);
  });
  it('falls back to a numbered label for an empty header and returns [] for empty input', () => {
    expect(parseContrasts('>\ng1')).toEqual([{ label: 'contrast 1', target: ['g1'] }]);
    expect(parseContrasts('   ')).toEqual([]);
  });
});

describe('runMultiContrast parity', () => {
  it('each contrast result equals the single-contrast runAnalysis', () => {
    const input = {
      gmtText: GMT, background: BG, method: 'BH' as const, minNrOfElements: 3, maxNrOfElements: 400,
      contrasts: [{ label: 'A', target: ['g1', 'g2', 'g3'] }, { label: 'B', target: ['g5', 'g6'] }],
    };
    const mc = runMultiContrast(input);
    expect(mc.contrasts.map((c) => c.label)).toEqual(['A', 'B']);
    expect(mc.contrasts[0]!.result).toEqual(runAnalysis({ gmtText: GMT, target: ['g1', 'g2', 'g3'], background: BG, method: 'BH', minNrOfElements: 3, maxNrOfElements: 400 }));
    expect(mc.contrasts[1]!.result).toEqual(runAnalysis({ gmtText: GMT, target: ['g5', 'g6'], background: BG, method: 'BH', minNrOfElements: 3, maxNrOfElements: 400 }));
  });
});

describe('dotMatrix', () => {
  function r(rows: { id: string; score: number; hits: number }[]): AnalysisResult {
    return {
      method: 'eFDR', meta: { nTerms: rows.length, nTargetDropped: 0, poolSize: 100 }, warnings: [],
      rows: rows.map((x) => ({ ontology_id: x.id, ontology_name: `name-${x.id}`, p_value: x.score, eFDR: x.score, hits: Array(x.hits).fill('g') })),
    };
  }
  const mc: MultiContrastResult = {
    contrasts: [
      { label: 'A', result: r([{ id: 'T1', score: 0.001, hits: 5 }, { id: 'T2', score: 0.2, hits: 1 }]) },
      { label: 'B', result: r([{ id: 'T1', score: 0.3, hits: 2 }]) },
    ],
  };
  it('rows = union of significant terms; cells carry score/hits/significance; absent term → no cell', () => {
    const m = dotMatrix(mc);
    expect(m.terms.map((t) => t.id)).toEqual(['T1']);
    expect(m.contrasts).toEqual(['A', 'B']);
    const A = m.cells.find((c) => c.contrast === 'A' && c.term === 'T1')!;
    expect(A).toMatchObject({ score: 0.001, nHits: 5, significant: true });
    const B = m.cells.find((c) => c.contrast === 'B' && c.term === 'T1')!;
    expect(B).toMatchObject({ score: 0.3, nHits: 2, significant: false });
    expect(m.cells.some((c) => c.term === 'T2')).toBe(false);
  });
});
