import type { FigureSettings, FontFamily, Palette, SortOrder } from '../figureSettings.ts';

type Tab = 'global' | 'figure';

export function SettingsDrawer(props: {
  open: boolean;
  onClose: () => void;
  figureTitle: string;
  tab: Tab;
  onTab: (t: Tab) => void;
  value: FigureSettings;
  onChange: (patch: Partial<FigureSettings>) => void;
  palette: Palette;
  onPalette: (p: Palette) => void;
}) {
  const v = props.value;
  return (
    <aside className={props.open ? 'settings-drawer help-drawer open' : 'settings-drawer help-drawer'} aria-hidden={!props.open} aria-label="Figure settings">
      <button type="button" className="close" onClick={props.onClose} aria-label="Close settings">×</button>
      <h2>Appearance</h2>
      <div className="seg">
        <button type="button" className={props.tab === 'global' ? 'active' : ''} onClick={() => props.onTab('global')}>Global</button>
        <button type="button" className={props.tab === 'figure' ? 'active' : ''} onClick={() => props.onTab('figure')}>{props.figureTitle}</button>
      </div>

      <h3>Typography</h3>
      <label className="ctl">Font
        <select value={v.fontFamily} onChange={(e) => props.onChange({ fontFamily: e.target.value as FontFamily })}>
          <option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option>
        </select>
      </label>
      <label className="ctl">Label size
        <input type="number" min={6} max={28} value={v.labelFontSize} onChange={(e) => props.onChange({ labelFontSize: clamp(+e.target.value, 6, 28) })} />
      </label>

      <h3>Title</h3>
      <label className="ctl">Text
        <input type="text" value={v.titleText} placeholder="(none)" onChange={(e) => props.onChange({ titleText: e.target.value })} />
      </label>
      <label className="ctl">Title size
        <input type="number" min={10} max={28} value={v.titleFontSize} onChange={(e) => props.onChange({ titleFontSize: clamp(+e.target.value, 10, 28) })} />
      </label>

      <h3>Order</h3>
      <label className="ctl">Sort by
        <select value={v.sortOrder} onChange={(e) => props.onChange({ sortOrder: e.target.value as SortOrder })}>
          <option value="score">Significance</option><option value="name">Name</option><option value="hits">Gene overlap</option>
        </select>
      </label>

      <h3>Size</h3>
      <label className="ctl">Scale {v.scale.toFixed(1)}×
        <input type="range" min={0.6} max={2} step={0.1} value={v.scale} onChange={(e) => props.onChange({ scale: +e.target.value })} />
      </label>

      <h3>Colours</h3>
      <label className="ctl">Accent
        <input type="color" value={v.accentColor} onChange={(e) => props.onChange({ accentColor: e.target.value })} />
      </label>
      <label className="ctl">Outline
        <input type="color" value={v.outlineColor} onChange={(e) => props.onChange({ outlineColor: e.target.value })} />
      </label>
      <label className="ctl">Outline width
        <input type="number" min={0} max={4} step={0.5} value={v.outlineWidth} onChange={(e) => props.onChange({ outlineWidth: clamp(+e.target.value, 0, 4) })} />
      </label>
      <label className="ctl">Venn transparency {v.vennTransparency.toFixed(2)}
        <input type="range" min={0} max={0.6} step={0.02} value={v.vennTransparency} onChange={(e) => props.onChange({ vennTransparency: +e.target.value })} />
      </label>

      <h3>Palette (global)</h3>
      <label className="ctl-check">
        <input type="checkbox" checked={props.palette === 'colorblind'} onChange={(e) => props.onPalette(e.target.checked ? 'colorblind' : 'default')} />
        Colour-blind-safe enrichment colours
      </label>
    </aside>
  );
}

function clamp(n: number, lo: number, hi: number): number {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
}
