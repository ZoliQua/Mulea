import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { ora } from '../src/ora.ts';
import { setBasedEnrichmentTest } from '../src/efdr.ts';

const REPO = join(import.meta.dirname, '..', '..');
const EXTDATA = join(REPO, 'inst', 'extdata');
const FIX = join(REPO, 'python', 'tests', 'fixtures');

function readLines(p: string): string[] {
  return readFileSync(p, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
}

// Minimal CSV parser for R write.csv output (double-quoted character fields).
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

function loadInputs() {
  const gmt = filterOntology(
    parseGmt(readFileSync(join(EXTDATA, 'Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt'), 'utf8')),
    3,
    400,
  );
  const target = readLines(join(EXTDATA, 'target_set.txt'));
  const background = readLines(join(EXTDATA, 'background_set.txt'));
  return { gmt, target, background };
}

describe('parity vs mulea R reference', () => {
  it('ORA (BH) matches the R fixture', () => {
    const { gmt, target, background } = loadInputs();
    const py = ora(gmt, target, background, 'BH').sort((a, b) => a.ontology_id.localeCompare(b.ontology_id));
    const r = readCsv(join(FIX, 'ora_bh_reference.csv')).sort((a, b) => a.ontology_id!.localeCompare(b.ontology_id!));
    expect(py.length).toBe(r.length);
    for (let i = 0; i < py.length; i++) {
      expect(py[i]!.ontology_id).toBe(r[i]!.ontology_id);
      expect(py[i]!.p_value).toBeCloseTo(Number(r[i]!.p_value), 9);
      expect(py[i]!.adjusted_p_value).toBeCloseTo(Number(r[i]!.adjusted_p_value), 9);
    }
  });

  it('exact eFDR matches the R fixture within Monte-Carlo tolerance', () => {
    const { gmt, target, background } = loadInputs();
    const py = setBasedEnrichmentTest(gmt, target, background).sort((a, b) => a.ontology_id.localeCompare(b.ontology_id));
    const r = readCsv(join(FIX, 'ora_efdr_reference.csv')).sort((a, b) => a.ontology_id!.localeCompare(b.ontology_id!));
    expect(py.length).toBe(r.length);

    let maxDiff = 0;
    for (let i = 0; i < py.length; i++) {
      expect(py[i]!.ontology_id).toBe(r[i]!.ontology_id);
      expect(py[i]!.nr_common_with_tested_elements).toBe(Number(r[i]!.nr_common_with_tested_elements));
      expect(py[i]!.nr_common_with_background_elements).toBe(Number(r[i]!.nr_common_with_background_elements));
      expect(py[i]!.p_value).toBeCloseTo(Number(r[i]!.p_value), 9);
      maxDiff = Math.max(maxDiff, Math.abs(py[i]!.eFDR - Number(r[i]!.eFDR)));
    }
    expect(maxDiff).toBeLessThan(0.05);

    const idset = (rows: { ontology_id: string; eFDR: number }[], lt: number) =>
      new Set(rows.filter((x) => x.eFDR < lt).map((x) => x.ontology_id));
    const rRows = r.map((x) => ({ ontology_id: x.ontology_id!, eFDR: Number(x.eFDR) }));
    const clearPy = idset(py, 0.045);
    const possR = idset(rRows, 0.055);
    const clearR = idset(rRows, 0.045);
    const possPy = idset(py, 0.055);
    for (const id of clearPy) expect(possR.has(id)).toBe(true);
    for (const id of clearR) expect(possPy.has(id)).toBe(true);
  });
});
