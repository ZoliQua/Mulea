import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { setBasedEnrichmentTest } from '../src/efdr.ts';
import { setBasedEnrichmentTestMc } from '../src/efdrMc.ts';
import { configureEfdrWasm } from '../src/wasm/efdrWasm.ts';

const REPO = join(import.meta.dirname, '..', '..');
const EXTDATA = join(REPO, 'inst', 'extdata');
const FIX = join(REPO, 'python', 'tests', 'fixtures');
const STEPS = 100000;
const SEED = 42;
const TOL = 0.01;

const readLines = (p: string) =>
  readFileSync(p, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');

function readCsv(p: string): Record<string, string>[] {
  const lines = readFileSync(p, 'utf8').split(/\r?\n/).filter((l) => l !== '');
  const unquote = (s: string) => (s.startsWith('"') && s.endsWith('"') ? s.slice(1, -1) : s);
  const header = lines[0]!.split(',').map(unquote);
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map(unquote);
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cells[i]!));
    return row;
  });
}

const gmt = filterOntology(
  parseGmt(readFileSync(join(EXTDATA, 'Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt'), 'utf8')),
  3, 400,
);
const target = readLines(join(EXTDATA, 'target_set.txt'));
const background = readLines(join(EXTDATA, 'background_set.txt'));

beforeAll(() => {
  const wasm = readFileSync(join(import.meta.dirname, '..', 'src', 'wasm', 'efdr_core.wasm'));
  configureEfdrWasm({ wasmBinary: new Uint8Array(wasm) });
});

describe('setBasedEnrichmentTestMc parity (E. coli)', () => {
  it('deterministic columns match the analytic path exactly', async () => {
    const mc = await setBasedEnrichmentTestMc(gmt, target, background, STEPS, SEED);
    const analytic = setBasedEnrichmentTest(gmt, target, background);
    expect(mc.length).toBe(analytic.length);
    mc.forEach((r, i) => {
      const a = analytic[i]!;
      expect(r.ontology_id).toBe(a.ontology_id);
      expect(r.nr_common_with_tested_elements).toBe(a.nr_common_with_tested_elements);
      expect(r.nr_common_with_background_elements).toBe(a.nr_common_with_background_elements);
      expect(r.p_value).toBeCloseTo(a.p_value, 12);
    });
  });

  it('MC eFDR agrees with the analytic eFDR within tolerance', async () => {
    const mc = await setBasedEnrichmentTestMc(gmt, target, background, STEPS, SEED);
    const analytic = setBasedEnrichmentTest(gmt, target, background);
    let maxDiff = 0;
    mc.forEach((r, i) => { maxDiff = Math.max(maxDiff, Math.abs(r.eFDR - analytic[i]!.eFDR)); });
    expect(maxDiff).toBeLessThanOrEqual(TOL);
  });

  it('MC eFDR agrees with the R fixture within tolerance', async () => {
    const mc = await setBasedEnrichmentTestMc(gmt, target, background, STEPS, SEED);
    const fix = readCsv(join(FIX, 'ora_efdr_reference.csv'));
    const byId = new Map(fix.map((r) => [r.ontology_id!, Number(r.eFDR)]));
    let maxDiff = 0;
    let compared = 0;
    for (const r of mc) {
      const ref = byId.get(r.ontology_id);
      if (ref === undefined) continue;
      maxDiff = Math.max(maxDiff, Math.abs(r.eFDR - ref));
      compared++;
    }
    expect(compared).toBe(mc.length);
    expect(maxDiff).toBeLessThanOrEqual(TOL);
  });

  it('is deterministic for a fixed seed', async () => {
    const a = await setBasedEnrichmentTestMc(gmt, target, background, 5000, 123);
    const b = await setBasedEnrichmentTestMc(gmt, target, background, 5000, 123);
    expect(b.map((r) => r.eFDR)).toEqual(a.map((r) => r.eFDR));
  });
});
