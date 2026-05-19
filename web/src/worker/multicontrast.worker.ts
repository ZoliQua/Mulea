import { runMultiContrast } from '../multiContrast.ts';
import type { MultiContrastInput } from '../multiContrast.ts';

self.onmessage = (e: MessageEvent<MultiContrastInput>) => {
  try {
    const result = runMultiContrast(e.data);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
