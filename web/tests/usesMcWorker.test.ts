import { describe, it, expect } from 'vitest';
import { usesMcWorker } from '../src/analysis.ts';
import type { AnalysisInput } from '../src/appTypes.ts';

const base: AnalysisInput = { gmtText: '', target: [], background: [], method: 'eFDR', minNrOfElements: 3, maxNrOfElements: 400 };

describe('usesMcWorker', () => {
  it('true only for eFDR + resampling', () => {
    expect(usesMcWorker({ ...base, efdrMode: 'resampling' })).toBe(true);
    expect(usesMcWorker({ ...base, efdrMode: 'exact' })).toBe(false);
    expect(usesMcWorker({ ...base })).toBe(false);
    expect(usesMcWorker({ ...base, method: 'BH', efdrMode: 'resampling' })).toBe(false);
  });
});
