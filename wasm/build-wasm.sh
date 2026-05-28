#!/usr/bin/env bash
# Compile the eFDR core to WebAssembly. REQUIRES Emscripten (emcc) on PATH.
# This is NOT run during native development/CI in this repo; run it after `emsdk activate`.
#   git clone https://github.com/emscripten-core/emsdk && cd emsdk
#   ./emsdk install latest && ./emsdk activate latest && source ./emsdk_env.sh
# Then from repo root: ./wasm/build-wasm.sh
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"

if ! command -v emcc >/dev/null 2>&1; then
  echo "ERROR: emcc not found. Install Emscripten (emsdk) and source emsdk_env.sh first." >&2
  exit 1
fi

emcc -std=c++17 -O3 \
  "$HERE/efdr_core.cpp" "$HERE/binding.cpp" \
  -o "$HERE/efdr_core.js" \
  -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT=web,worker \
  -s EXPORTED_FUNCTIONS='["_efdr_simulate","_efdr_free","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["HEAP32","getValue"]' \
  -s ALLOW_MEMORY_GROWTH=1

echo "Built $HERE/efdr_core.js + $HERE/efdr_core.wasm"
