import { describe, it, expect } from 'vitest';
import { simulateWasm } from '../../src/wasm/efdrWasm.ts';

const ARGS = {
  categoryGenes: Int32Array.from([0, 1, 2, 3]),
  categoryOffsets: Int32Array.from([0, 2, 4]),
  nCategories: 2,
  poolIds: Int32Array.from([0, 1, 2, 3]),
  poolSize: 4,
  selectSize: 2,
  steps: 1000,
  seed: 42,
  nGenes: 4,
};

describe('simulateWasm (real Chromium)', () => {
  it('loads the .wasm via fetch and respects the count invariant', async () => {
    const hist = await simulateWasm(ARGS);
    expect(hist.reduce((s, b) => s + b.count, 0)).toBe(ARGS.steps * ARGS.nCategories);
  });

  it('is deterministic for a fixed seed', async () => {
    const a = await simulateWasm(ARGS);
    const b = await simulateWasm(ARGS);
    expect(b).toEqual(a);
  });

  it('survives memory growth on a larger pool (stale-HEAP32 guard)', async () => {
    const poolSize = 20000;
    const poolIds = Int32Array.from({ length: poolSize }, (_, i) => i);
    const nCategories = 500;
    const genes: number[] = [];
    const offsets: number[] = [0];
    for (let c = 0; c < nCategories; c++) {
      for (let g = 0; g < 50; g++) genes.push((c * 7 + g) % poolSize);
      offsets.push(genes.length);
    }
    const hist = await simulateWasm({
      categoryGenes: Int32Array.from(genes),
      categoryOffsets: Int32Array.from(offsets),
      nCategories,
      poolIds,
      poolSize,
      selectSize: 300,
      steps: 200,
      seed: 5,
      nGenes: poolSize,
    });
    expect(hist.reduce((s, b) => s + b.count, 0)).toBe(200 * nCategories);
    for (const b of hist) expect(b.selectIntersect).toBeLessThanOrEqual(b.poolIntersect);
  });
});
