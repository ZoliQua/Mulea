import { useState } from 'react';
import type { CSSProperties } from 'react';
import { PackageModal, type Pkg } from './ui/PackageModal.tsx';

const SHADOW = '0 2px 14px rgba(0,0,0,0.55)';

function MuleaLogo({ h = '6.2cqw' }: { h?: string }) {
  return <img src="/mulea-logo.png" alt="Mulea" style={{ height: h, width: 'auto' }} />;
}

function RIcon() {
  return (
    <svg style={{ width: '1.5cqw', height: '1.5cqw', flex: '0 0 auto' }} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#276DC3" />
      <text x="12" y="17" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">R</text>
    </svg>
  );
}

function PyIcon() {
  return (
    <svg style={{ width: '1.5cqw', height: '1.5cqw', flex: '0 0 auto' }} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="13" height="13" rx="4" fill="#3776AB" />
      <rect x="8" y="8" width="13" height="13" rx="4" fill="#FFD43B" />
      <circle cx="6.6" cy="6.6" r="1.2" fill="#fff" />
      <circle cx="17.4" cy="17.4" r="1.2" fill="#0d1e2b" />
    </svg>
  );
}

const FEAT_POS = [
  { left: '12.0%', title: 'Multiple Ontologies', body: 'Analyze across 20+ ontology types and 16 public databases.' },
  { left: '35.2%', title: 'Empirical FDR', body: 'Robust significance estimation for dependent data.' },
  { left: '58.6%', title: 'ORA & GSEA', body: 'Support for both over-representation and GSEA.' },
  { left: '79.7%', title: 'Model Organisms', body: 'Prebuilt ontologies for 27 model organisms.' },
];

export function Landing({ onStart, onDocs }: { onStart: () => void; onDocs: () => void }) {
  const [hover, setHover] = useState<'start' | 'docs' | null>(null);
  const [pkg, setPkg] = useState<Pkg | null>(null);
  const pkgBtn: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '0.4cqw', cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: 'inherit', fontSize: '0.95cqw', fontWeight: 500, color: '#eaf3f5',
    padding: '0.5cqw 1.1cqw', borderRadius: '0.6cqw',
    border: '1px solid rgba(120,180,195,0.4)', background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(4px)', textShadow: SHADOW,
  };
  const btnBase: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: '0.7cqw', cursor: 'pointer',
    fontSize: '1.08cqw', fontWeight: 600, borderRadius: '0.7cqw', padding: '0.95cqw 1.7cqw',
    transition: 'all .15s', whiteSpace: 'nowrap', fontFamily: 'inherit',
  };
  const btnPrimary: CSSProperties = {
    ...btnBase, color: '#fff', border: 'none', background: 'linear-gradient(135deg, #2fb199 0%, #1f7f8a 100%)',
    boxShadow: hover === 'start' ? '0 14px 36px -10px rgba(46,165,143,0.75)' : '0 10px 26px -12px rgba(46,165,143,0.6)',
    transform: hover === 'start' ? 'translateY(-1px)' : 'none',
  };
  const btnGhost: CSSProperties = {
    ...btnBase, fontWeight: 500, color: '#eaf3f5',
    background: hover === 'docs' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(120,180,195,0.35)', backdropFilter: 'blur(4px)',
  };
  return (
    <div style={{ height: '100vh', width: '100vw', background: '#05122b', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div style={{
        position: 'relative', aspectRatio: '1536 / 1024',
        width: 'min(100vw, calc(100vh * 1.5))', maxWidth: '100vw', maxHeight: '100vh',
        backgroundImage: 'url("/hero-bg.png")', backgroundSize: 'cover', backgroundPosition: 'center',
        containerType: 'inline-size',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', color: '#f3f8fa', userSelect: 'none',
      }}>
        <div style={{ position: 'absolute', left: '4.3%', top: '11%', width: '46%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.1cqw', marginBottom: '4.6cqw' }}>
            <MuleaLogo h="6.2cqw" />
            <span style={{ fontSize: '4.4cqw', fontWeight: 600, letterSpacing: '-0.02em', textShadow: SHADOW }}>Mulea</span>
          </div>
          <h1 style={{ fontSize: '3.35cqw', lineHeight: 1.13, fontWeight: 600, letterSpacing: '-0.02em', margin: '0 0 1.5cqw', textShadow: SHADOW }}>
            Multi-ontology enrichment<br />analysis made <span style={{ color: '#5fd6c2' }}>smarter</span>
          </h1>
          <p style={{ fontSize: '1.18cqw', lineHeight: 1.62, color: '#aec3ce', margin: '0 0 2.4cqw', maxWidth: '34cqw', textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
            Mulea is a bioinformatics tool for functional enrichment analysis across multiple ontologies with empirical FDR control. Explore your data. Discover biological meaning.
          </p>
          <div style={{ display: 'flex', gap: '1.1cqw', flexWrap: 'wrap' }}>
            <button style={btnPrimary} onClick={onStart} onMouseEnter={() => setHover('start')} onMouseLeave={() => setHover(null)}>
              <svg style={{ width: '1.25cqw', height: '1.25cqw' }} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" /></svg>
              Start Analysis
            </button>
            <button style={btnGhost} onClick={onDocs} onMouseEnter={() => setHover('docs')} onMouseLeave={() => setHover(null)}>
              <svg style={{ width: '1.25cqw', height: '1.25cqw' }} viewBox="0 0 24 24" fill="none" stroke="#eaf3f5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5a2 2 0 012-2h5v18H5a2 2 0 01-2-2z" /><path d="M21 5a2 2 0 00-2-2h-5v18h5a2 2 0 002-2z" /></svg>
              View Documentation
            </button>
          </div>
        </div>
        {FEAT_POS.map((f) => (
          <div key={f.title} style={{ position: 'absolute', left: f.left, top: '80.4%', width: '18.5%' }}>
            <div style={{ fontSize: '1.04cqw', fontWeight: 600, marginBottom: '0.35cqw', color: '#eaf3f5', textShadow: SHADOW }}>{f.title}</div>
            <div style={{ fontSize: '0.84cqw', lineHeight: 1.5, color: '#9fb6c2', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>{f.body}</div>
          </div>
        ))}
        <div style={{ position: 'absolute', left: 0, right: 0, top: '93.3%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3.6cqw' }}>
          <button type="button" style={pkgBtn} onClick={() => setPkg('r')} title="mulea — R package">
            <RIcon /> R package
          </button>
          <span style={{ fontSize: '1.4cqw', color: '#4fc1cf', fontWeight: 500, letterSpacing: '0.01em', textShadow: SHADOW }}>
            From gene lists to biological insights.
          </span>
          <button type="button" style={pkgBtn} onClick={() => setPkg('python')} title="mulealab — Python package">
            <PyIcon /> Python package
          </button>
        </div>
      </div>
      {pkg && <PackageModal pkg={pkg} onClose={() => setPkg(null)} />}
    </div>
  );
}
