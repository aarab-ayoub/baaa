import type { ReactNode } from 'react';
import { Bone } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// a column is its header, how to draw one cell, its classes (`className` for the header and
// the cells, `cellClassName` for the cells only), and its shape while rows are on their way
export type Column<T> = { head: string; className?: string; cellClassName?: string; cell: (row: T) => ReactNode; bone?: ReactNode };

const TD = 'whitespace-nowrap border-b border-[#f0f0f0] px-3 py-[9px] text-[15px]';

// how a row stands out: searched for, yours, or a cursus that's over
export type Tone = { hl?: boolean; mine?: boolean; gone?: boolean };

// every list is this table: the ranking and the transfers only differ in their columns.
// `more` grey rows follow the real ones while more are on their way
export function DataTable<T>({ columns, rows, rowKey, tone, more = 0 }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; tone?: (row: T) => Tone; more?: number }) {
  if (!rows.length && !more) return null;
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.head} className={cn('border-b border-[#e6e6e6] px-3 py-2 text-left text-[13px] font-medium text-[#8a8a8a]', c.className)}>
              {c.head}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const t = tone?.(row) ?? {};
          return (
            <tr key={rowKey(row)} data-hl={t.hl || undefined}>
              {columns.map((c) => (
                <td
                  key={c.head}
                  className={cn(TD, t.hl ? 'bg-[#e8f7e0]' : t.mine && 'bg-ink/6', t.gone && 'text-[#9a9a9a]', c.className, c.cellClassName)}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          );
        })}
        {Array.from({ length: more }, (_, i) => (
          <tr key={'bone' + i} aria-hidden="true">
            {columns.map((c) => (
              <td key={c.head} className={cn(TD, 'h-[58px]', c.className, c.cellClassName)}>
                {c.bone ?? <Bone className="h-[13px] w-[48px]" />}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
