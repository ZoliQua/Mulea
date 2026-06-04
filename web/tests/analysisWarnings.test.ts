import { describe, it, expect } from 'vitest';
import { runAnalysis } from '../src/analysis.ts';
import type { AnalysisInput } from '../src/appTypes.ts';

const GMT = 'T1\tterm one\tg1\tg2\tg3\tg4\nT2\tterm two\tg3\tg4\tg5\tg6';
const base = (over: Partial<AnalysisInput>): AnalysisInput => ({
  gmtText: GMT, target: ['g1', 'g2'], background: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'],
  method: 'BH', minNrOfElements: 1, maxNrOfElements: 100, ...over,
});

describe('analysis warnings (scientific guards)', () => {
  it('flags a gene-ID namespace mismatch when the ontology genes never occur in the background', () => {
    // background uses Entrez-like ids; the GMT uses symbols → zero overlap
    const r = runAnalysis(base({ background: ['1001', '1002', '1003'], target: ['1001'] }));
    expect(r.warnings.some((w) => /namespace mismatch/i.test(w))).toBe(true);
  });

  it('does NOT flag a mismatch when ontology and background share genes', () => {
    const r = runAnalysis(base({}));
    expect(r.warnings.some((w) => /namespace mismatch/i.test(w))).toBe(false);
  });

  it('reports duplicate target genes', () => {
    const r = runAnalysis(base({ target: ['g1', 'g1', 'g2'] }));
    expect(r.warnings.some((w) => /duplicate gene/i.test(w))).toBe(true);
  });

  it('still reports target genes absent from the background', () => {
    const r = runAnalysis(base({ target: ['g1', 'gX'] }));
    expect(r.warnings.some((w) => /not in the background/i.test(w))).toBe(true);
  });

  it('clean inputs produce none of these warnings', () => {
    const r = runAnalysis(base({}));
    expect(r.warnings.filter((w) => /namespace|duplicate|not in the background/i.test(w))).toHaveLength(0);
  });
});
