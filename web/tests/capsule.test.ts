import { describe, it, expect } from 'vitest';
import { fingerprintResult, encodeCapsule, decodeCapsule, capsuleFitsUrl, type Capsule } from '../src/capsule.ts';
import type { AnalysisResult } from '../src/appTypes.ts';

const cap: Capsule = {
  v: 1,
  inputs: { gmtText: 'T1\tt1\tg1\tg2', target: ['g1'], background: ['g1', 'g2'], method: 'eFDR', minNrOfElements: 3, maxNrOfElements: 400 },
  fp: 'deadbeef',
};

function res(rows: { id: string; score: number }[]): AnalysisResult {
  return {
    method: 'eFDR', meta: { nTerms: rows.length, nTargetDropped: 0, poolSize: 100 }, warnings: [],
    rows: rows.map((r) => ({ ontology_id: r.id, ontology_name: r.id, p_value: r.score, eFDR: r.score })),
  };
}

describe('encode/decode', () => {
  it('round-trips a capsule', () => {
    expect(decodeCapsule(encodeCapsule(cap))).toEqual(cap);
  });
  it('returns null for garbage and for the wrong version', () => {
    expect(decodeCapsule('!!!not-base64!!!')).toBeNull();
    expect(decodeCapsule(encodeCapsule({ ...cap, v: 2 as unknown as 1 }))).toBeNull();
  });
});

describe('fingerprintResult', () => {
  it('is deterministic and ignores non-significant rows', () => {
    expect(fingerprintResult(res([{ id: 'A', score: 0.001 }, { id: 'B', score: 0.9 }])))
      .toBe(fingerprintResult(res([{ id: 'A', score: 0.001 }, { id: 'B', score: 0.8 }])));
  });
  it('changes when a significant score changes meaningfully', () => {
    expect(fingerprintResult(res([{ id: 'A', score: 0.001 }])))
      .not.toBe(fingerprintResult(res([{ id: 'A', score: 0.002 }])));
  });
  it('is robust below the toPrecision(8) boundary but sensitive above it', () => {
    // toPrecision(8) resolution for 0.001 is ~5e-11
    expect(fingerprintResult(res([{ id: 'A', score: 0.001 }])))
      .toBe(fingerprintResult(res([{ id: 'A', score: 0.001 + 4e-11 }])));
    expect(fingerprintResult(res([{ id: 'A', score: 0.001 }])))
      .not.toBe(fingerprintResult(res([{ id: 'A', score: 0.001 + 6e-11 }])));
  });
});

describe('capsuleFitsUrl', () => {
  it('true below the limit, false at and past it', () => {
    expect(capsuleFitsUrl('x'.repeat(7999))).toBe(true);
    expect(capsuleFitsUrl('x'.repeat(8000))).toBe(false);
    expect(capsuleFitsUrl('x'.repeat(8001))).toBe(false);
  });
});
