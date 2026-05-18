import { describe, it, expect } from 'vitest';
import { reportSummary } from '../src/report.ts';
import type { AnalysisResult } from '../src/appTypes.ts';

function res(): AnalysisResult {
  return {
    method: 'eFDR',
    meta: { nTerms: 5, nTargetDropped: 2, poolSize: 100 },
    warnings: [],
    rows: [
      { ontology_id: 'A', ontology_name: 'A', p_value: 0.001, eFDR: 0.001 },
      { ontology_id: 'B', ontology_name: 'B', p_value: 0.04, eFDR: 0.04 },
      { ontology_id: 'C', ontology_name: 'C', p_value: 0.2, eFDR: 0.2 },
    ],
  };
}

describe('reportSummary', () => {
  it('derives provenance counts from the result and inputs', () => {
    const s = reportSummary(res(), { target: ['g1', 'g2', 'g3'], background: ['g1', 'g2', 'g3', 'g4'] }, 'eFDR');
    expect(s.method).toBe('eFDR');
    expect(s.nTargetGenes).toBe(3);
    expect(s.nBackgroundGenes).toBe(4);
    expect(s.poolSize).toBe(100);
    expect(s.nTargetDropped).toBe(2);
    expect(s.nTermsTested).toBe(5);
    expect(s.nSignificant).toBe(2);
    expect(s.minNrOfElements).toBe(3);
    expect(s.maxNrOfElements).toBe(400);
  });
  it('counts zero significant when nothing passes', () => {
    const r = res();
    r.rows = r.rows.map((x) => ({ ...x, eFDR: 0.5, p_value: 0.5 }));
    expect(reportSummary(r, { target: [], background: [] }, 'eFDR').nSignificant).toBe(0);
  });
});
