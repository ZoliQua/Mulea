import { useEffect, useState } from 'react';
import { loadCatalog, listOrganisms, listOntologies, fetchGmtRaw, type CatalogEntry } from '../ontologyCatalog.ts';

/**
 * Cascading picker over the muleaData ontology catalog (≈879 GMT files, 27 organisms) hosted at
 * ELTEbioinformatics/GMT_files_for_mulea. On selection it fetches the raw GMT (CORS-safe, cached)
 * and hands the text back via onPick, ready for parseGmt — an alternative to paste/upload.
 */
export function OntologyPicker({ onPick }: { onPick: (gmtText: string, label: string) => void }) {
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);
  const [organism, setOrganism] = useState('');
  const [path, setPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadCatalog().then(setCatalog).catch((e) => setError(String(e))); }, []);

  if (error && !catalog) return <div className="ontology-picker"><span className="warn">⚠ {error}</span></div>;
  if (!catalog) return <div className="ontology-picker"><span className="muted">Loading mulea ontology catalog…</span></div>;

  const organisms = listOrganisms(catalog);
  const ontologies = organism ? listOntologies(organism, catalog) : [];

  const pick = async (p: string) => {
    setPath(p);
    if (!p) return;
    const entry = ontologies.find((e) => e.path === p);
    setLoading(true); setError(null);
    try {
      const text = await fetchGmtRaw(p);
      onPick(text, entry ? `${entry.organism} · ${entry.ontologyType} · ${entry.identifier}` : p);
    } catch (e) { setError(String(e)); }
    setLoading(false);
  };

  return (
    <div className="ontology-picker">
      <select aria-label="Organism" value={organism} onChange={(e) => { setOrganism(e.target.value); setPath(''); }}>
        <option value="">Browse mulea ontologies — organism…</option>
        {organisms.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {organism && (
        <select aria-label="Ontology" value={path} onChange={(e) => pick(e.target.value)} disabled={loading}>
          <option value="">{loading ? 'Loading GMT…' : 'ontology · source · identifier…'}</option>
          {ontologies.map((e) => <option key={e.path} value={e.path}>{e.ontologyType} · {e.source} · {e.identifier}</option>)}
        </select>
      )}
      {error && <span className="warn" style={{ fontSize: 12 }}>⚠ {error}</span>}
      <span className="muted" style={{ fontSize: 11 }}>match your gene-id namespace (Symbol/Entrez/Ensembl)</span>
    </div>
  );
}
