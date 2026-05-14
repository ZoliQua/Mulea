import { describe, it, expect } from 'vitest';
import { filterOntology } from '../src/ontology.ts';
import type { GmtTerm } from '../src/types.ts';

const gmt = (): GmtTerm[] => [
  { ontology_id: 'A', ontology_name: 'a', list_of_values: ['g1'] },
  { ontology_id: 'B', ontology_name: 'b', list_of_values: ['g1', 'g2', 'g3'] },
  { ontology_id: 'C', ontology_name: 'c', list_of_values: ['g1', 'g2', 'g3', 'g4', 'g5'] },
];

describe('filterOntology', () => {
  it('keeps strictly within (min, max)', () => {
    expect(filterOntology(gmt(), 2, 5).map((t) => t.ontology_id)).toEqual(['B']);
  });
  it('excludes boundary sizes (strict)', () => {
    expect(filterOntology(gmt(), 3, 5).map((t) => t.ontology_id)).toEqual([]);
  });
  it('defaults to min=3,max=400 when undefined', () => {
    expect(filterOntology(gmt()).map((t) => t.ontology_id)).toEqual(['C']);
  });
});
