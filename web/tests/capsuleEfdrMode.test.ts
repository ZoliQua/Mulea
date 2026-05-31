import { describe, it, expect } from 'vitest';
import { encodeCapsule, decodeCapsule, type Capsule } from '../src/capsule.ts';

const cap: Capsule = {
  v: 1,
  inputs: { gmtText: 'g', target: ['a'], background: ['a', 'b'], method: 'eFDR', minNrOfElements: 3, maxNrOfElements: 400, efdrMode: 'resampling', steps: 50000, seed: 7 },
  fp: 'deadbeef',
};

describe('capsule efdrMode/steps/seed', () => {
  it('round-trips the resampling params', () => {
    const back = decodeCapsule(encodeCapsule(cap));
    expect(back).not.toBeNull();
    expect(back!.inputs.efdrMode).toBe('resampling');
    expect(back!.inputs.steps).toBe(50000);
    expect(back!.inputs.seed).toBe(7);
  });
  it('still decodes an old capsule without the new fields', () => {
    const old = encodeCapsule({ v: 1, inputs: { gmtText: 'g', target: ['a'], background: ['a'], method: 'eFDR', minNrOfElements: 3, maxNrOfElements: 400 }, fp: 'x' });
    const back = decodeCapsule(old);
    expect(back).not.toBeNull();
    expect(back!.inputs.efdrMode).toBeUndefined();
  });
  it('rejects a bad efdrMode', () => {
    const bad = encodeCapsule({ ...cap, inputs: { ...cap.inputs, efdrMode: 'nope' as unknown as 'exact' } });
    expect(decodeCapsule(bad)).toBeNull();
  });
});
