import { useRef, type ReactNode } from 'react';
import { downloadSvg, downloadPng, safeFilename } from '../figureExport';

export function FigureCard(props: { title: string; svgExport?: boolean; children: ReactNode }) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const getSvg = (): SVGSVGElement | null => bodyRef.current?.querySelector('svg') ?? null;

  return (
    <section className="figure-card">
      <header className="figure-card-head">
        <strong>{props.title}</strong>
        {props.svgExport && (
          <span className="figure-card-tools">
            <button type="button" onClick={() => { const s = getSvg(); if (s) void downloadPng(s, safeFilename(props.title, 'png')).catch(() => {}); }}>⤓ PNG</button>
            <button type="button" onClick={() => { const s = getSvg(); if (s) downloadSvg(s, safeFilename(props.title, 'svg')); }}>⤓ SVG</button>
          </span>
        )}
      </header>
      <div className="figure-card-body" ref={bodyRef}>{props.children}</div>
    </section>
  );
}
