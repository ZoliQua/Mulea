import { describe, it, expect } from 'vitest';
import { parseGmt } from '../src/io.ts';

describe('parseGmt', () => {
  it('parses rows and skips comments and blanks', () => {
    const text = '# comment\nGO:1\tterm one\tgeneA\tgeneB\tgeneC\n\nGO:2\tterm two\tgeneB\tgeneD\n';
    const gmt = parseGmt(text);
    expect(gmt.length).toBe(2);
    expect(gmt[0]).toEqual({ ontology_id: 'GO:1', ontology_name: 'term one', list_of_values: ['geneA', 'geneB', 'geneC'] });
    expect(gmt[1]!.list_of_values).toEqual(['geneB', 'geneD']);
  });
});
