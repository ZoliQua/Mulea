import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { configureEfdrWasm } from '../src/wasm/efdrWasm.ts';
import { measureConvergencePoint, fitLogLogSlope } from '../src/efdrConvergence.ts';

beforeAll(() => {
  const wasm = readFileSync(join(import.meta.dirname, '..', 'src', 'wasm', 'efdr_core.wasm'));
  configureEfdrWasm({ wasmBinary: new Uint8Array(wasm) });
});

// Real E. coli RegulonDB example (the gold-standard inputs), filtered as in the paper.
const EX = join(import.meta.dirname, '..', 'public', 'examples');
const gmt = filterOntology(parseGmt(readFileSync(join(EX, 'ecoli_regulondb.gmt'), 'utf8')), 3, 400);
const target = readFileSync(join(EX, 'ecoli_target.txt'), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const background = readFileSync(join(EX, 'ecoli_background.txt'), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);

const SEEDS = [42, 43, 44, 45, 46];

describe('MC eFDR converges to the analytic eFDR at the CLT rate', () => {
  it('error falls with a log-log slope near −0.5 (O(1/√steps))', async () => {
    const grid = [1000, 4000, 16000, 64000];
    const points = [];
    for (const steps of grid) {
      points.push(await measureConvergencePoint(gmt, target, background, steps, SEEDS));
    }
    // Monotone-ish decay: the coarsest step count must beat the finest.
    expect(points.at(-1)!.rms).toBeLessThan(points[0]!.rms);

    const slope = fitLogLogSlope(points.map((p) => ({ x: p.steps, y: p.rms })));
    // Predicted −0.5; tolerant band absorbs finite-grid / finite-seed noise.
    expect(slope).toBeGreaterThan(-0.8);
    expect(slope).toBeLessThan(-0.25);
  }, 60_000);
});
