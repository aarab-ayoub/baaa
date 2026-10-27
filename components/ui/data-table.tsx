import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// a column is its header, how to draw one cell, and its classes (`className` for the
// header and the cells, `cellClassName` for the cells only)
export type Column<T> = { head: string; className?: string; cellClassName?: string; cell: (row: T) => ReactNode };

// how a row stands out: searched for, yours, or a cursus that's over
export type Tone = { hl?: boolean; mine?: boolean; gone?: boolean };

// every list is this table: the ranking and the transfers only differ in their columns
export function DataTable<T>({ columns, rows, rowKey, tone }: { columns: Column<T>[]; rows: T[]; rowKey: (row: T) => string; tone?: (row: T) => Tone }) {
  if (!rows.length) return null;
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
                  className={cn('whitespace-nowrap border-b border-[#f0f0f0] px-3 py-[9px] text-[15px]', t.hl ? 'bg-[#e8f7e0]' : t.mine && 'bg-ink/6', t.gone && 'text-[#9a9a9a]', c.className, c.cellClassName)}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
