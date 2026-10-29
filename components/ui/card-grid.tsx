import type { ReactNode } from 'react';
import type { Tone } from '@/components/ui/data-table';
import { CardBone } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const CARD = 'min-w-0 rounded-[14px] border border-[#ececec] bg-white px-4 pt-3 pb-4 text-center transition-shadow hover:shadow-[0_6px_20px_rgba(17,17,17,.08)] phone:px-3';

// the cards view of a list: the same rows and tones as DataTable, one card each. `more`
// grey cards follow while more are on their way (`footer`: with the transfers' last line)
export function CardGrid<T>({ rows, rowKey, tone, card, more = 0, footer }: { rows: T[]; rowKey: (row: T) => string; tone?: (row: T) => Tone; card: (row: T) => ReactNode; more?: number; footer?: boolean }) {
  if (!rows.length && !more) return null;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3 phone:grid-cols-2 phone:gap-2">
      {rows.map((row) => {
        const t = tone?.(row) ?? {};
        return (
          <div
            key={rowKey(row)}
            data-row={rowKey(row)}
            data-hl={t.hl || undefined}
            className={cn(
              CARD,
              t.hl ? 'border-green bg-[#e8f7e0]' : t.mine && 'bg-ink/6',
              t.gone && 'text-[#9a9a9a]'
            )}
          >
            {card(row)}
          </div>
        );
      })}
      {Array.from({ length: more }, (_, i) => (
        <div key={'bone' + i} aria-hidden="true" className={CARD}>
          <CardBone footer={footer} />
        </div>
      ))}
    </div>
  );
}
