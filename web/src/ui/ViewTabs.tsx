export type ViewId = 'table' | 'lollipop' | 'barplot' | 'network' | 'heatmap' | 'venn';
const VIEWS: { id: ViewId; label: string }[] = [
  { id: 'table', label: 'Table' }, { id: 'lollipop', label: 'Lollipop' }, { id: 'barplot', label: 'Barplot' },
  { id: 'network', label: 'Network' }, { id: 'heatmap', label: 'Heatmap' }, { id: 'venn', label: 'Methods Venn' },
];

export function ViewTabs(props: { active: ViewId; onChange: (v: ViewId) => void }) {
  return (
    <div className="tabs">
      {VIEWS.map((v) => (
        <button key={v.id} type="button" className={v.id === props.active ? 'tab active' : 'tab'} onClick={() => props.onChange(v.id)}>{v.label}</button>
      ))}
    </div>
  );
}
