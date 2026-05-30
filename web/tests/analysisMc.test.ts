import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runAnalysis, runAnalysisMc } from '../src/analysis.ts';
import { configureEfdrWasm } from '../src/wasm/efdrWasm.ts';
import type { AnalysisInput } from '../src/appTypes.ts';

const REPO = join(import.meta.dirname, '..', '..');
const EXTDATA = join(REPO, 'inst', 'extdata');
const rl = (p: string) => readFileSync(p, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');

const gmtText = readFileSync(join(EXTDATA, 'Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt'), 'utf8');
const target = rl(join(EXTDATA, 'target_set.txt'));
const background = rl(join(EXTDATA, 'background_set.txt'));
const input: AnalysisInput = { gmtText, target, background, method: 'eFDR', minNrOfElements: 3, maxNrOfElements: 400, efdrMode: 'resampling', steps: 100000, seed: 42 };

beforeAll(() => {
  configureEfdrWasm({ wasmBinary: new Uint8Array(readFileSync(join(import.meta.dirname, '..', 'src', 'wasm', 'efdr_core.wasm'))) });
});

describe('runAnalysisMc', () => {
  it('returns the AnalysisResult shape with resampling efdrMode + diagnostics', async () => {
    const r = await runAnalysisMc(input);
    expect(r.method).toBe('eFDR');
    expect(r.efdrMode).toBe('resampling');
    expect(r.rows.length).toBeGreaterThan(100);
    expect(r.rows[0]!.hits).toBeDefined();
    expect(r.diagnostics).toBeDefined();
    expect(r.diagnostics!.steps).toBe(100000);
    expect(r.diagnostics!.seed).toBe(42);
    expect(r.diagnostics!.runtimeMs).toBeGreaterThan(0);
  });

  it('deterministic columns equal the exact analytic path, and eFDR converges', async () => {
    const mc = await runAnalysisMc(input);
    const exact = runAnalysis({ ...input, efdrMode: 'exact' });
    expect(mc.rows.length).toBe(exact.rows.length);
    mc.rows.forEach((r, i) => {
      const e = exact.rows[i]!;
      expect(r.ontology_id).toBe(e.ontology_id);
      expect(r.nr_common_with_tested_elements).toBe(e.nr_common_with_tested_elements);
      expect(r.p_value).toBeCloseTo(e.p_value, 12);
    });
    expect(mc.diagnostics!.maxAbsDeltaVsExact).toBeLessThanOrEqual(0.01);
    expect(mc.diagnostics!.withinNoise).toBe(true);
    expect(mc.diagnostics!.termsCompared).toBe(mc.rows.length);
  });

  it('exact eFDR path tags efdrMode=exact and has no diagnostics', () => {
    const r = runAnalysis({ ...input, efdrMode: 'exact' });
    expect(r.efdrMode).toBe('exact');
    expect(r.diagnostics).toBeUndefined();
  });
});
