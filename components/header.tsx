'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useApp } from '@/components/app-shell';
import { Avatar } from '@/components/ui/avatar';
import { memory } from '@/lib/client/memory';
import { movesHref, rankHref } from '@/lib/url-state';
import { cn } from '@/lib/utils';

function Tab({ on, href, onClick, children }: { on: boolean; href: string; onClick?: (e: React.MouseEvent) => void; children: ReactNode }) {
  return (
    <Link href={href} scroll={false} onClick={onClick} className={cn('text-[#8a8a8a]', on && 'font-medium text-[#1a1a1a]')}>
      {children}
    </Link>
  );
}

function Me() {
  const { me } = useApp();
  const logout = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    location.replace('/');
  };
  return (
    <span className="inline-flex items-center gap-[6px] text-[#1a1a1a]">
      {me && (
        <>
          <Avatar u={me} size={20} />
          <span className="phone:hidden">{me.login}</span>
          <button type="button" className="border-0 bg-transparent p-0 text-[12px] text-[#8a8a8a]" onClick={logout}>
            log out
          </button>
        </>
      )}
    </span>
  );
}

export function Header({ nav }: { nav: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { defaultCampus } = useApp();
  const view = pathname.startsWith('/transfers') ? 'transfers' : pathname.startsWith('/calculator') ? 'calc' : 'rank';

  // the ranking and the transfers open on the campus on screen; each gets its own
  // filters back only when that's the campus they were left on
  const open = (to: () => string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const href = to();
    if (href !== location.pathname + location.search) router.push(href, { scroll: false });
  };
  const campus = () => memory.shownCampus || defaultCampus;
  const ranking = () => {
    const last = memory.lastRank;
    return rankHref(last?.campus === campus() ? last : { campus: campus(), status: 'active', promo: '', coal: 0, page: 1 });
  };
  const transfers = () => {
    const last = memory.lastMoves;
    return movesHref(last?.campus === campus() ? last : { campus: campus(), from: '', to: '', move: '', promo: '', page: 1 });
  };

  return (
    <header className="flex items-baseline justify-between pt-[20px] pb-[14px]">
      <Link href="/" scroll={false} className="text-[17px] font-semibold">
        42 rank
      </Link>
      {nav && (
        <nav className="flex gap-4 text-[13px]">
          <Tab on={view === 'rank'} href="/" onClick={open(ranking)}>
            Ranking
          </Tab>
          <Tab on={view === 'transfers'} href="/transfers" onClick={open(transfers)}>
            Transfers
          </Tab>
          <Tab on={view === 'calc'} href="/calculator">
            Calculator
          </Tab>
          <Me />
        </nav>
      )}
    </header>
  );
}
