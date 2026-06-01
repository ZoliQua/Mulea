import { useState } from 'react';
import type { CSSProperties } from 'react';

const SHADOW = '0 2px 14px rgba(0,0,0,0.55)';

function MuleaLogo({ h = '6.2cqw' }: { h?: string }) {
  return (
    <svg style={{ height: h, width: h }} viewBox="0 0 64 64" fill="none" aria-label="Mulea">
      <defs>
        <linearGradient id="hexg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5fe0c8" /><stop offset="1" stopColor="#1f7f8a" />
        </linearGradient>
      </defs>
      <path d="M32 4 L53 16 L53 40 L32 52 L11 40 L11 16 Z" stroke="url(#hexg)" strokeWidth="2.6" strokeLinejoin="round" fill="rgba(20,52,60,0.35)" />
      <g stroke="#eef6f6" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M22 19 C20 13 21 10 23 10 C25 10 27 14 27 20" />
        <path d="M42 19 C44 13 43 10 41 10 C39 10 37 14 37 20" />
        <path d="M27 19 C29 17 35 17 37 19 C40 21 41 27 40 33 C39 39 35 43 32 43 C28 43 24 40 23 33 C22 27 24 21 27 19 Z" />
        <circle cx="29.5" cy="28" r="1.5" fill="#eef6f6" stroke="none" />
        <path d="M30 38 L34 38" />
      </g>
    </svg>
  );
}

const FEAT_POS = [
  { left: '11.6%', title: 'Multiple Ontologies', body: 'Analyze across 20+ ontology types and 16 public databases.' },
  { left: '34.4%', title: 'Empirical FDR', body: 'Robust significance estimation for dependent data.' },
  { left: '57.9%', title: 'ORA & GSEA', body: 'Support for both over-representation and GSEA.' },
  { left: '79.9%', title: 'Model Organisms', body: 'Prebuilt ontologies for 27 model organisms.' },
];

export function Landing({ onStart, onDocs }: { onStart: () => void; onDocs: () => void }) {
  const [hover, setHover] = useState<'start' | 'docs' | null>(null);
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
    <div style={{ height: '100vh', width: '100vw', background: '#050d15', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
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
        <div style={{ position: 'absolute', left: 0, right: 0, top: '92.4%', textAlign: 'center' }}>
          <span style={{ fontSize: '1.08cqw', color: '#4fc1cf', fontWeight: 500, letterSpacing: '0.01em', textShadow: SHADOW }}>
            From gene lists to biological insights.
          </span>
        </div>
      </div>
    </div>
  );
}
