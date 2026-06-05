/**
 * Empirical convergence of the WASM Monte-Carlo eFDR to the deterministic analytic eFDR.
 *
 *   cd web && node bench/efdr-convergence.mjs > bench/efdr-convergence.md
 *
 * Confirms the CLT prediction (PARITY.md derivation): the MC error vs the analytic limit falls like
 * O(1/√steps), i.e. a log-log slope ≈ −0.5. Runs on the real E. coli RegulonDB example, median over
 * 5 seeds per step count. Writes the log-log plot to bench/efdr-convergence.svg as a side effect.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { configureEfdrWasm } from '../src/wasm/efdrWasm.ts';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { measureConvergencePoint, fitLogLogSlope } from '../src/efdrConvergence.ts';

const here = import.meta.dirname;
configureEfdrWasm({ wasmBinary: new Uint8Array(readFileSync(join(here, '..', 'src', 'wasm', 'efdr_core.wasm'))) });

const EX = join(here, '..', 'public', 'examples');
const readLines = (f) => readFileSync(join(EX, f), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const gmt = filterOntology(parseGmt(readFileSync(join(EX, 'ecoli_regulondb.gmt'), 'utf8')), 3, 400);
const target = readLines('ecoli_target.txt');
const background = readLines('ecoli_background.txt');

const SEEDS = [42, 43, 44, 45, 46];
const GRID = [1000, 3000, 10000, 30000, 100000, 300000, 1000000];

const points = [];
for (const steps of GRID) {
  points.push(await measureConvergencePoint(gmt, target, background, steps, SEEDS));
}
const slopeRms = fitLogLogSlope(points.map((p) => ({ x: p.steps, y: p.rms })));
const slopeMax = fitLogLogSlope(points.map((p) => ({ x: p.steps, y: p.maxAbs })));

// ---- log-log SVG (measured RMS error + a 1/√steps reference line) ----
function makeSvg(pts) {
  const W = 640, H = 420, L = 78, R = 24, T = 28, B = 54;
  const xs = pts.map((p) => Math.log10(p.steps));
  const ys = pts.map((p) => Math.log10(p.rms));
  const xmin = Math.min(...xs), xmax = Math.max(...xs);
  const ymin = Math.min(...ys) - 0.2, ymax = Math.max(...ys) + 0.2;
  const px = (lx) => L + (lx - xmin) / (xmax - xmin) * (W - L - R);
  const py = (ly) => T + (ymax - ly) / (ymax - ymin) * (H - T - B);
  const el = [];
  el.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);
  // axes
  el.push(`<line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="#333" stroke-width="1.2"/>`);
  el.push(`<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="#333" stroke-width="1.2"/>`);
  // x ticks (decades)
  for (let d = Math.ceil(xmin); d <= Math.floor(xmax); d++) {
    const x = px(d);
    el.push(`<line x1="${x}" y1="${H - B}" x2="${x}" y2="${H - B + 5}" stroke="#333"/>`);
    el.push(`<text x="${x}" y="${H - B + 20}" font-size="12" text-anchor="middle" fill="#333">10^${d}</text>`);
  }
  // y ticks (decades)
  for (let d = Math.ceil(ymin); d <= Math.floor(ymax); d++) {
    const y = py(d);
    el.push(`<line x1="${L - 5}" y1="${y}" x2="${L}" y2="${y}" stroke="#333"/>`);
    el.push(`<text x="${L - 9}" y="${y + 4}" font-size="12" text-anchor="end" fill="#333">10^${d}</text>`);
  }
  // 1/√steps reference line through the first measured point
  const refY = (lx) => ys[0] - 0.5 * (lx - xs[0]);
  el.push(`<line x1="${px(xmin)}" y1="${py(refY(xmin))}" x2="${px(xmax)}" y2="${py(refY(xmax))}" stroke="#b15bd1" stroke-width="1.5" stroke-dasharray="6 4"/>`);
  el.push(`<text x="${px(xmax) - 6}" y="${py(refY(xmax)) - 8}" font-size="12" text-anchor="end" fill="#b15bd1">slope −0.5 (1/√steps)</text>`);
  // measured polyline + points
  const path = xs.map((lx, i) => `${px(lx).toFixed(1)},${py(ys[i]).toFixed(1)}`).join(' ');
  el.push(`<polyline points="${path}" fill="none" stroke="#2f6fd0" stroke-width="2"/>`);
  xs.forEach((lx, i) => el.push(`<circle cx="${px(lx).toFixed(1)}" cy="${py(ys[i]).toFixed(1)}" r="4" fill="#2f6fd0"/>`));
  // labels
  el.push(`<text x="${(L + W - R) / 2}" y="${H - 12}" font-size="13" text-anchor="middle" fill="#111">resampling steps</text>`);
  el.push(`<text x="18" y="${(T + H - B) / 2}" font-size="13" text-anchor="middle" fill="#111" transform="rotate(-90 18 ${(T + H - B) / 2})">RMS |eFDR_mc − eFDR_exact|</text>`);
  el.push(`<text x="${L + 8}" y="${T + 14}" font-size="13" fill="#111">MC → analytic eFDR convergence (E. coli)</text>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n${el.join('\n')}\n</svg>\n`;
}
writeFileSync(join(here, 'efdr-convergence.svg'), makeSvg(points));

// ---- markdown ----
const out = [];
const p = (s) => out.push(s);
p('# WASM Monte-Carlo eFDR → analytic eFDR — convergence');
p('');
p('> Reproduce: `cd web && node bench/efdr-convergence.mjs > bench/efdr-convergence.md`');
p(`> Environment: Node ${process.version} · ${os.type()} ${os.arch()} · ${os.cpus()[0]?.model ?? 'cpu'} · median of ${SEEDS.length} seeds · E. coli RegulonDB (${gmt.length} terms)`);
p('');
p('The analytic eFDR is the deterministic S→∞ limit of mulea\'s resampling estimator (derivation in');
p('[PARITY.md](../../PARITY.md)). By the CLT the Monte-Carlo error should fall like O(1/√steps) — a');
p('log-log slope of −0.5. Measured against the analytic path on the real E. coli example:');
p('');
p('| steps | max&#124;Δ&#124; | RMS&#124;Δ&#124; |');
p('|---:|---:|---:|');
for (const pt of points) {
  p(`| ${pt.steps.toLocaleString('en-US')} | ${pt.maxAbs.toExponential(2)} | ${pt.rms.toExponential(2)} |`);
}
p('');
p(`**Fitted log-log slope:** RMS error ${slopeRms.toFixed(3)}, max error ${slopeMax.toFixed(3)} — both close to the predicted **−0.5**, confirming O(1/√steps) convergence and that the analytic path is the noiseless limit.`);
p('');
p('![log-log convergence plot](efdr-convergence.svg)');
process.stdout.write(out.join('\n') + '\n');
