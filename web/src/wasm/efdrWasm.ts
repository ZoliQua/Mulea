import createEfdrModule, { type EfdrModule } from './efdr_core.js';

export interface SimBin {
  poolIntersect: number;
  selectIntersect: number;
  count: number;
}

export interface SimulateArgs {
  categoryGenes: Int32Array;
  categoryOffsets: Int32Array;
  nCategories: number;
  poolIds: Int32Array;
  poolSize: number;
  selectSize: number;
  steps: number;
  seed: number;
  nGenes: number;
}

let modPromise: Promise<EfdrModule> | null = null;
let injectedBinary: ArrayBufferView | undefined;

/**
 * Node-only: inject the .wasm bytes before first use (the browser fetches via import.meta.url).
 * Call this BEFORE any loadEfdrModule()/simulateWasm(); it resets the memoized module, so calling
 * it while a load is in flight is unsupported (it would start a second instantiation).
 */
export function configureEfdrWasm(opts: { wasmBinary?: ArrayBufferView }): void {
  injectedBinary = opts.wasmBinary;
  modPromise = null; // allow re-config in tests
}

export function loadEfdrModule(): Promise<EfdrModule> {
  if (!modPromise) {
    modPromise = createEfdrModule(injectedBinary ? { wasmBinary: injectedBinary } : {});
  }
  return modPromise;
}

/** Run the resampling core, returning the (poolIntersect, selectIntersect)->count histogram. */
export async function simulateWasm(args: SimulateArgs): Promise<SimBin[]> {
  const m = await loadEfdrModule();
  const alloc = (n: number): number => {
    const ptr = m._malloc(Math.max(4, n * 4));
    if (ptr === 0) throw new Error('efdr: WASM malloc failed (out of memory)');
    return ptr;
  };
  const catGenesPtr = alloc(args.categoryGenes.length);
  const catOffPtr = alloc(args.categoryOffsets.length);
  const poolPtr = alloc(args.poolIds.length);
  const outBinsPtr = alloc(1);
  try {
    // Read HEAP32 after all mallocs (ALLOW_MEMORY_GROWTH can detach the buffer on growth).
    // No allocation occurs between the three sets, so a single read is valid here.
    let heap = m.HEAP32;
    heap.set(args.categoryGenes, catGenesPtr >> 2);
    heap.set(args.categoryOffsets, catOffPtr >> 2);
    heap.set(args.poolIds, poolPtr >> 2);

    const bufPtr = m._efdr_simulate(
      catGenesPtr, catOffPtr, args.nCategories,
      poolPtr, args.poolSize, args.selectSize, args.steps,
      args.seed >>> 0, args.nGenes, outBinsPtr,
    );

    heap = m.HEAP32; // re-read: the call may have grown memory
    const nBins = heap[outBinsPtr >> 2]!;
    const bins: SimBin[] = [];
    if (bufPtr !== 0 && nBins > 0) {
      const base = bufPtr >> 2;
      for (let i = 0; i < nBins; i++) {
        bins.push({
          poolIntersect: heap[base + 3 * i]!,
          selectIntersect: heap[base + 3 * i + 1]!,
          count: heap[base + 3 * i + 2]!,
        });
      }
      m._efdr_free(bufPtr);
    }
    return bins;
  } finally {
    m._free(catGenesPtr);
    m._free(catOffPtr);
    m._free(poolPtr);
    m._free(outBinsPtr);
  }
}
