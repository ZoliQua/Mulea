import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { parseRanked, rankedSorted } from '../src/gsea.ts';
import { enrichmentScoreWeighted } from '../src/gseaWeighting.ts';

// Independent reference from fgsea::calcGseaStat over scoreType in {pos,neg} x gseaParam in {1,1.5}
// (python/tests/fixtures/generate_fgsea_posneg_reference.R). calcGseaStat is deterministic, so the
// configurable web weighting must match it exactly (same heavy-tie ordered E. coli inputs as gseaEs).
const EX = join(import.meta.dirname, '..', 'public', 'examples');
const FIXTURE = join(import.meta.dirname, '..', '..', 'python', 'tests', 'fixtures', 'fgsea_posneg_reference.csv');

const gmt = filterOntology(parseGmt(readFileSync(join(EX, 'ecoli_regulondb.gmt'), 'utf8')), 3, 400);
const ranked = parseRanked(readFileSync(join(EX, 'ecoli_ranked.tsv'), 'utf8'));

// Same sorted ranked list + per-term boolean mask the gsea() pipeline uses.
const sorted = rankedSorted(ranked);
const sortedScores = sorted.map((s) => s.score);
const index = new Map(sorted.map((s, i) => [s.gene, i]));
function maskFor(id: string): boolean[] {
  const term = gmt.find((t) => t.ontology_id === id);
  const mask = new Array<boolean>(sorted.length).fill(false);
  if (!term) return mask;
  for (const g of term.list_of_values) { const i = index.get(g); if (i !== undefined) mask[i] = true; }
  return mask;
}

interface Row { pathway: string; scoreType: 'pos' | 'neg'; gseaParam: number; es: number }
const rows: Row[] = readFileSync(FIXTURE, 'utf8')
  .split('\n')
  .slice(1)
  .filter(Boolean)
  .map((l) => {
    const m = l.match(/^"([^"]+)","([^"]+)",([^,]+),([^,]+)$/)!;
    return { pathway: m[1]!, scoreType: m[2]! as 'pos' | 'neg', gseaParam: Number(m[3]), es: Number(m[4]) };
  });

// fgsea returns +/-Inf for a term with no genes present in the ranked list (DhaR here): a degenerate
// sentinel, not a physical ES. The web port returns 0 for that case by design (matches gsea.ts), so
// the parity check is over the finite rows only.
const finite = rows.filter((r) => Number.isFinite(r.es));

describe('configurable GSEA weighting parity with fgsea::calcGseaStat', () => {
  it('covers the full scoreType x gseaParam grid', () => {
    expect(rows.length).toBe(616); // 154 terms x {pos,neg} x {1,1.5}
    expect(finite.length).toBe(612); // minus the 4 DhaR degenerate (empty-selection) rows
    expect(new Set(finite.map((r) => `${r.scoreType}|${r.gseaParam}`)).size).toBe(4);
  });

  it('enrichmentScoreWeighted matches fgsea ES to <=1e-9 for each (scoreType, gseaParam)', () => {
    let maxAbs = 0;
    for (const r of finite) {
      const es = enrichmentScoreWeighted(sortedScores, maskFor(r.pathway), r.gseaParam, r.scoreType);
      maxAbs = Math.max(maxAbs, Math.abs(es - r.es));
    }
    expect(maxAbs).toBeLessThan(1e-9);
  });

  it("scoreType 'std' equals the larger-magnitude of pos/neg", () => {
    const mask = maskFor('LexA'); // a term with both up and down deviations
    const pos = enrichmentScoreWeighted(sortedScores, mask, 1, 'pos');
    const neg = enrichmentScoreWeighted(sortedScores, mask, 1, 'neg');
    const std = enrichmentScoreWeighted(sortedScores, mask, 1, 'std');
    expect(std).toBe(pos >= -neg ? pos : neg);
  });
});
