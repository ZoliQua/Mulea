/**
 * Validation scatter: muleaLab hypergeometric p-value vs clusterProfiler::enricher, on the 153
 * shared E. coli terms (annotated universe). Points lie on the y = x diagonal → exact agreement.
 *
 *   cd web && node bench/validation-scatter.mjs   # writes public/validation-cp.svg
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseGmt } from '../src/io.ts';
import { filterOntology } from '../src/ontology.ts';
import { ora } from '../src/ora.ts';

const here = import.meta.dirname;
const EX = join(here, '..', 'public', 'examples');
const rd = (f) => readFileSync(join(EX, f), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
const gmt = filterOntology(parseGmt(readFileSync(join(EX, 'ecoli_regulondb.gmt'), 'utf8')), 3, 400);
const target = rd('ecoli_target.txt');
const background = rd('ecoli_background.txt');
const annotated = new Set();
for (const t of gmt) for (const g of t.list_of_values) annotated.add(g);
const annBg = background.filter((g) => annotated.has(g));
const web = new Map(ora(gmt, target, annBg, 'BH').map((r) => [r.ontology_id, r.p_value]));

const cp = readFileSync(join(here, '..', '..', 'python', 'tests', 'fixtures', 'clusterprofiler_reference.csv'), 'utf8')
  .split('\n').slice(1).filter(Boolean).map((l) => { const m = l.match(/^"([^"]+)",([^,]+),([^,]+)/); return { id: m[1], p: Number(m[2]) }; });

const pts = [];
let maxRel = 0;
for (const c of cp) {
  const w = web.get(c.id);
  if (w === undefined) continue;
  pts.push({ x: c.p, y: w });
  if (c.p > 0) maxRel = Math.max(maxRel, Math.abs(w - c.p) / c.p);
}

// log-log scatter on [1e-7, 1]
const W = 380, H = 360, L = 56, R = 16, T = 30, B = 46;
const lo = -7, hi = 0;
const sx = (p) => L + (Math.log10(Math.max(p, 10 ** lo)) - lo) / (hi - lo) * (W - L - R);
const sy = (p) => T + (hi - Math.log10(Math.max(p, 10 ** lo))) / (hi - lo) * (H - T - B);
const el = [`<rect width="${W}" height="${H}" fill="#ffffff"/>`];
el.push(`<line x1="${L}" y1="${T}" x2="${L}" y2="${H - B}" stroke="#333"/>`);
el.push(`<line x1="${L}" y1="${H - B}" x2="${W - R}" y2="${H - B}" stroke="#333"/>`);
for (let d = lo; d <= hi; d++) {
  el.push(`<line x1="${sx(10 ** d)}" y1="${H - B}" x2="${sx(10 ** d)}" y2="${H - B + 4}" stroke="#333"/>`);
  el.push(`<text x="${sx(10 ** d)}" y="${H - B + 17}" font-size="10" text-anchor="middle" fill="#333">10^${d}</text>`);
  el.push(`<line x1="${L - 4}" y1="${sy(10 ** d)}" x2="${L}" y2="${sy(10 ** d)}" stroke="#333"/>`);
  el.push(`<text x="${L - 7}" y="${sy(10 ** d) + 3}" font-size="10" text-anchor="end" fill="#333">10^${d}</text>`);
}
// y = x diagonal
el.push(`<line x1="${sx(10 ** lo)}" y1="${sy(10 ** lo)}" x2="${sx(1)}" y2="${sy(1)}" stroke="#b15bd1" stroke-width="1.5" stroke-dasharray="5 4"/>`);
el.push(`<text x="${sx(1) - 6}" y="${sy(1) + 16}" font-size="10" text-anchor="end" fill="#b15bd1">y = x</text>`);
for (const p of pts) el.push(`<circle cx="${sx(p.x).toFixed(1)}" cy="${sy(p.y).toFixed(1)}" r="3" fill="#2f6fd0" fill-opacity="0.7"/>`);
el.push(`<text x="${(L + W - R) / 2}" y="${H - 6}" font-size="11" text-anchor="middle" fill="#111">clusterProfiler p-value</text>`);
el.push(`<text x="14" y="${(T + H - B) / 2}" font-size="11" text-anchor="middle" fill="#111" transform="rotate(-90 14 ${(T + H - B) / 2})">muleaLab p-value</text>`);
el.push(`<text x="${L + 6}" y="${T - 12}" font-size="11" fill="#111">${pts.length} shared terms · max rel. Δ ${maxRel.toExponential(1)}</text>`);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n${el.join('\n')}\n</svg>\n`;
writeFileSync(join(here, '..', 'public', 'validation-cp.svg'), svg);
console.log(`wrote public/validation-cp.svg (${pts.length} pts, max rel Δ ${maxRel.toExponential(2)})`);
