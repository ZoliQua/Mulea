import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseGmtPath,
  loadCatalog,
  setCatalog,
  listOrganisms,
  listOntologies,
  fetchGmtRaw,
  clearGmtCache,
  type CatalogEntry,
} from '../src/ontologyCatalog.ts';

// Real sample paths taken from the GMT_files_for_mulea git tree (branch main), including the two
// known-noisy ones (taxid-in-place-of-name, "Cenopus" typo) that the directory-anchored parser
// must still resolve to the right organism + taxid.
const SAMPLES: Array<[string, Partial<CatalogEntry>]> = [
  ['GMT_files/Escherichia_coli_83333/Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt',
    { organism: 'Escherichia coli', taxid: '83333', ontologyType: 'Transcription factor', source: 'RegulonDB', identifier: 'GeneSymbol' }],
  ['GMT_files/Arabidopsis_thaliana_3702/GO_BP_Arabidopsis_thaliana_EntrezID.gmt',
    { organism: 'Arabidopsis thaliana', taxid: '3702', ontologyType: 'GO Biological Process', source: 'GO', identifier: 'EntrezID' }],
  ['GMT_files/Homo_sapiens_9606/Pathways_Reactome_Homo_sapiens_UniprotID.gmt',
    { organism: 'Homo sapiens', taxid: '9606', ontologyType: 'Pathways', source: 'Reactome', identifier: 'UniprotID' }],
  ['GMT_files/Drosophila_melanogaster_7227/Genomic_location_Ensembl_Drosophila_melanogaster_10genes_EnsemblID.gmt',
    { organism: 'Drosophila melanogaster', taxid: '7227', ontologyType: 'Genomic location', source: 'Ensembl_10genes', identifier: 'EnsemblID' }],
  ['GMT_files/Pan_troglodytes_9598/Protein_domain_PFAM_9598_GeneSymbol.gmt',
    { organism: 'Pan troglodytes', taxid: '9598', ontologyType: 'Protein domain', identifier: 'GeneSymbol' }],
];

describe('parseGmtPath', () => {
  it('parses real GMT paths into organism / taxid / ontologyType / source / identifier', () => {
    for (const [path, expected] of SAMPLES) {
      const e = parseGmtPath(path)!;
      expect(e).not.toBeNull();
      for (const [k, v] of Object.entries(expected)) {
        expect(e[k as keyof CatalogEntry]).toBe(v);
      }
      expect(e.path).toBe(path);
    }
  });

  it('returns null for non-GMT or non-catalog paths', () => {
    expect(parseGmtPath('scripts_to_create_GMT_files/build.R')).toBeNull();
    expect(parseGmtPath('GMT_files/Homo_sapiens_9606/README.md')).toBeNull();
    expect(parseGmtPath('.gitignore')).toBeNull();
  });
});

describe('catalog queries', () => {
  const catalog: CatalogEntry[] = SAMPLES.map(([p]) => parseGmtPath(p)!);
  beforeEach(() => setCatalog(catalog));

  it('listOrganisms returns the distinct organisms, sorted', () => {
    expect(listOrganisms()).toEqual([
      'Arabidopsis thaliana', 'Drosophila melanogaster', 'Escherichia coli', 'Homo sapiens', 'Pan troglodytes',
    ]);
  });

  it('listOntologies filters to one organism', () => {
    const ec = listOntologies('Escherichia coli');
    expect(ec).toHaveLength(1);
    expect(ec[0]!.source).toBe('RegulonDB');
    expect(listOntologies('Nonexistent organism')).toHaveLength(0);
  });
});

describe('loadCatalog', () => {
  it('fetches and memoises /ontology-catalog.json', async () => {
    const data: CatalogEntry[] = [parseGmtPath(SAMPLES[0]![0])!];
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(data), { status: 200 }));
    setCatalog(undefined as unknown as CatalogEntry[]); // reset memo
    const loaded = await loadCatalog(fetchImpl as unknown as typeof fetch);
    expect(loaded).toEqual(data);
    // second call is served from the memo (no extra fetch)
    await loadCatalog(fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith('/ontology-catalog.json');
  });
});

describe('fetchGmtRaw', () => {
  beforeEach(() => clearGmtCache());

  it('fetches raw GMT from raw.githubusercontent.com and caches per path', async () => {
    const body = 'TermA\tname A\tgeneX\tgeneY\n';
    const fetchImpl = vi.fn(async () => new Response(body, { status: 200 }));
    const path = SAMPLES[0]![0];
    const text = await fetchGmtRaw(path, fetchImpl as unknown as typeof fetch);
    expect(text).toBe(body);
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://raw.githubusercontent.com/ELTEbioinformatics/GMT_files_for_mulea/main/${path}`,
    );
    // cached: a second call does not re-fetch
    await fetchGmtRaw(path, fetchImpl as unknown as typeof fetch);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws on a non-OK response', async () => {
    const fetchImpl = vi.fn(async () => new Response('not found', { status: 404 }));
    await expect(fetchGmtRaw('GMT_files/x/y.gmt', fetchImpl as unknown as typeof fetch)).rejects.toThrow(/404/);
  });
});
