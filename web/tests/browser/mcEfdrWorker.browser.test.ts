import { describe, it, expect } from 'vitest';
import type { AnalysisInput, AnalysisResult } from '../../src/appTypes.ts';

async function loadExampleInput(): Promise<AnalysisInput> {
  const [gmtText, t, b] = await Promise.all([
    fetch('/examples/ecoli_regulondb.gmt').then((r) => r.text()),
    fetch('/examples/ecoli_target.txt').then((r) => r.text()),
    fetch('/examples/ecoli_background.txt').then((r) => r.text()),
  ]);
  const lines = (s: string) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return { gmtText, target: lines(t), background: lines(b), method: 'eFDR', minNrOfElements: 3, maxNrOfElements: 400, efdrMode: 'resampling', steps: 20000, seed: 42 };
}

describe('mcEfdr.worker (real Chromium)', () => {
  it('returns a full AnalysisResult with diagnostics, loading .wasm off-thread', async () => {
    const input = await loadExampleInput();
    const worker = new Worker(new URL('../../src/worker/mcEfdr.worker.ts', import.meta.url), { type: 'module' });
    const msg = await new Promise<{ ok: boolean; result?: AnalysisResult; error?: string }>((resolve, reject) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.onerror = (e) => reject(new Error(e.message));
      worker.postMessage(input);
    });
    worker.terminate();
    expect(msg.ok).toBe(true);
    expect(msg.result!.method).toBe('eFDR');
    expect(msg.result!.efdrMode).toBe('resampling');
    expect(msg.result!.rows.length).toBeGreaterThan(100);
    expect(msg.result!.diagnostics!.steps).toBe(20000);
    for (const r of msg.result!.rows) {
      expect(Number.isFinite(r.eFDR as number)).toBe(true);
      expect(r.eFDR as number).toBeGreaterThanOrEqual(0);
      expect(r.eFDR as number).toBeLessThanOrEqual(1);
    }
  }, 60000);
});
