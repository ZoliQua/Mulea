import { describe, it, expect } from 'vitest';
import { venn3Regions } from '../src/venn3.ts';

describe('venn3Regions', () => {
  it('partitions ids into the 7 regions with counts and members', () => {
    const r = venn3Regions(['1', '2', '3'], ['2', '3', '4'], ['3', '5']);
    expect(r.Aonly).toEqual({ key: 'Aonly', count: 1, ids: ['1'] });
    expect(r.Bonly).toEqual({ key: 'Bonly', count: 1, ids: ['4'] });
    expect(r.Conly).toEqual({ key: 'Conly', count: 1, ids: ['5'] });
    expect(r.AB).toEqual({ key: 'AB', count: 1, ids: ['2'] });
    expect(r.ABC).toEqual({ key: 'ABC', count: 1, ids: ['3'] });
    expect(r.AC.count).toBe(0);
    expect(r.BC.count).toBe(0);
  });
  it('handles empty sets', () => {
    const r = venn3Regions([], [], []);
    expect(r.Aonly.count).toBe(0);
    expect(r.ABC.count).toBe(0);
  });
});
