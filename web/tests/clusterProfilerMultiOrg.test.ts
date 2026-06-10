import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { ora } from '../src/ora.ts';
import { pAdjust } from '../src/statistics.ts';

// Multi-organism extension of clusterProfiler.test.ts: the same external ORA reference
// (clusterProfiler::enricher, Bioconductor 4.20.0) on HUMAN and MOUSE TRRUST transcription-factor
// GMTs, proving muleaLab's hypergeometric/BH parity is not E. coli-specific. The synthetic
// target/background are deterministic (seed = 42 in generate_clusterprofiler_multiorg.R).
// clusterProfiler restricts the test to the ANNOTATED universe (background ∩ union of term genes),
// so we run muleaLab on that same universe to keep the hypergeometric test apples-to-apples.
// Fixtures are immutable (regenerate → update each SHA-256).
const FIX = join(import.meta.dirname, '..', '..', 'python', 'tests', 'fixtures');

interface Org {
  name: string;
  gmt: string;
  target: string;
  background: string;
  csv: string;
  sha256: string;
  expectedTerms: number;
}

const ORGS: Org[] = [
  {
    name: 'Homo sapiens',
    gmt: 'gmt_human.gmt',
    target: 'target_human.txt',
    background: 'background_human.txt',
    csv: 'clusterprofiler_human.csv',
    sha256: 'd35805413e7d8b0e512cbdb458cac01d2ae6dc644b179473340e04f4ca4caa81',
    expectedTerms: 378,
  },
  {
    name: 'Mus musculus',
    gmt: 'gmt_mouse.gmt',
    target: 'target_mouse.txt',
    background: 'background_mouse.txt',
    csv: 'clusterprofiler_mouse.csv',
    sha256: '94083eb2d0a5e643464db9402e3ae47541dd1ac5ce67abbc5c0aa2a443517ca4',
    expectedTerms: 379,
  },
];

const rd = (f: string) => readFileSync(join(FIX, f), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);

interface CpRow { id: string; p: number; padj: number }
const readCp = (f: string): CpRow[] =>
  readFileSync(join(FIX, f), 'utf8').split('\n').slice(1).filter(Boolean).map((l) => {
    const m = l.match(/^"([^"]+)",([^,]+),([^,]+)/)!;
    return { id: m[1]!, p: Number(m[2]), padj: Number(m[3]) };
  });

describe.each(ORGS)('ORA parity with clusterProfiler::enricher — $name (external tool)', (org) => {
  // The TRRUST GMTs carry duplicate genes within a term; clusterProfiler works on the unique
  // (term, gene) set, so we dedupe genes within each term BEFORE the size filter — exactly as the
  // R generator does (generate_clusterprofiler_multiorg.R) — to compare the hypergeometric math.
  const parsed = parseGmt(readFileSync(join(FIX, org.gmt), 'utf8')).map((t) => ({
    ...t,
    list_of_values: [...new Set(t.list_of_values)],
  }));
  const gmt = filterOntology(parsed, 3, 400);
  const target = rd(org.target);
  const background = rd(org.background);

  // clusterProfiler's annotated universe = background ∩ union of filtered-term genes.
  const annotated = new Set<string>();
  for (const t of gmt) for (const g of t.list_of_values) annotated.add(g);
  const annBg = background.filter((g) => annotated.has(g));

  const cp = readCp(org.csv);

  it('fixture is byte-identical to the recorded SHA-256', () => {
    expect(createHash('sha256').update(readFileSync(join(FIX, org.csv))).digest('hex')).toBe(org.sha256);
  });

  it('hypergeometric p-values match clusterProfiler exactly on the annotated universe', () => {
    const web = new Map(ora(gmt, target, annBg, 'BH').map((r) => [r.ontology_id, r]));
    let maxRel = 0;
    let compared = 0;
    for (const c of cp) {
      const w = web.get(c.id);
      if (!w) continue; // clusterProfiler drops 0-background-overlap terms; muleaLab keeps them at p=1
      compared++;
      if (c.p > 0) maxRel = Math.max(maxRel, Math.abs(w.p_value - c.p) / c.p);
    }
    expect(compared).toBe(org.expectedTerms);
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
