import type { ComparisonResult } from './comparison.ts';
import { venn3Regions, type RegionKey } from './venn3.ts';

export type UpsetSet = 'efdr' | 'bh' | 'bonferroni';
export interface UpsetIntersection { key: RegionKey; size: number; sets: UpsetSet[]; ids: string[] }
export interface UpsetLayout { sets: UpsetSet[]; intersections: UpsetIntersection[] }

const REGION_SETS: Record<RegionKey, UpsetSet[]> = {
  Aonly: ['efdr'], Bonly: ['bh'], Conly: ['bonferroni'],
  AB: ['efdr', 'bh'], AC: ['efdr', 'bonferroni'], BC: ['bh', 'bonferroni'],
  ABC: ['efdr', 'bh', 'bonferroni'],
};
const ORDER: RegionKey[] = ['Aonly', 'Bonly', 'Conly', 'AB', 'AC', 'BC', 'ABC'];

/** UpSet of the three method significant-term sets: non-empty intersections, largest first. Pure. */
export function upsetLayout(c: ComparisonResult): UpsetLayout {
  const regions = venn3Regions(c.efdr, c.bh, c.bonferroni);
  const intersections = ORDER
    .map((k) => ({ key: k, size: regions[k].count, sets: REGION_SETS[k], ids: regions[k].ids }))
    .filter((x) => x.size > 0)
    .sort((a, b) => b.size - a.size);
  return { sets: ['efdr', 'bh', 'bonferroni'], intersections };
}
