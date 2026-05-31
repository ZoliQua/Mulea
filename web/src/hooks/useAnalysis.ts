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
    // Each new Worker(new URL(...)) must be written out separately so Vite can
    // statically detect and bundle each worker as its own chunk. Storing the URL
    // in a variable first breaks Vite's static analysis and causes the worker to
    // be embedded as a data:video/mp2t base64 blob which browsers reject.
    const worker = usesMcWorker(input)
      ? new Worker(new URL('../worker/mcEfdr.worker.ts', import.meta.url), { type: 'module' })
      : new Worker(new URL('../worker/analysis.worker.ts', import.meta.url), { type: 'module' });
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
