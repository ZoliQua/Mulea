import { describe, it, expect } from 'vitest';
import { qcCsv } from '../src/efdrQc.ts';
import type { ResultRow, EfdrDiagnostics } from '../src/appTypes.ts';

const d: EfdrDiagnostics = { steps: 100000, seed: 42, runtimeMs: 900, maxAbsDeltaVsExact: 0.002, termsCompared: 2, withinNoise: true, clampedToOne: false };
const mc: ResultRow[] = [
  { ontology_id: 'T1', ontology_name: 'one', p_value: 0.01, eFDR: 0.020 },
  { ontology_id: 'T2', ontology_name: 'two', p_value: 0.20, eFDR: 0.500 },
];
const exact: ResultRow[] = [
  { ontology_id: 'T1', ontology_name: 'one', p_value: 0.01, eFDR: 0.018 },
  { ontology_id: 'T2', ontology_name: 'two', p_value: 0.20, eFDR: 0.500 },
];

describe('qcCsv', () => {
  it('emits provenance header, column header, and one row per term', () => {
    const lines = qcCsv(mc, exact, d).split('\n');
    expect(lines[0]).toBe('# mulea — eFDR QC (MC vs exact analytic)');
    expect(lines[1]).toBe('# steps=100000; seed=42');
    expect(lines[2]).toBe('ontology_id\tontology_name\teFDR_mc\teFDR_exact\tabs_delta\tp_value');
    expect(lines[3]).toBe('T1\tone\t0.02\t0.018\t0.0020000000000000018\t0.01');
    expect(lines[4]).toBe('T2\ttwo\t0.5\t0.5\t0\t0.2');
  });
  it('produces a row for every mc term', () => {
    const lines = qcCsv(mc, exact, d).split('\n').filter((l) => l && !l.startsWith('#'));
    expect(lines.length).toBe(1 + mc.length); // header + N
  });
});
