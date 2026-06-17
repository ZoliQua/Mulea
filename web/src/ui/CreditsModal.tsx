interface Person {
  name: string;
  photo: string;
  affiliations: string[];
}

const BASE = import.meta.env.BASE_URL;

// Order requested by the project lead: Dul, Ölbei, Hunya, Ari.
// Affiliations are verified from public sources (mulea paper — Turek et al.,
// BMC Bioinformatics 2024, 25:334 — institutional / group pages, ORCID, GitHub)
// and use each person's current institution(s); dual affiliations are listed in full.
const PEOPLE: Person[] = [
  {
    name: 'Zoltán Dul',
    photo: `${BASE}pics-zoltan.jpeg`,
    affiliations: ['Independent developer, Szombathely, Hungary'],
  },
  {
    name: 'Márton Ölbei',
    photo: `${BASE}pics-marton.jpeg`,
    affiliations: [
      'Korcsmáros Group, Department of Metabolism, Digestion and Reproduction, Imperial College London, London, United Kingdom',
    ],
  },
  {
    name: 'Ágoston Hunya',
    photo: `${BASE}pics-agoston.jpg`,
    affiliations: [
      'Doctoral School of Biology, ELTE Eötvös Loránd University, Budapest, Hungary',
      'Computational Systems Biology Lab, Synthetic and Systems Biology Unit, HUN-REN Biological Research Centre, Szeged, Hungary',
    ],
  },
  {
    name: 'Eszter Ari',
    photo: `${BASE}pics-eszter.jpg`,
    affiliations: [
      'Department of Genetics, Institute of Biology, ELTE Eötvös Loránd University, Budapest, Hungary',
      'Synthetic and Systems Biology Unit, HUN-REN Biological Research Centre, Szeged, Hungary',
    ],
  },
];

/** Credits: the people behind the mulea web tool + a development-status notice. */
export function CreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="pkg-overlay" onClick={onClose} role="presentation">
      <div className="pkg-modal credits-modal" role="dialog" aria-modal="true" aria-label="Credits" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pkg-close" aria-label="Close" onClick={onClose}>×</button>
        <div className="pkg-head">
          <h2>Credits</h2>
          <div className="pkg-kind">The people behind mulea</div>
          <p className="pkg-tagline">
            mulea brings multi-ontology functional enrichment analysis — with empirical FDR —
            to the browser, alongside the R package and Python companion.
          </p>
        </div>

        <div className="dev-status" role="note">
          <strong>Development preview.</strong> This web tool is research software under active
          development. A manuscript describing it is in preparation; features, defaults and
          results may change before publication. Please verify results against the published
          mulea R package before reporting them.
        </div>

        <ul className="credits-list">
          {PEOPLE.map((p) => (
            <li key={p.name} className="credits-item">
              <img className="credits-photo" src={p.photo} alt={p.name} width={64} height={64} loading="lazy" />
              <div className="credits-text">
                <div className="credits-name">{p.name}</div>
                {p.affiliations.map((a) => (
                  <div key={a} className="credits-aff">{a}</div>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <p className="pkg-cite">
          Turek et al. mulea: an R package for enrichment analysis using multiple ontologies and
          empirical false discovery rate. BMC Bioinformatics 2024, 25:334.
        </p>
      </div>
    </div>
  );
}
