import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRanked, type RankedItem } from '../src/gsea.ts';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import {
  runMultiContrastGsea,
  gseaDotMatrix,
  type MultiContrastGseaInput,
} from '../src/multiContrast.ts';

// Two GSEA contrasts built from the E. coli ranked example: contrast A is the example as-is,
// contrast B perturbs the scores deterministically (sign-flip a slice + scale) so the two columns
// genuinely differ. Same shared GMT, seed, permutations, scoreType, gseaParam for both.
const EX = join(import.meta.dirname, '..', 'public', 'examples');
const GMT = readFileSync(join(EX, 'ecoli_regulondb.gmt'), 'utf8');
const RANKED = parseRanked(readFileSync(join(EX, 'ecoli_ranked.tsv'), 'utf8'));
const N_TERMS = filterOntology(parseGmt(GMT), 3, 400).length; // GMT terms after the shared filter

/** Deterministic perturbation: scale every score, and flip the sign of every 3rd gene. */
function perturb(items: RankedItem[]): RankedItem[] {
  return items.map((it, i) => ({ gene: it.gene, score: (i % 3 === 0 ? -1 : 1) * it.score * 0.6 }));
}

function input(seed: number): MultiContrastGseaInput {
  return {
    gmtText: GMT,
    minNrOfElements: 3,
    maxNrOfElements: 400,
    permutations: 200,
    seed,
    contrasts: [
      { label: 'wild type', ranked: RANKED },
      { label: 'perturbed', ranked: perturb(RANKED) },
    ],
  };
}

describe('runMultiContrastGsea', () => {
  it('runs gsea() per contrast and returns GseaRow[] for each, keyed by label', () => {
    const res = runMultiContrastGsea(input(42));
    expect(res.contrasts.map((c) => c.label)).toEqual(['wild type', 'perturbed']);
    for (const c of res.contrasts) {
      expect(c.rows.length).toBe(N_TERMS); // every filtered GMT term gets a row, both contrasts alike
      // Each row carries the GSEA fields the dot-plot consumes.
      for (const r of c.rows) {
        expect(typeof r.nes).toBe('number');
        expect(typeof r.efdr).toBe('number');
        expect(Array.isArray(r.leading_edge)).toBe(true);
      }
    }
  });

  it('the perturbed contrast really differs (at least one NES sign flips vs wild type)', () => {
    const res = runMultiContrastGsea(input(42));
    const a = new Map(res.contrasts[0]!.rows.map((r) => [r.ontology_id, r.nes]));
    const b = new Map(res.contrasts[1]!.rows.map((r) => [r.ontology_id, r.nes]));
    let flips = 0;
    for (const [id, na] of a) { const nb = b.get(id); if (nb !== undefined && Math.sign(na) !== Math.sign(nb) && na !== 0 && nb !== 0) flips++; }
    expect(flips).toBeGreaterThan(0);
  });

  it('is deterministic for a fixed seed (identical rows on re-run)', () => {
    const a = runMultiContrastGsea(input(7));
    const b = runMultiContrastGsea(input(7));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('a different seed changes the eFDR/NES (the seed is actually threaded through)', () => {
    const a = runMultiContrastGsea(input(1));
    const b = runMultiContrastGsea(input(2));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});

describe('gseaDotMatrix', () => {
  it('rows = union of terms significant (eFDR<0.05) in ≥1 contrast; columns = contrast labels', () => {
    const res = runMultiContrastGsea(input(42));
    const m = gseaDotMatrix(res); // default metric = 'efdr'
    expect(m.metric).toBe('efdr');
    expect(m.contrasts).toEqual(['wild type', 'perturbed']);

    // Independently compute the expected union of significant term ids.
    const expected = new Set<string>();
    for (const c of res.contrasts) for (const r of c.rows) if (r.efdr < 0.05) expected.add(r.ontology_id);
    expect(new Set(m.terms.map((t) => t.id))).toEqual(expected);
    expect(m.terms.length).toBeGreaterThan(0); // the example yields ≥1 significant term

    // Every cell references a matrix term + contrast and carries nes/score/leadingEdge.
    const termIds = new Set(m.terms.map((t) => t.id));
    for (const cell of m.cells) {
      expect(termIds.has(cell.term)).toBe(true);
      expect(m.contrasts).toContain(cell.contrast);
      expect(typeof cell.nes).toBe('number');
      expect(cell.score).toBeGreaterThanOrEqual(0);
      expect(cell.leadingEdge).toBeGreaterThanOrEqual(0);
      expect(cell.significant).toBe(cell.score < 0.05);
    }
  });

  it('supports the adjusted_p_value metric (BH on the permutation p)', () => {
    const res = runMultiContrastGsea(input(42));
    const m = gseaDotMatrix(res, 'adjusted_p_value');
    expect(m.metric).toBe('adjusted_p_value');
    const expected = new Set<string>();
    for (const c of res.contrasts) for (const r of c.rows) if (r.adjusted_p_value < 0.05) expected.add(r.ontology_id);
    expect(new Set(m.terms.map((t) => t.id))).toEqual(expected);
  });
});
