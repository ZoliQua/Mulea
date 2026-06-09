import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { parseRanked, gsea } from '../src/gsea.ts';

// mulea's progressive rank-based eFDR (Turek et al. 2024), extended from ORA to the GSEA NES
// statistic. This is the resampling-rank FDR, NOT a replacement for fgsea's BH-on-p
// `adjusted_p_value`. Validated on the E. coli RegulonDB example: every eFDR ∈ [0,1]; the eFDR
// shrinks as |NES| grows (Spearman(|NES|, eFDR) < 0); and it tracks fgsea's adjusted p
// (Spearman(eFDR, adjusted_p_value) > 0.7). See PARITY.md / gsea.ts for the definition.
const EX = join(import.meta.dirname, '..', 'public', 'examples');
const gmt = filterOntology(parseGmt(readFileSync(join(EX, 'ecoli_regulondb.gmt'), 'utf8')), 3, 400);
const ranked = parseRanked(readFileSync(join(EX, 'ecoli_ranked.tsv'), 'utf8'));

/** Spearman rank correlation (average ranks for ties). */
function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]): number[] => {
    const order = xs.map((_, i) => i).sort((p, q) => xs[p]! - xs[q]!);
    const r = new Array<number>(xs.length);
    let i = 0;
    while (i < order.length) {
      let j = i;
      while (j + 1 < order.length && xs[order[j + 1]!]! === xs[order[i]!]!) j++;
      const avg = (i + j) / 2 + 1; // 1-based average rank over the tie block
      for (let t = i; t <= j; t++) r[order[t]!] = avg;
      i = j + 1;
    }
    return r;
  };
  const ra = rank(a); const rb = rank(b);
  const n = ra.length;
  const ma = ra.reduce((s, x) => s + x, 0) / n;
  const mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i++) { num += (ra[i]! - ma) * (rb[i]! - mb); da += (ra[i]! - ma) ** 2; db += (rb[i]! - mb) ** 2; }
  return num / Math.sqrt(da * db);
}

describe('GSEA progressive rank-based eFDR (mulea ORA eFDR extended to NES)', () => {
  const rows = gsea(gmt, ranked, { permutations: 2000, seed: 42 });

  it('produces a row per filtered term, each carrying an efdr field', () => {
    expect(rows.length).toBe(gmt.length); // one row per filtered ontology term
    for (const r of rows) expect(typeof r.efdr).toBe('number');
  });

  it('every eFDR is finite and in [0, 1]', () => {
    for (const r of rows) {
      expect(Number.isFinite(r.efdr)).toBe(true);
      expect(r.efdr).toBeGreaterThanOrEqual(0);
      expect(r.efdr).toBeLessThanOrEqual(1);
    }
  });

  it('larger |NES| → smaller eFDR (Spearman(|NES|, eFDR) < 0)', () => {
    const absNes = rows.map((r) => Math.abs(r.nes));
    const efdr = rows.map((r) => r.efdr);
    expect(spearman(absNes, efdr)).toBeLessThan(0);
  });

  it('eFDR correlates with fgsea-style adjusted p (Spearman > 0.7)', () => {
    const efdr = rows.map((r) => r.efdr);
    const adj = rows.map((r) => r.adjusted_p_value);
    expect(spearman(efdr, adj)).toBeGreaterThan(0.7);
  });
});
