'use client';

import type { ReactNode } from 'react';
import { onGo } from '@/lib/client/nav';
import { cn } from '@/lib/utils';

const ITEM = 'inline-block min-w-[26px] rounded-[4px] px-[4px] py-[3px]';

// ‹ 1 … 4 5 [6] 7 8 … 15 ›   `href(n)` is the link to page n of whichever list this is
export function Pager({ page, pages, href }: { page: number; pages: number; href: (n: number) => string }) {
  const items: ReactNode[] = [];
  const to = (n: number, label: string) => (
    <a key={label} href={href(n)} onClick={onGo(href(n))} className={ITEM}>
      {label}
    </a>
  );
  if (pages > 1) {
    const nums = new Set([1, pages]);
    for (let i = page - 2; i <= page + 2; i++) if (i > 1 && i < pages) nums.add(i);
    let prev = 0;
    if (page > 1) items.push(to(page - 1, '‹'));
    for (const n of [...nums].sort((a, b) => a - b)) {
      if (n - prev > 1) items.push(' … ');
      items.push(n === page ? <b key={n} className={cn(ITEM, 'bg-[#f0f0f0]')}>{n}</b> : to(n, String(n)));
      prev = n;
    }
    if (page < pages) items.push(to(page + 1, '›'));
  }
  return <div className="pt-[14px] text-center text-[13px]">{items}</div>;
}
