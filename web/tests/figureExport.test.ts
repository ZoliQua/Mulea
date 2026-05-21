import { describe, it, expect } from 'vitest';
import { safeFilename } from '../src/figureExport.ts';

describe('safeFilename', () => {
  it('slugifies a title and appends the extension', () => {
    expect(safeFilename('Methods Venn', 'svg')).toBe('methods-venn.svg');
  });
  it('lowercases, strips punctuation/unicode, collapses + trims separators', () => {
    expect(safeFilename('  Term–gene Network!! ', 'png')).toBe('term-gene-network.png');
  });
  it('falls back to "figure" when the slug is empty', () => {
    expect(safeFilename('', 'svg')).toBe('figure.svg');
    expect(safeFilename('  —  ', 'svg')).toBe('figure.svg');
  });
});
