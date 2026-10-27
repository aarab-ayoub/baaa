import type { ListView } from '@/lib/client/view';
import { cn } from '@/lib/utils';

const ICONS: Record<ListView, React.ReactNode> = {
  table: <path d="M3 4.5h10M3 8h10M3 11.5h10" />,
  cards: (
    <>
      <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
      <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
      <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
    </>
  ),
};

// table or cards
export function ViewToggle({ view, onChange }: { view: ListView; onChange: (v: ListView) => void }) {
  return (
    <span className="inline-flex rounded-full border border-[#e3e3e3] bg-white p-[2px]" role="group" aria-label="view">
      {(Object.keys(ICONS) as ListView[]).map((v) => (
        <button
          key={v}
          type="button"
          title={v === 'table' ? 'Table' : 'Cards'}
          aria-label={v === 'table' ? 'table view' : 'cards view'}
          aria-pressed={view === v}
          onClick={() => onChange(v)}
          className={cn(
            'inline-flex items-center rounded-full border-0 bg-transparent px-[9px] py-[4px] text-[#8a8a8a] hover:text-ink',
            view === v && 'bg-ink text-white hover:text-white'
          )}
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-[15px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            {ICONS[v]}
          </svg>
        </button>
      ))}
    </span>
  );
}
