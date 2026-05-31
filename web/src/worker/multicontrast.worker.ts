import { runMultiContrast, runMultiContrastMc } from '../multiContrast.ts';
import type { MultiContrastInput } from '../multiContrast.ts';

self.onmessage = async (e: MessageEvent<MultiContrastInput>) => {
  try {
    const i = e.data;
    const result = i.method === 'eFDR' && i.efdrMode === 'resampling'
      ? await runMultiContrastMc(i)
      : runMultiContrast(i);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
