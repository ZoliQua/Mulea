/**
 * Reproducible scaling benchmark for the WASM Monte-Carlo eFDR engine.
 *
 *   cd web && node bench/efdr-scaling.mjs > bench/efdr-scaling.md
 *
 * Two axes, on deterministic synthetic data (seeded mulberry32 PRNG → byte-reproducible inputs):
 *   A. permutation depth (fixed problem)   — shows the ~linear cost in `steps`
 *   B. problem size (fixed steps)          — terms × background size
 * Wall-clock is the median of REPEATS runs. Hardware-dependent: the captured
 * environment is printed in the header so the numbers are interpretable.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import { configureEfdrWasm } from '../src/wasm/efdrWasm.ts';
import { setBasedEnrichmentTestMc } from '../src/efdrMc.ts';

const REPEATS = 3;
configureEfdrWasm({ wasmBinary: new Uint8Array(readFileSync(join(import.meta.dirname, '..', 'src', 'wasm', 'efdr_core.wasm'))) });

// Deterministic PRNG (mulberry32) so the synthetic ontology is byte-reproducible.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build a synthetic dataset: `poolSize` background genes, `nTerms` terms of `termSize`, `targetSize` hits. */
function synth(poolSize, nTerms, termSize, targetSize) {
  const background = Array.from({ length: poolSize }, (_, i) => `g${i}`);
  const target = background.slice(0, targetSize);
  const r = rng(12345 + nTerms * 7 + poolSize);
  const gmt = Array.from({ length: nTerms }, (_, t) => {
    const genes = new Set();
    while (genes.size < termSize) genes.add(`g${Math.floor(r() * poolSize)}`);
    return { ontology_id: `T${t}`, ontology_name: `term ${t}`, list_of_values: [...genes] };
  });
  return { gmt, target, background };
}

function median(xs) { const s = [...xs].sort((a, b) => a - b); return s[(s.length - 1) >> 1]; }

async function timeRun(gmt, target, background, steps) {
  const ts = [];
  for (let i = 0; i < REPEATS; i++) {
    const t0 = performance.now();
    await setBasedEnrichmentTestMc(gmt, target, background, steps, 42);
    ts.push(performance.now() - t0);
  }
  return median(ts);
}

const out = [];
const p = (s) => out.push(s);

p('# WASM Monte-Carlo eFDR — scaling benchmark');
p('');
p(`> Reproduce: \`cd web && node bench/efdr-scaling.mjs > bench/efdr-scaling.md\``);
p(`> Environment: Node ${process.version} · ${os.type()} ${os.arch()} · ${os.cpus()[0]?.model ?? 'cpu'} · median of ${REPEATS} runs · seed 42`);
p('');

// A. Permutation depth — fixed mid-size problem.
const baseA = synth(5000, 300, 50, 200);
p('## A. Permutation depth (5000 background · 300 terms · 200 target)');
p('');
p('| steps | wall-clock (ms) |');
p('|---:|---:|');
for (const steps of [1000, 10000, 100000, 1000000]) {
  const ms = await timeRun(baseA.gmt, baseA.target, baseA.background, steps);
  p(`| ${steps.toLocaleString('en-US')} | ${ms.toFixed(0)} |`);
}
p('');

// B. Problem size — fixed steps.
p('## B. Problem size (steps = 10,000)');
p('');
p('| background | terms | term size | target | wall-clock (ms) |');
p('|---:|---:|---:|---:|---:|');
for (const [pool, nTerms, termSize, tgt] of [
  [2000, 100, 50, 100],
  [5000, 300, 50, 200],
  [10000, 1000, 50, 400],
  [20000, 2000, 80, 800],
]) {
  const d = synth(pool, nTerms, termSize, tgt);
  const ms = await timeRun(d.gmt, d.target, d.background, 10000);
  p(`| ${pool.toLocaleString('en-US')} | ${nTerms.toLocaleString('en-US')} | ${termSize} | ${tgt} | ${ms.toFixed(0)} |`);
}
p('');
p('Memory scales with the CSR inputs (Σ term sizes + background) and the histogram');
p('(bounded by selectSize × max term size), not with `steps` — only wall-clock grows with `steps`.');

process.stdout.write(out.join('\n') + '\n');
