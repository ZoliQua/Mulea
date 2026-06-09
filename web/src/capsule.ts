import type { AnalysisResult, Method, EfdrMode } from './appTypes.ts';
import { rowScore } from './lollipop.ts';

export interface Capsule {
  v: 1;
  inputs: {
    gmtText: string; target: string[]; background: string[];
    method: Method; minNrOfElements: number; maxNrOfElements: number;
    efdrMode?: EfdrMode; steps?: number; seed?: number;
    direction?: 'over' | 'under' | 'two-sided';
  };
  fp: string;
}

/** FNV-1a 32-bit string hash (hex). Not cryptographic — a reproducibility check. */
function hash32(s: string): string {
  // Hashes the UTF-16 code units of s (not UTF-8 bytes); deterministic per ECMA-262.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Engine-independent fingerprint of the significant rows (id + 8-sig-fig score), sorted.
 *  The 0.05 significance cutoff is frozen as part of capsule schema v1. */
export function fingerprintResult(result: AnalysisResult): string {
  const parts = result.rows
    .filter((r) => rowScore(r) < 0.05)
    .map((r) => `${r.ontology_id}:${rowScore(r).toPrecision(8)}`)
    .sort();
  return hash32(parts.join('|'));
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromBase64Url(s: string): Uint8Array {
  const pad = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeCapsule(capsule: Capsule): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(capsule)));
}

export function decodeCapsule(s: string): Capsule | null {
  try {
    const obj = JSON.parse(new TextDecoder().decode(fromBase64Url(s))) as unknown;
    return isCapsule(obj) ? obj : null;
  } catch {
    return null;
  }
}

function isCapsule(o: unknown): o is Capsule {
  if (typeof o !== 'object' || o === null) return false;
  const c = o as Record<string, unknown>;
  if (c.v !== 1 || typeof c.fp !== 'string') return false;
  const i = c.inputs as Record<string, unknown> | undefined;
  if (!i) return false;
  if (!(typeof i.gmtText === 'string' && Array.isArray(i.target) && Array.isArray(i.background) &&
        typeof i.method === 'string' && typeof i.minNrOfElements === 'number' && typeof i.maxNrOfElements === 'number')) return false;
  if (i.efdrMode !== undefined && i.efdrMode !== 'exact' && i.efdrMode !== 'resampling') return false;
  if (i.steps !== undefined && typeof i.steps !== 'number') return false;
  if (i.seed !== undefined && typeof i.seed !== 'number') return false;
  return true;
}

export function capsuleFitsUrl(encoded: string): boolean {
  return encoded.length < 8000;
}
