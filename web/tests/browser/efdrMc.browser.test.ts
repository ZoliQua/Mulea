import { describe, it, expect } from 'vitest';
import { parseGmt } from '../../src/io.ts';
import { filterOntology } from '../../src/ontology.ts';
import { setBasedEnrichmentTest } from '../../src/efdr.ts';
import { setBasedEnrichmentTestMc } from '../../src/efdrMc.ts';

async function loadExample() {
  const [gmtText, t, b] = await Promise.all([
    fetch('/examples/ecoli_regulondb.gmt').then((r) => r.text()),
    fetch('/examples/ecoli_target.txt').then((r) => r.text()),
    fetch('/examples/ecoli_background.txt').then((r) => r.text()),
  ]);
  const lines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return { gmt: filterOntology(parseGmt(gmtText), 3, 400), target: lines(t), background: lines(b) };
}

describe('setBasedEnrichmentTestMc (real Chromium)', () => {
  it('matches the analytic deterministic columns and eFDR within tolerance', async () => {
    const { gmt, target, background } = await loadExample();
    const mc = await setBasedEnrichmentTestMc(gmt, target, background, 100000, 42);
    const analytic = setBasedEnrichmentTest(gmt, target, background);
    expect(mc.length).toBe(analytic.length);
    let maxEfdr = 0;
    mc.forEach((r, i) => {
      const a = analytic[i]!;
      expect(r.nr_common_with_tested_elements).toBe(a.nr_common_with_tested_elements);
      expect(r.p_value).toBeCloseTo(a.p_value, 12);
      maxEfdr = Math.max(maxEfdr, Math.abs(r.eFDR - a.eFDR));
    });
    expect(maxEfdr).toBeLessThanOrEqual(0.01);
  }, 60000);
});
