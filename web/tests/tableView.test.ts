import { describe, it, expect } from 'vitest';
import { columnsFor, sortRows, filterSignificant, isSignificant } from '../src/tableView.ts';
import type { ResultRow } from '../src/appTypes.ts';

const rows: ResultRow[] = [
  { ontology_id: 'A', ontology_name: 'a', p_value: 0.2, eFDR: 0.2 },
  { ontology_id: 'B', ontology_name: 'b', p_value: 0.001, eFDR: 0.01 },
  { ontology_id: 'C', ontology_name: 'c', p_value: 0.04, eFDR: 0.049 },
];

describe('tableView', () => {
  it('columnsFor depends on method', () => {
    expect(columnsFor('eFDR')).toContain('eFDR');
    expect(columnsFor('BH')).toContain('adjusted_p_value');
    expect(columnsFor('BH')).not.toContain('eFDR');
  });
  it('sortRows ascending/descending by a numeric key, stable', () => {
    const asc = sortRows(rows, 'eFDR', 'asc').map((r) => r.ontology_id);
    expect(asc).toEqual(['B', 'C', 'A']);
    const desc = sortRows(rows, 'eFDR', 'desc').map((r) => r.ontology_id);
    expect(desc).toEqual(['A', 'C', 'B']);
  });
  it('isSignificant / filterSignificant use score < 0.05', () => {
    expect(isSignificant(rows[0]!)).toBe(false);
    expect(isSignificant(rows[2]!)).toBe(true);
    expect(filterSignificant(rows).map((r) => r.ontology_id)).toEqual(['B', 'C']);
  });
});
