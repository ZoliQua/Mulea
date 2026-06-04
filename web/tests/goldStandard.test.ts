import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The R-generated eFDR reference is the cross-language gold standard (see PARITY.md).
// It is immutable: changing it must be deliberate (regenerate → update this hash + PARITY.md).
const FIXTURE = join(import.meta.dirname, '..', '..', 'python', 'tests', 'fixtures', 'ora_efdr_reference.csv');
const SHA256 = 'c118f8918d7650f42325589c05aba5f90c724fce64d38dfcb75c05e7029c7623';

describe('gold-standard parity fixture', () => {
  it('is byte-identical to the recorded SHA-256 (guards silent drift)', () => {
    const buf = readFileSync(FIXTURE);
    expect(createHash('sha256').update(buf).digest('hex')).toBe(SHA256);
  });
});
