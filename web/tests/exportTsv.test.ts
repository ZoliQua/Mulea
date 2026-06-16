import { describe, it, expect } from 'vitest';
import { resultToTsv } from '../src/exportTsv.ts';
import type { AnalysisResult } from '../src/appTypes.ts';

const efdrResult: AnalysisResult = {
  method: 'eFDR',
  meta: { nTerms: 2, nTargetDropped: 0, poolSize: 100 },
  warnings: [],
  rows: [
    { ontology_id: 'A', ontology_name: 'aname', p_value: 0.001, eFDR: 0.01, nr_common_with_tested_elements: 5, nr_common_with_background_elements: 20 },
    { ontology_id: 'B', ontology_name: 'bname', p_value: 0.5, eFDR: 0.9, nr_common_with_tested_elements: 1, nr_common_with_background_elements: 30 },
  ],
};

describe('resultToTsv', () => {
  it('writes the eFDR columns with a header and tab-separated rows', () => {
    const tsv = resultToTsv(efdrResult);
    const ls = tsv.trimEnd().split('\n');
    // ls[0] = '# mulea — method=eFDR', ls[1] = '# efdrMode=exact (analytic)', ls[2] = data header
    expect(ls[0]).toBe('# mulea — method=eFDR');
    expect(ls[2]).toBe('ontology_id\tontology_name\tnr_common_with_tested_elements\tnr_common_with_background_elements\tp_value\teFDR');
    expect(ls[3]).toBe('A\taname\t5\t20\t0.001\t0.01');
    expect(ls).toHaveLength(5);
  });

  it('writes the BH columns when method is BH', () => {
    const bh: AnalysisResult = {
      method: 'BH', meta: { nTerms: 1, nTargetDropped: 0, poolSize: 10 }, warnings: [],
      rows: [{ ontology_id: 'A', ontology_name: 'aname', p_value: 0.01, adjusted_p_value: 0.02 }],
    };
    const ls = resultToTsv(bh).trimEnd().split('\n');
    // ls[0] = '# mulea — method=BH', ls[1] = data header (no eFDR-specific prov line for BH)
    expect(ls[0]).toBe('# mulea — method=BH');
    expect(ls[1]).toBe('ontology_id\tontology_name\tp_value\tadjusted_p_value');
    expect(ls[2]).toBe('A\taname\t0.01\t0.02');
  });
});

describe('resultToTsv provenance', () => {
  const mk = (over: Partial<AnalysisResult>): AnalysisResult => ({
    rows: [{ ontology_id: 'T1', ontology_name: 'one', p_value: 0.01, eFDR: 0.02, nr_common_with_tested_elements: 2, nr_common_with_background_elements: 5 }],
    method: 'eFDR', meta: { nTerms: 1, nTargetDropped: 0, poolSize: 10 }, warnings: [], ...over,
  });
  it('prepends resampling provenance, data header next', () => {
    const tsv = resultToTsv(mk({ efdrMode: 'resampling', diagnostics: { steps: 100000, seed: 42, runtimeMs: 1, maxAbsDeltaVsExact: 0.001, termsCompared: 1, withinNoise: true, clampedToOne: false } }));
    const lines = tsv.split('\n');
    expect(lines[0]).toBe('# mulea — method=eFDR');
    expect(lines[1]).toBe('# efdrMode=resampling; steps=100000; seed=42');
    expect(lines[2]).toBe('ontology_id\tontology_name\tnr_common_with_tested_elements\tnr_common_with_background_elements\tp_value\teFDR');
    expect(lines[3]).toContain('T1');
  });
  it('marks exact eFDR provenance', () => {
    expect(resultToTsv(mk({ efdrMode: 'exact' })).split('\n')[1]).toBe('# efdrMode=exact (analytic)');
  });
});
