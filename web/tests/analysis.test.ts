import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runAnalysis } from '../src/analysis.ts';

const REPO = join(import.meta.dirname, '..', '..');
const EX = join(REPO, 'inst', 'extdata');
const FIX = join(REPO, 'python', 'tests', 'fixtures');

function lines(p: string) {
  return readFileSync(p, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}
function readCsv(p: string) {
  const ls = readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean);
  const uq = (s: string) => (s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s);
  const head = ls[0]!.split(',').map(uq);
  return ls.slice(1).map((l) => Object.fromEntries(l.split(',').map(uq).map((c, i) => [head[i]!, c])));
}
function inputs(method: 'eFDR' | 'BH') {
  return {
    gmtText: readFileSync(join(EX, 'Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt'), 'utf8'),
    target: lines(join(EX, 'target_set.txt')),
    background: lines(join(EX, 'background_set.txt')),
    method,
    minNrOfElements: 3,
    maxNrOfElements: 400,
  } as const;
}

describe('runAnalysis', () => {
  it('eFDR rows match the R fixture (deterministic cols exact, eFDR within MC tol)', () => {
    const res = runAnalysis(inputs('eFDR'));
    expect(res.method).toBe('eFDR');
    const r = readCsv(join(FIX, 'ora_efdr_reference.csv')).sort((a, b) => a.ontology_id!.localeCompare(b.ontology_id!));
    const py = [...res.rows].sort((a, b) => a.ontology_id.localeCompare(b.ontology_id));
    expect(py.length).toBe(r.length);
    let maxDiff = 0;
    for (let i = 0; i < py.length; i++) {
      expect(py[i]!.ontology_id).toBe(r[i]!.ontology_id);
      expect(py[i]!.nr_common_with_tested_elements).toBe(Number(r[i]!.nr_common_with_tested_elements));
      expect(py[i]!.p_value).toBeCloseTo(Number(r[i]!.p_value), 9);
      maxDiff = Math.max(maxDiff, Math.abs(py[i]!.eFDR! - Number(r[i]!.eFDR)));
    }
    expect(maxDiff).toBeLessThan(0.05);
  });

  it('BH rows match the R fixture', () => {
    const res = runAnalysis(inputs('BH'));
    const r = readCsv(join(FIX, 'ora_bh_reference.csv')).sort((a, b) => a.ontology_id!.localeCompare(b.ontology_id!));
    const py = [...res.rows].sort((a, b) => a.ontology_id.localeCompare(b.ontology_id));
    for (let i = 0; i < py.length; i++) {
      expect(py[i]!.adjusted_p_value!).toBeCloseTo(Number(r[i]!.adjusted_p_value), 9);
    }
  });

  it('reports meta and warns about target genes missing from background', () => {
    const res = runAnalysis({
      gmtText: 'T1\tt1\tg1\tg2\tg3\tg4\nT2\tt2\tg5\tg6\tg7\tg8',
      target: ['g1', 'g2', 'gX'],
      background: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8'],
      method: 'BH',
      minNrOfElements: 0,
      maxNrOfElements: 999,
    });
    expect(res.meta.nTargetDropped).toBe(1);
    expect(res.warnings.some((w) => w.includes('not in the background'))).toBe(true);
  });
});

describe('runAnalysis hits', () => {
  it('attaches the target genes present in each term', () => {
    const res = runAnalysis({
      gmtText: 'T1\tt1\tg1\tg2\tg3\nT2\tt2\tg3\tg4\tg5',
      target: ['g1', 'g3', 'gX'], // gX not in background -> dropped from select
      background: ['g1', 'g2', 'g3', 'g4', 'g5'],
      method: 'BH',
      minNrOfElements: 0,
      maxNrOfElements: 999,
    });
    const byId = Object.fromEntries(res.rows.map((r) => [r.ontology_id, r.hits]));
    expect(byId['T1']).toEqual(['g1', 'g3']);
    expect(byId['T2']).toEqual(['g3']);
  });
});
