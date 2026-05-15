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
    expect(ls[0]).toBe('ontology_id\tontology_name\tnr_common_with_tested_elements\tnr_common_with_background_elements\tp_value\teFDR');
    expect(ls[1]).toBe('A\taname\t5\t20\t0.001\t0.01');
    expect(ls).toHaveLength(3);
  });

  it('writes the BH columns when method is BH', () => {
    const bh: AnalysisResult = {
      method: 'BH', meta: { nTerms: 1, nTargetDropped: 0, poolSize: 10 }, warnings: [],
      rows: [{ ontology_id: 'A', ontology_name: 'aname', p_value: 0.01, adjusted_p_value: 0.02 }],
    };
    const ls = resultToTsv(bh).trimEnd().split('\n');
    expect(ls[0]).toBe('ontology_id\tontology_name\tp_value\tadjusted_p_value');
    expect(ls[1]).toBe('A\taname\t0.01\t0.02');
  });
});
