import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { setBasedEnrichmentTest } from '../src/efdr.ts';
import type { GmtTerm } from '../src/types.ts';

// WORKSTREAM B — optional eFDR clamp (base-R-match mode).
// The web/Python exact eFDR clamps the rExp/rObs ratio to <=1 via min(.,1). Base R mulea does
// NOT clamp (documented in PARITY.md). `clamp` (default true) keeps the bit-identical behaviour;
// `clamp=false` returns the raw ratio, which can exceed 1, matching base R.

const REPO = join(import.meta.dirname, '..', '..');
const EXTDATA = join(REPO, 'inst', 'extdata');

function readLines(p: string): string[] {
  return readFileSync(p, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '');
}

function loadEcoli(): { gmt: GmtTerm[]; target: string[]; background: string[] } {
  const gmt = filterOntology(
    parseGmt(readFileSync(join(EXTDATA, 'Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt'), 'utf8')),
    3,
    400,
  );
  const target = readLines(join(EXTDATA, 'target_set.txt'));
  const background = readLines(join(EXTDATA, 'background_set.txt'));
  return { gmt, target, background };
}

describe('eFDR clamp option (exact engine)', () => {
  it('defaults to clamp=true (no arg) and equals explicit clamp=true', () => {
    const { gmt, target, background } = loadEcoli();
    const def = setBasedEnrichmentTest(gmt, target, background);
    const clamped = setBasedEnrichmentTest(gmt, target, background, true);
    expect(def.map((r) => r.eFDR)).toEqual(clamped.map((r) => r.eFDR));
  });

  it('clamp=true yields all eFDR <= 1 on the E. coli example', () => {
    const { gmt, target, background } = loadEcoli();
    const clamped = setBasedEnrichmentTest(gmt, target, background, true);
    expect(clamped.length).toBeGreaterThan(0);
    for (const r of clamped) {
      expect(r.eFDR).toBeLessThanOrEqual(1);
      expect(r.eFDR).toBeGreaterThanOrEqual(0);
    }
  });

  it('on the E. coli example no exact eFDR exceeds 1, so clamp=false == clamp=true here', () => {
    // Verified empirically: on this real dataset the unclamped exact eFDR maxes at ~0.999...,
    // i.e. no term exceeds 1, so the two modes coincide. The branch itself is exercised — the
    // synthetic case below proves clamp=false can leave a term > 1 (where base R would too).
    const { gmt, target, background } = loadEcoli();
    const clamped = setBasedEnrichmentTest(gmt, target, background, true);
    const raw = setBasedEnrichmentTest(gmt, target, background, false);
    expect(raw.filter((r) => r.eFDR > 1).length).toBe(0);
    expect(raw.map((r) => r.eFDR)).toEqual(clamped.map((r) => r.eFDR));
  });
});

// A small synthetic ontology where the raw rExp/rObs ratio exceeds 1: many overlapping 4-gene
// terms over a 12-gene background with a 3-gene target. This is the base-R behaviour the clamp
// suppresses; here it proves clamp=false returns the un-capped ratio while clamp=true caps it.
const denseBackground = Array.from({ length: 12 }, (_, i) => `g${i}`);
const denseGmt: GmtTerm[] = Array.from({ length: 8 }, (_, i) => ({
  ontology_id: `T${i}`,
  ontology_name: `T${i}`,
  list_of_values: denseBackground.slice(i, i + 4),
}));
const denseTarget = ['g0', 'g1', 'g2'];

describe('eFDR clamp option — un-capped ratio path', () => {
  it('clamp=false leaves at least one term > 1 while clamp=true caps it at 1', () => {
    const raw = setBasedEnrichmentTest(denseGmt, denseTarget, denseBackground, false);
    const clamped = setBasedEnrichmentTest(denseGmt, denseTarget, denseBackground, true);

    const over = raw.filter((r) => r.eFDR > 1);
    expect(over.length).toBeGreaterThan(0);
    expect(Math.max(...raw.map((r) => r.eFDR))).toBeGreaterThan(1);

    // clamp=true never exceeds 1, and every clamped value is min(raw, 1).
    for (let i = 0; i < raw.length; i++) {
      expect(clamped[i]!.eFDR).toBeLessThanOrEqual(1);
      expect(clamped[i]!.eFDR).toBeCloseTo(Math.min(raw[i]!.eFDR, 1), 15);
    }
    // Below the cap the two modes agree exactly.
    for (let i = 0; i < raw.length; i++) {
      if (raw[i]!.eFDR <= 1) expect(clamped[i]!.eFDR).toBe(raw[i]!.eFDR);
    }
  });
});
