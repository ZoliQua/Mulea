import type { Method, ResultRow } from './appTypes.ts';
import { rowScore } from './lollipop.ts';

const EFDR_COLS = ['ontology_id', 'ontology_name', 'nr_common_with_tested_elements', 'nr_common_with_background_elements', 'p_value', 'eFDR'];
const STAT_COLS = ['ontology_id', 'ontology_name', 'p_value', 'adjusted_p_value'];

export function columnsFor(method: Method): string[] {
  return method === 'eFDR' ? [...EFDR_COLS] : [...STAT_COLS];
}

export function isSignificant(row: ResultRow, threshold = 0.05): boolean {
  return rowScore(row) < threshold;
}

export function filterSignificant(rows: ResultRow[], threshold = 0.05): ResultRow[] {
  return rows.filter((r) => isSignificant(r, threshold));
}

/** Stable sort by a row key. Strings compared lexicographically, everything else numerically. */
export function sortRows(rows: ResultRow[], key: string, dir: 'asc' | 'desc'): ResultRow[] {
  const sign = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = (a as unknown as Record<string, unknown>)[key];
    const bv = (b as unknown as Record<string, unknown>)[key];
    if (typeof av === 'string' && typeof bv === 'string') return sign * av.localeCompare(bv);
    return sign * (Number(av ?? Infinity) - Number(bv ?? Infinity));
  });
}
