#!/usr/bin/env bash
# Build + run the native eFDR core tests with clang++.
# Usage: ./build-native.sh   (run from anywhere; resolves repo root itself)
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"

SRC=("$HERE/hyper.cpp" "$HERE/test_efdr.cpp")
# efdr_core.cpp and efdr_convert.cpp are appended here as later tasks add them:
[ -f "$HERE/efdr_core.cpp" ] && SRC+=("$HERE/efdr_core.cpp")
[ -f "$HERE/efdr_convert.cpp" ] && SRC+=("$HERE/efdr_convert.cpp")

clang++ -std=c++17 -O2 -Wall -Wextra -Werror "${SRC[@]}" -o "$HERE/test_efdr"
"$HERE/test_efdr" "$ROOT"
