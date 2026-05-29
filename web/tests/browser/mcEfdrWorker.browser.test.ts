import { describe, it, expect } from 'vitest';
import { parseGmt } from '../../src/io.ts';
import { filterOntology } from '../../src/ontology.ts';
import type { EfdrRow } from '../../src/types.ts';
import type { McEfdrInput } from '../../src/worker/mcEfdr.worker.ts';

async function loadExample() {
  const [gmtText, t, b] = await Promise.all([
    fetch('/examples/ecoli_regulondb.gmt').then((r) => r.text()),
    fetch('/examples/ecoli_target.txt').then((r) => r.text()),
    fetch('/examples/ecoli_background.txt').then((r) => r.text()),
  ]);
  const lines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return { gmt: filterOntology(parseGmt(gmtText), 3, 400), target: lines(t), background: lines(b) };
}

describe('mcEfdr.worker (real Chromium)', () => {
  it('loads the .wasm off-thread and returns eFDR rows', async () => {
    const { gmt, target, background } = await loadExample();
    const worker = new Worker(new URL('../../src/worker/mcEfdr.worker.ts', import.meta.url), { type: 'module' });
    const input: McEfdrInput = { gmt, elementNames: target, backgroundElementNames: background, steps: 20000, seed: 42 };
    const result = await new Promise<{ ok: boolean; result?: EfdrRow[]; error?: string }>((resolve, reject) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.onerror = (e) => reject(new Error(e.message));
      worker.postMessage(input);
    });
    worker.terminate();
    expect(result.ok).toBe(true);
    expect(result.result!.length).toBe(gmt.length);
    for (const r of result.result!) {
      expect(Number.isFinite(r.eFDR)).toBe(true);
      expect(r.eFDR).toBeGreaterThanOrEqual(0);
      expect(r.eFDR).toBeLessThanOrEqual(1);
    }
  }, 60000);
});
