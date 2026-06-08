/**
 * Client-side index of the ELTEbioinformatics/GMT_files_for_mulea repository — the official mulea
 * ontology collection (https://github.com/ELTEbioinformatics/GMT_files_for_mulea), 877 GMT files
 * spanning 27 organisms, grouped ontology types, and 16+ source databases.
 *
 * The repo layout (verified via the GitHub git-trees API, branch `main`) is:
 *   GMT_files/<Organism>_<taxid>/<OntologyType>_<Source>[_<detail>]_<Organism>[..]_<IdentifierID>.gmt
 * e.g. GMT_files/Escherichia_coli_83333/Transcription_factor_RegulonDB_Escherichia_coli_GeneSymbol.gmt
 *
 * The full tree is large (~200 KB of paths), so a generated static index lives at
 * /public/ontology-catalog.json (built from the API tree; see generateOntologyCatalog comments
 * below) and is loaded once at runtime. Raw GMT bodies are fetched on demand from
 * raw.githubusercontent.com (CORS-enabled), with an in-memory cache.
 */

const RAW_BASE = 'https://raw.githubusercontent.com/ELTEbioinformatics/GMT_files_for_mulea/main';
const CATALOG_URL = `${import.meta.env.BASE_URL}ontology-catalog.json`;

/** One GMT file, parsed from its repository path. `path` is the load-bearing field (used to fetch). */
export interface CatalogEntry {
  /** Display organism name, taxid stripped, underscores → spaces (e.g. "Escherichia coli"). */
  organism: string;
  /** NCBI taxonomy id from the directory name (e.g. "83333"). */
  taxid: string;
  /** Ontology type / category (e.g. "Transcription factor", "GO Biological Process"). */
  ontologyType: string;
  /** Source database or method (e.g. "RegulonDB", "Reactome", "PFAM"). */
  source: string;
  /** Gene/protein identifier namespace (e.g. "GeneSymbol", "EntrezID", "UniprotID"). */
  identifier: string;
  /** Repository-relative path under the default branch (e.g. "GMT_files/.../X.gmt"). */
  path: string;
}

/** Identifier-namespace suffixes that terminate a GMT filename, longest-first for greedy matching. */
const ID_SUFFIXES = [
  'EnsemblID', 'EntrezID', 'GeneSymbol', 'UniprotID', 'UniProtID', 'UniProtKB',
  'UniProt', 'LocusID', 'GeneID', 'FlybaseID',
] as const;

/** Ontology-type filename prefixes → human label, longest-first so "GO_BP" wins over "GO". */
const ONTOLOGY_PREFIXES: Array<[string, string]> = [
  ['GO_All', 'GO (all)'],
  ['GO_BP', 'GO Biological Process'],
  ['GO_CC', 'GO Cellular Component'],
  ['GO_MF', 'GO Molecular Function'],
  ['Gene_expression', 'Gene expression'],
  ['Genomic_location', 'Genomic location'],
  ['Pathways', 'Pathways'],
  ['Protein_domain', 'Protein domain'],
  ['Transcription_factor', 'Transcription factor'],
  ['miRNA_regulation', 'miRNA regulation'],
];

/**
 * Parse one repository path (`GMT_files/<Org>_<taxid>/<file>.gmt`) into a CatalogEntry. The directory
 * is the reliable source of organism + taxid (a handful of filenames carry typos or the taxid in
 * place of the species name); the filename yields ontology type, source, and identifier.
 * Returns null for paths that are not a GMT under GMT_files/.
 */
