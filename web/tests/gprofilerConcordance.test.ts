import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { ora } from '../src/ora.ts';

// ---------------------------------------------------------------------------
// CONCORDANCE (NOT parity) with g:Profiler — a second, independent enrichment
// tool. g:Profiler corrects p-values with g:SCS (Set Counts and Sizes), which
// is fundamentally different from the hypergeometric + Benjamini–Hochberg used
// by muleaLab. So we deliberately do NOT assert p-value equality. We assert:
//   1. the recorded g:Profiler fixture is byte-identical (immutable evidence),
//   2. Spearman of -log10(p) on shared terms is POSITIVE (same ranking signal),
//   3. Jaccard of the significant-term sets is reasonable (the tools broadly
//      agree on which terms are enriched).
//
// HONEST CAVEATS (see VALIDATION.md):
//   - g:Profiler ran on the SAME E. coli target (inst/extdata/target_set.txt)
//     against the SAME RegulonDB GMT, uploaded as a CUSTOM source via
//     gprofiler2::upload_GMT_file() (token gp__1Oiy_tEOL_3bs).
//   - g:Profiler applies its OWN term-size filtering and uses its OWN effective
//     domain (background) by default, so it tested only 53 terms vs muleaLab's
//     154; comparisons are restricted to the shared tested terms.
//   - g:SCS is markedly more conservative than BH, so g:Profiler calls fewer
//     terms significant (its 2 significant terms are a strict subset of
//     muleaLab's 7). This is the expected method difference, not a discrepancy.
// ---------------------------------------------------------------------------

const EX = join(import.meta.dirname, '..', 'public', 'examples');
const FIXTURE = join(import.meta.dirname, '..', '..', 'python', 'tests', 'fixtures', 'gprofiler_concordance.csv');
const SHA256 = '7ea1b17ff7999027199744c3eec8a4e7ed88aa005a95b418205901f562bfbb3e';

const rd = (f: string) => readFileSync(join(EX, f), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
// muleaLab pipeline on the same inputs (same term-size filter the web UI uses).
const gmt = filterOntology(parseGmt(readFileSync(join(EX, 'ecoli_regulondb.gmt'), 'utf8')), 3, 400);
const target = rd('ecoli_target.txt');
const background = rd('ecoli_background.txt');

interface GpRow { term: string; p: number; sig: boolean }
const gp: GpRow[] = readFileSync(FIXTURE, 'utf8').split('\n').slice(1).filter(Boolean).map((l) => {
  // "term","gprofiler_p","gprofiler_sig","term_size","query_hits"
  const c = l.split(',').map((s) => s.replace(/^"|"$/g, ''));
  return { term: c[0]!, p: Number(c[1]), sig: c[2] === 'TRUE' };
});

const web = new Map(ora(gmt, target, background, 'BH').map((r) => [r.ontology_id, r]));

function spearman(a: number[], b: number[]): number {
  const rank = (xs: number[]): number[] => {
    const idx = xs.map((x, i) => [x, i] as const).sort((p, q) => p[0] - q[0]);
    const r = new Array(xs.length).fill(0);
    for (let i = 0; i < idx.length; ) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1]![0] === idx[i]![0]) j++;
      const avg = (i + j) / 2 + 1; // average rank for ties (1-based)
      for (let k = i; k <= j; k++) r[idx[k]![1]] = avg;
      i = j + 1;
    }
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  const mean = (n + 1) / 2;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i]! - mean) * (rb[i]! - mean);
    da += (ra[i]! - mean) ** 2;
    db += (rb[i]! - mean) ** 2;
  }
  return num / Math.sqrt(da * db);
}

describe('ORA concordance with g:Profiler (external tool, g:SCS correction)', () => {
  it('fixture is byte-identical to the recorded SHA-256', () => {
    expect(createHash('sha256').update(readFileSync(FIXTURE)).digest('hex')).toBe(SHA256);
  });

  it('shared tested terms reflect the term-size filtering difference', () => {
    const shared = gp.filter((g) => web.has(g.term));
    // g:Profiler tested 53 terms against the custom GMT. muleaLab's [3,400]
    // term-size filter drops exactly 2 of them — CspA (size 2, < min) and CRP
    // (size 531, > max) — so 51 terms are truly shared. This is the expected
    // filtering difference, documented in VALIDATION.md.
    expect(shared.length).toBe(51);
    expect(gp.length).toBe(53);
    const dropped = gp.filter((g) => !web.has(g.term)).map((g) => g.term).sort();
    expect(dropped).toEqual(['CRP', 'CspA']);
  });

  it('Spearman of -log10(p) on shared terms is positive (rankings agree)', () => {
    const shared = gp.filter((g) => web.has(g.term));
    const muP = shared.map((g) => -Math.log10(web.get(g.term)!.p_value));
    const gpP = shared.map((g) => -Math.log10(g.p));
    const rho = spearman(muP, gpP);
    expect(rho).toBeGreaterThan(0.4); // observed ~0.58
  });

  it('Jaccard of significant-term sets is reasonable, with shared top hits', () => {
    const muSig = new Set([...web.values()].filter((r) => r.adjusted_p_value < 0.05).map((r) => r.ontology_id));
    const gpSig = new Set(gp.filter((g) => g.sig).map((g) => g.term));
    const inter = [...gpSig].filter((t) => muSig.has(t));
    const union = new Set([...muSig, ...gpSig]);
    const jaccard = inter.length / union.size;
    expect(jaccard).toBeGreaterThan(0.2); // observed ~0.29
    // The conservative g:SCS significant set is a strict subset of muleaLab's BH set.
    for (const t of gpSig) expect(muSig.has(t)).toBe(true);
    // Both tools' strongest hits agree.
    expect(gpSig.has('LexA')).toBe(true);
    expect(gpSig.has('FNR')).toBe(true);
    expect(muSig.has('LexA')).toBe(true);
    expect(muSig.has('FNR')).toBe(true);
  });
});
