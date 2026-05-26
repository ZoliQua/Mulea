import { describe, it, expect } from 'vitest';
import { upsetLayout } from '../src/upset.ts';
import type { ComparisonResult } from '../src/comparison.ts';

const cmp: ComparisonResult = {
  efdr: ['T1', 'T2', 'T3'], bh: ['T1', 'T2'], bonferroni: ['T1'],
  names: { T1: 'one', T2: 'two', T3: 'three' },
};

describe('upsetLayout', () => {
  it('produces non-empty intersections sorted by size desc, with correct membership', () => {
    const l = upsetLayout(cmp);
    expect(l.sets).toEqual(['efdr', 'bh', 'bonferroni']);
    const byKey = Object.fromEntries(l.intersections.map((i) => [i.key, i]));
    expect(byKey['ABC']).toMatchObject({ size: 1, sets: ['efdr', 'bh', 'bonferroni'], ids: ['T1'] });
    expect(byKey['AB']).toMatchObject({ size: 1, sets: ['efdr', 'bh'], ids: ['T2'] });
    expect(byKey['Aonly']).toMatchObject({ size: 1, sets: ['efdr'], ids: ['T3'] });
    expect(l.intersections.every((i) => i.size > 0)).toBe(true);
    expect(l.intersections.map((i) => i.size)).toEqual([...l.intersections.map((i) => i.size)].sort((a, b) => b - a));
  });
  it('returns no intersections when all sets are empty', () => {
    expect(upsetLayout({ efdr: [], bh: [], bonferroni: [], names: {} }).intersections).toEqual([]);
  });
});
