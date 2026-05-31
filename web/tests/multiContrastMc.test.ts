import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runMultiContrastMc, type MultiContrastInput } from '../src/multiContrast.ts';
import { configureEfdrWasm } from '../src/wasm/efdrWasm.ts';

const REPO = join(import.meta.dirname, '..', '..');
const EXTDATA = join(REPO, 'inst', 'extdata');
const rl = (p: string) => readFileSync(p, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
const gmtText = readFileSync(join(EXTDATA, 'Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt'), 'utf8');
const target = rl(join(EXTDATA, 'target_set.txt'));
const background = rl(join(EXTDATA, 'background_set.txt'));

beforeAll(() => {
  configureEfdrWasm({ wasmBinary: new Uint8Array(readFileSync(join(import.meta.dirname, '..', 'src', 'wasm', 'efdr_core.wasm'))) });
});

describe('runMultiContrastMc', () => {
  it('produces per-contrast resampling results with diagnostics', async () => {
    const input: MultiContrastInput = {
      gmtText, background, method: 'eFDR', minNrOfElements: 3, maxNrOfElements: 400,
      efdrMode: 'resampling', steps: 20000, seed: 42,
      contrasts: [{ label: 'A', target }, { label: 'B', target: target.slice(0, Math.ceil(target.length / 2)) }],
    };
    const res = await runMultiContrastMc(input);
    expect(res.contrasts.map((c) => c.label)).toEqual(['A', 'B']);
    for (const c of res.contrasts) {
      expect(c.result.efdrMode).toBe('resampling');
      expect(c.result.diagnostics!.steps).toBe(20000);
      expect(c.result.rows.length).toBeGreaterThan(100);
    }
  });
});
