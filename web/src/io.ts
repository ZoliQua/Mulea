import { MuleaError } from './errors.ts';
import type { GmtTerm } from './types.ts';

/** Parse GMT text into terms. Skips '#' comment lines and blank lines. */
export function parseGmt(text: string): GmtTerm[] {
  const out: GmtTerm[] = [];
  const lines = text.split(/\r?\n/);
  for (let lineno = 0; lineno < lines.length; lineno++) {
    const line = lines[lineno]!;
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    const fields = line.split('\t');
    if (fields.length < 2) {
      throw new MuleaError(`GMT parse error at line ${lineno + 1}: fewer than 2 tab-separated fields`);
    }
    const genes = fields.slice(2).filter((g) => g !== '');
    out.push({ ontology_id: fields[0]!, ontology_name: fields[1]!, list_of_values: genes });
  }
  return out;
}
