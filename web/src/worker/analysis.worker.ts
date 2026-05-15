import { runAnalysis } from '../analysis.ts';
import type { AnalysisInput } from '../appTypes.ts';

self.onmessage = (e: MessageEvent<AnalysisInput>) => {
  try {
    const result = runAnalysis(e.data);
    self.postMessage({ ok: true, result });
  } catch (err) {
    self.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
