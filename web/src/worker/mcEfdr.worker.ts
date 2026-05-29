import { setBasedEnrichmentTestMc } from '../efdrMc.ts';
import type { GmtTerm } from '../types.ts';

export interface McEfdrInput {
  gmt: GmtTerm[];
  elementNames: string[];
  backgroundElementNames: string[];
  steps: number;
  seed: number;
}

self.onmessage = async (e: MessageEvent<McEfdrInput>) => {
  try {
    const { gmt, elementNames, backgroundElementNames, steps, seed } = e.data;
    const result = await setBasedEnrichmentTestMc(gmt, elementNames, backgroundElementNames, steps, seed);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
