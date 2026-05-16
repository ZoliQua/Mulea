export type RegionKey = 'Aonly' | 'Bonly' | 'Conly' | 'AB' | 'AC' | 'BC' | 'ABC';
export interface VennRegion { key: RegionKey; count: number; ids: string[] }
export type Venn3 = Record<RegionKey, VennRegion>;

/** Partition the union of three id sets into the seven Venn regions (A,B,C are positional). */
export function venn3Regions(a: string[], b: string[], c: string[]): Venn3 {
  const A = new Set(a), B = new Set(b), C = new Set(c);
  const buckets: Record<RegionKey, string[]> = {
    Aonly: [], Bonly: [], Conly: [], AB: [], AC: [], BC: [], ABC: [],
  };
  for (const id of new Set([...a, ...b, ...c])) {
    const inA = A.has(id), inB = B.has(id), inC = C.has(id);
    if (inA && inB && inC) buckets.ABC.push(id);
    else if (inA && inB) buckets.AB.push(id);
    else if (inA && inC) buckets.AC.push(id);
    else if (inB && inC) buckets.BC.push(id);
    else if (inA) buckets.Aonly.push(id);
    else if (inB) buckets.Bonly.push(id);
    else buckets.Conly.push(id); // inC (only remaining possibility, since id ∈ union)
  }
  const mk = (key: RegionKey): VennRegion => ({ key, count: buckets[key].length, ids: buckets[key] });
  return { Aonly: mk('Aonly'), Bonly: mk('Bonly'), Conly: mk('Conly'), AB: mk('AB'), AC: mk('AC'), BC: mk('BC'), ABC: mk('ABC') };
}
