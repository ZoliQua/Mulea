import { describe, it, expect } from 'vitest';
import { resolveEfdr } from '../src/analysis.ts';
import type { AnalysisInput } from '../src/appTypes.ts';

const base: AnalysisInput = { gmtText: '', target: [], background: [], method: 'eFDR', minNrOfElements: 3, maxNrOfElements: 400 };

describe('resolveEfdr', () => {
  it('defaults to exact / 100000 / 42', () => {
    expect(resolveEfdr(base)).toEqual({ mode: 'exact', steps: 100000, seed: 42 });
  });
  it('honours valid values', () => {
    expect(resolveEfdr({ ...base, efdrMode: 'resampling', steps: 5000, seed: 7 })).toEqual({ mode: 'resampling', steps: 5000, seed: 7 });
  });
  it('coerces invalid steps/seed to defaults and floors steps', () => {
    expect(resolveEfdr({ ...base, steps: 0, seed: 1.9 })).toEqual({ mode: 'exact', steps: 100000, seed: 42 });
    expect(resolveEfdr({ ...base, efdrMode: 'resampling', steps: 1234.9 })).toEqual({ mode: 'resampling', steps: 1234, seed: 42 });
  });
});
