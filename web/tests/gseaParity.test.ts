import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { parseRanked, gsea } from '../src/gsea.ts';

// GSEA parity with fgsea 1.38.0 (see VALIDATION.md). ES is exact (gseaEs.test.ts); NES and the
// p-value come from a classic gene-permutation null vs fgsea's multilevel p, so they are
// tolerance-parity: NES sign + magnitude agree closely, significant sets nearly coincide.
const EX = join(import.meta.dirname, '..', 'public', 'examples');
const FIXTURE = join(import.meta.dirname, '..', '..', 'python', 'tests', 'fixtures', 'fgsea_reference.csv');
const SHA256 = 'ee4015830ef75b9ccbb77519df5abb7134180f802261364d881dab34cd27cc81';

const gmt = filterOntology(parseGmt(readFileSync(join(EX, 'ecoli_regulondb.gmt'), 'utf8')), 3, 400);
const ranked = parseRanked(readFileSync(join(EX, 'ecoli_ranked.tsv'), 'utf8'));

interface FgRow { id: string; nes: number; padj: number }
const fg: FgRow[] = readFileSync(FIXTURE, 'utf8').split('\n').slice(1).filter(Boolean).map((l) => {
  const m = l.match(/^"([^"]+)",([^,]+),([^,]+),([^,]+),([^,]+),([^,]+)/)!;
  return { id: m[1]!, nes: Number(m[4]), padj: Number(m[6]) };
});

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i++) { num += (a[i]! - ma) * (b[i]! - mb); da += (a[i]! - ma) ** 2; db += (b[i]! - mb) ** 2; }
  return num / Math.sqrt(da * db);
}

describe('GSEA NES/p parity with fgsea (tolerance — multilevel vs classic permutation)', () => {
  const web = new Map(gsea(gmt, ranked, { permutations: 2000, seed: 42 }).map((r) => [r.ontology_id, r]));

  it('fixture is byte-identical to the recorded SHA-256', () => {
    expect(createHash('sha256').update(readFileSync(FIXTURE)).digest('hex')).toBe(SHA256);
  });

  it('NES signs agree on every term and NES values correlate ≥ 0.99', () => {
    const wn: number[] = []; const fn: number[] = [];
    for (const f of fg) {
      const w = web.get(f.id)!;
      expect(Math.sign(w.nes)).toBe(Math.sign(f.nes));
      wn.push(w.nes); fn.push(f.nes);
    }
    expect(pearson(wn, fn)).toBeGreaterThan(0.99);
  });

  it('significant sets (adj p < 0.05) nearly coincide (Jaccard ≥ 0.75)', () => {
    const wSig = new Set(fg.filter((f) => web.get(f.id)!.adjusted_p_value < 0.05).map((f) => f.id));
    const fSig = new Set(fg.filter((f) => f.padj < 0.05).map((f) => f.id));
    const inter = [...wSig].filter((x) => fSig.has(x)).length;
    const union = new Set([...wSig, ...fSig]).size;
    expect(inter / union).toBeGreaterThanOrEqual(0.75);
  });
});
