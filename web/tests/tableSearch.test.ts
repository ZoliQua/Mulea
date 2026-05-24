import { describe, it, expect } from 'vitest';
import { filterByQuery } from '../src/tableView.ts';
import type { ResultRow } from '../src/appTypes.ts';

const rows: ResultRow[] = [
  { ontology_id: 'GO:1', ontology_name: 'SOS response', p_value: 0.001 },
  { ontology_id: 'GO:2', ontology_name: 'LexA regulon', p_value: 0.01 },
  { ontology_id: 'REG:soxs', ontology_name: 'oxidative stress', p_value: 0.02 },
];

describe('filterByQuery', () => {
  it('returns all rows for an empty/whitespace query', () => {
    expect(filterByQuery(rows, '')).toHaveLength(3);
    expect(filterByQuery(rows, '   ')).toHaveLength(3);
  });
  it('matches ontology_name case-insensitively (substring)', () => {
    expect(filterByQuery(rows, 'sos').map((r) => r.ontology_id)).toEqual(['GO:1']);
    expect(filterByQuery(rows, 'STRESS').map((r) => r.ontology_id)).toEqual(['REG:soxs']);
  });
  it('matches ontology_id too', () => {
    expect(filterByQuery(rows, 'reg:').map((r) => r.ontology_id)).toEqual(['REG:soxs']);
  });
  it('returns [] when nothing matches', () => {
    expect(filterByQuery(rows, 'zzz')).toEqual([]);
  });
});
