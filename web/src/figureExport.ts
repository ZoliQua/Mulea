/** Slugify a figure title into a safe download filename. Pure. */
export function safeFilename(title: string, ext: string): string {
  const slug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug || 'figure'}.${ext}`;
}

// SVG presentation properties to inline (resolves theme var(--…) to concrete values).
const COPY_PROPS = [
  'fill', 'stroke', 'stroke-width', 'stroke-opacity', 'fill-opacity', 'opacity',
  'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline',
];

function inlineComputedStyles(src: Element, clone: Element): void {
  const cs = getComputedStyle(src);
  const decls = COPY_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
  const prev = clone.getAttribute('style');
  clone.setAttribute('style', prev ? `${prev};${decls}` : decls);
  const sc = src.children;
  const cc = clone.children;
  for (let i = 0; i < sc.length; i++) {
    const s = sc[i];
    const c = cc[i];
    if (s && c) inlineComputedStyles(s, c);
  }
}

/** Clone an on-screen SVG with computed styles inlined (theme colours resolved), as standalone markup. */
export function serializeSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineComputedStyles(svg, clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  return new XMLSerializer().serializeToString(clone);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadSvg(svg: SVGSVGElement, filename: string): void {
  triggerDownload(new Blob([serializeSvg(svg)], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

function svgPixelSize(svg: SVGSVGElement): { w: number; h: number } {
  const w = svg.width.baseVal.value || svg.viewBox.baseVal.width || svg.clientWidth || 600;
  const h = svg.height.baseVal.value || svg.viewBox.baseVal.height || svg.clientHeight || 400;
  return { w, h };
}

/** Rasterise the SVG to a PNG at the given pixel scale and download it. */
export function downloadPng(svg: SVGSVGElement, filename: string, scale = 2): Promise<void> {
  const markup = serializeSvg(svg);
  const { w, h } = svgPixelSize(svg);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }));
  return new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('no 2d context')); return; }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) { triggerDownload(blob, filename); resolve(); } else reject(new Error('toBlob failed'));
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG image load failed')); };
    img.src = url;
  });
}
