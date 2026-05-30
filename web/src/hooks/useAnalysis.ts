import { useCallback, useRef, useState } from 'react';
import type { AnalysisInput, AnalysisResult } from '../appTypes.ts';
import { usesMcWorker } from '../analysis.ts';

type State =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; result: AnalysisResult }
  | { status: 'error'; error: string };

export function useAnalysis() {
  const [state, setState] = useState<State>({ status: 'idle' });
  const workerRef = useRef<Worker | null>(null);

  const run = useCallback((input: AnalysisInput) => {
    workerRef.current?.terminate();
    const url = usesMcWorker(input)
      ? new URL('../worker/mcEfdr.worker.ts', import.meta.url)
      : new URL('../worker/analysis.worker.ts', import.meta.url);
    const worker = new Worker(url, { type: 'module' });
    workerRef.current = worker;
    setState({ status: 'running' });
    worker.onmessage = (e: MessageEvent<{ ok: boolean; result?: AnalysisResult; error?: string }>) => {
      if (e.data.ok && e.data.result) setState({ status: 'done', result: e.data.result });
      else setState({ status: 'error', error: e.data.error ?? 'Unknown error' });
      worker.terminate();
      workerRef.current = null;
    };
    worker.onerror = (e) => {
      setState({ status: 'error', error: e.message });
    };
    worker.postMessage(input);
  }, []);

  return { state, run };
}
