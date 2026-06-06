import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { ora } from '../src/ora.ts';
import { pAdjust } from '../src/statistics.ts';

// Independent ORA reference from clusterProfiler::enricher (Bioconductor 4.20.0) on the SAME
// E. coli inputs — see VALIDATION.md. clusterProfiler restricts the test to the ANNOTATED
// universe (background ∩ union of term genes), so we run muleaLab on that same universe to make
// the hypergeometric test apples-to-apples. The fixture is immutable (regenerate → update hash).
const EX = join(import.meta.dirname, '..', 'public', 'examples');
const FIXTURE = join(import.meta.dirname, '..', '..', 'python', 'tests', 'fixtures', 'clusterprofiler_reference.csv');
const SHA256 = '54b181e4d6aba87c9d60ce0d5cd9878057ebd2406a9518d7331b37882b6fecd7';

const rd = (f: string) => readFileSync(join(EX, f), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const gmt = filterOntology(parseGmt(readFileSync(join(EX, 'ecoli_regulondb.gmt'), 'utf8')), 3, 400);
const target = rd('ecoli_target.txt');
const background = rd('ecoli_background.txt');

// clusterProfiler's annotated universe
const annotated = new Set<string>();
for (const t of gmt) for (const g of t.list_of_values) annotated.add(g);
const annBg = background.filter((g) => annotated.has(g));

interface CpRow { id: string; p: number; padj: number }
const cp: CpRow[] = readFileSync(FIXTURE, 'utf8').split('\n').slice(1).filter(Boolean).map((l) => {
  const m = l.match(/^"([^"]+)",([^,]+),([^,]+)/)!;
  return { id: m[1]!, p: Number(m[2]), padj: Number(m[3]) };
});

describe('ORA parity with clusterProfiler::enricher (external tool)', () => {
  it('fixture is byte-identical to the recorded SHA-256', () => {
    expect(createHash('sha256').update(readFileSync(FIXTURE)).digest('hex')).toBe(SHA256);
  });

  it('hypergeometric p-values match clusterProfiler exactly on the annotated universe', () => {
    const web = new Map(ora(gmt, target, annBg, 'BH').map((r) => [r.ontology_id, r]));
    let maxRel = 0;
    let compared = 0;
    for (const c of cp) {
      const w = web.get(c.id);
      if (!w) continue; // clusterProfiler drops 0-background-overlap terms (e.g. DhaR); muleaLab keeps them at p=1
      compared++;
      if (c.p > 0) maxRel = Math.max(maxRel, Math.abs(w.p_value - c.p) / c.p);
    }
    expect(compared).toBe(153);
    expect(maxRel).toBeLessThan(1e-9); // floating-point identical
  });

  it('BH-adjusted p-values match on the shared tested set', () => {
    const web = new Map(ora(gmt, target, annBg, 'BH').map((r) => [r.ontology_id, r]));
    // Recompute BH over exactly clusterProfiler's tested set so the test count (m) matches.
    const common = cp.filter((c) => web.has(c.id));
    const bhWeb = pAdjust(common.map((c) => web.get(c.id)!.p_value), 'BH');
    let maxRel = 0;
    common.forEach((c, i) => { if (c.padj > 0) maxRel = Math.max(maxRel, Math.abs(bhWeb[i]! - c.padj) / c.padj); });
    expect(maxRel).toBeLessThan(1e-9);
  });
});