export function parseGmtPath(path: string): CatalogEntry | null {
  const parts = path.split('/');
  if (parts[0] !== 'GMT_files' || parts.length < 3 || !path.endsWith('.gmt')) return null;
  const dir = parts[1]!;
  const taxidMatch = dir.match(/_(\d+)$/);
  const taxid = taxidMatch ? taxidMatch[1]! : '';
  const organism = dir.replace(/_\d+$/, '').replace(/_/g, ' ');

  const base = parts[parts.length - 1]!.slice(0, -'.gmt'.length);

  // identifier = a recognised suffix at the end of the filename.
  let identifier = 'unknown';
  let core = base;
  for (const s of ID_SUFFIXES) {
    if (base === s || base.endsWith('_' + s)) { identifier = s; core = base.slice(0, base.length - s.length - 1); break; }
  }

  // ontology type = recognised leading prefix; whatever follows (minus org/taxid tokens) is source.
  let ontologyType = core.split('_')[0]!;
  let rest = '';
  for (const [prefix, label] of ONTOLOGY_PREFIXES) {
    if (core === prefix || core.startsWith(prefix + '_')) {
      ontologyType = label;
      rest = core.slice(prefix.length).replace(/^_/, '');
      break;
    }
  }

  // strip the organism's own name tokens + taxid out of the remaining "source" segment.
  let source = rest;
  for (const tok of dir.replace(/_\d+$/, '').split('_')) {
    if (tok) source = source.replace(new RegExp(`(^|_)${escapeRe(tok)}(_|$)`), '_');
  }
  source = source.replace(/_+/g, '_').replace(/^_|_$/g, '');
  if (!source) source = core.split('_')[0]!;

  return { organism, taxid, ontologyType, source, identifier, path };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

let cachedCatalog: CatalogEntry[] | null = null;

/**
 * Load the parsed catalog. Reads the generated static index at /ontology-catalog.json (already in
 * the parsed CatalogEntry shape). The result is memoised for the lifetime of the page.
 */
export async function loadCatalog(fetchImpl: typeof fetch = fetch): Promise<CatalogEntry[]> {
  if (cachedCatalog) return cachedCatalog;
  const res = await fetchImpl(CATALOG_URL);
  if (!res.ok) throw new Error(`Failed to load ontology catalog (${res.status})`);
  cachedCatalog = (await res.json()) as CatalogEntry[];
  return cachedCatalog;
}

/** Override / preload the in-memory catalog (used by tests and by an app-level prefetch). */
export function setCatalog(entries: CatalogEntry[]): void {
  cachedCatalog = entries;
}

/** Distinct organisms in the loaded catalog, alphabetically. Requires loadCatalog/setCatalog first. */
export function listOrganisms(catalog: CatalogEntry[] = requireCatalog()): string[] {
  return [...new Set(catalog.map((e) => e.organism))].sort((a, b) => a.localeCompare(b));
}

/**
 * Catalog entries for one organism, sorted by ontology type then source then identifier. Pass the
 * catalog explicitly, or rely on the memoised one (after loadCatalog/setCatalog).
 */
export function listOntologies(organism: string, catalog: CatalogEntry[] = requireCatalog()): CatalogEntry[] {
  return catalog
    .filter((e) => e.organism === organism)
    .sort((a, b) =>
      a.ontologyType.localeCompare(b.ontologyType) ||
      a.source.localeCompare(b.source) ||
      a.identifier.localeCompare(b.identifier));
}

function requireCatalog(): CatalogEntry[] {
  if (!cachedCatalog) throw new Error('Ontology catalog not loaded — call loadCatalog() or setCatalog() first');
  return cachedCatalog;
}

const rawCache = new Map<string, Promise<string>>();

/**
 * Fetch the raw GMT body for a catalog `path` from raw.githubusercontent.com (CORS-safe), cached
 * in memory per path. Returns the GMT text, ready for parseGmt().
 */
export function fetchGmtRaw(path: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const cached = rawCache.get(path);
  if (cached) return cached;
  const p = (async () => {
    const res = await fetchImpl(`${RAW_BASE}/${path}`);
    if (!res.ok) throw new Error(`Failed to fetch GMT ${path} (${res.status})`);
    return res.text();
  })();
  rawCache.set(path, p);
  return p;
}

/** Clear the raw-GMT fetch cache (test hook). */
export function clearGmtCache(): void {
  rawCache.clear();
}
