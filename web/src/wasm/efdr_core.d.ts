// Type surface for the emscripten ES6 module wasm/build-wasm.sh emits as efdr_core.js.
export interface EfdrModule {
  HEAP32: Int32Array;
  _malloc(bytes: number): number;
  _free(ptr: number): void;
  _efdr_free(ptr: number): void;
  _efdr_simulate(
    categoryGenes: number, categoryOffsets: number, nCategories: number,
    poolIds: number, poolSize: number, selectSize: number, steps: number,
    seed: number, nGenes: number, outBins: number,
  ): number;
}
export interface EfdrModuleArg {
  wasmBinary?: ArrayBufferView;
  locateFile?: (path: string, scriptDir: string) => string;
}
declare const createEfdrModule: (arg?: EfdrModuleArg) => Promise<EfdrModule>;
export default createEfdrModule;
