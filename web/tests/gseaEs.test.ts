import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { parseRanked, gseaScores } from '../src/gsea.ts';

// Independent GSEA reference from fgsea 1.38.0 (the exact call mulea's gsea makes). The weighted-KS
// enrichment score is deterministic, so it must match fgsea exactly despite the heavy ties in logFC
// (both sides break ties by stable input order). See VALIDATION.md.
const EX = join(import.meta.dirname, '..', 'public', 'examples');
const FIXTURE = join(import.meta.dirname, '..', '..', 'python', 'tests', 'fixtures', 'fgsea_reference.csv');

const gmt = filterOntology(parseGmt(readFileSync(join(EX, 'ecoli_regulondb.gmt'), 'utf8')), 3, 400);
const ranked = parseRanked(readFileSync(join(EX, 'ecoli_ranked.tsv'), 'utf8'));

interface FgRow { id: string; size: number; es: number; nes: number; pval: number }
const fg: FgRow[] = readFileSync(FIXTURE, 'utf8').split('\n').slice(1).filter(Boolean).map((l) => {
  const m = l.match(/^"([^"]+)",([^,]+),([^,]+),([^,]+),([^,]+),/)!;
  return { id: m[1]!, size: Number(m[2]), es: Number(m[3]), nes: Number(m[4]), pval: Number(m[5]) };
});

describe('GSEA enrichment score parity with fgsea', () => {
  const byId = new Map(gseaScores(gmt, ranked).map((r) => [r.term.ontology_id, r]));

  it('term sizes match fgsea', () => {
    for (const f of fg) expect(byId.get(f.id)?.size).toBe(f.size);
    expect(fg.length).toBe(153);
  });

  it('enrichment scores are numerically identical to fgsea (ties handled identically)', () => {
    let maxAbs = 0;
    for (const f of fg) {
      const w = byId.get(f.id);
      expect(w).toBeDefined();
      maxAbs = Math.max(maxAbs, Math.abs(w!.es - f.es));
    }
    expect(maxAbs).toBeLessThan(1e-9);
  });
});
