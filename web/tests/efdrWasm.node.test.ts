import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { configureEfdrWasm, simulateWasm } from '../src/wasm/efdrWasm.ts';

beforeAll(() => {
  const wasm = readFileSync(join(import.meta.dirname, '..', 'src', 'wasm', 'efdr_core.wasm'));
  configureEfdrWasm({ wasmBinary: new Uint8Array(wasm) });
});

// Two categories over a 4-gene pool; sample 2 of 4 ids, 1000 steps.
const ARGS = {
  categoryGenes: Int32Array.from([0, 1, 2, 3]),   // cat0={0,1}, cat1={2,3}
  categoryOffsets: Int32Array.from([0, 2, 4]),
  nCategories: 2,
  poolIds: Int32Array.from([0, 1, 2, 3]),
  poolSize: 4,
  selectSize: 2,
  steps: 1000,
  seed: 42,
  nGenes: 4,
};

describe('simulateWasm (node)', () => {
  it('histogram counts sum to steps * nCategories', async () => {
    const hist = await simulateWasm(ARGS);
    const total = hist.reduce((s, b) => s + b.count, 0);
    expect(total).toBe(ARGS.steps * ARGS.nCategories);
  });

  it('no bin violates selectIntersect bounds', async () => {
    const hist = await simulateWasm(ARGS);
    for (const b of hist) {
      expect(b.selectIntersect).toBeLessThanOrEqual(ARGS.selectSize);
      expect(b.selectIntersect).toBeLessThanOrEqual(b.poolIntersect);
    }
  });

  it('is deterministic for a fixed seed and differs for another', async () => {
    const a = await simulateWasm(ARGS);
    const b = await simulateWasm(ARGS);
    expect(b).toEqual(a);
    const c = await simulateWasm({ ...ARGS, seed: 7 });
    // same support, but counts must differ somewhere at 1000 steps
    expect(JSON.stringify(c)).not.toBe(JSON.stringify(a));
  });
});
