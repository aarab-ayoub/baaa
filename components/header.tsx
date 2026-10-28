'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '@/components/app-shell';
import { Logo } from '@/components/logo';
import { Avatar } from '@/components/ui/avatar';
import { memory } from '@/lib/client/memory';
import { go } from '@/lib/client/nav';
import { movesHref, rankHref } from '@/lib/url-state';
import { cn } from '@/lib/utils';

// the green pill on the right of the bar
const CTA =
  'inline-flex h-[30px] items-center rounded-full border border-ink/10 bg-green px-4 py-0 text-[14px] font-medium tracking-[0.35px] whitespace-nowrap text-ink ' +
  'shadow-[inset_0_1px_2px_rgba(255,255,255,.35),0_3px_3px_-1.5px_rgba(16,24,40,.06),0_1px_1px_rgba(16,24,40,.08)] transition-[filter] hover:brightness-95 hover:no-underline';
const ITEM = 'block w-full rounded-[8px] border-0 bg-transparent px-3 py-2 text-left text-[14px] text-[#1a1a1a] hover:bg-[#f3f3f3]';

// a tab; the one you're on sits in a light green pill
function Tab({ on, href, onClick, children }: { on: boolean; href: string; onClick?: (e: React.MouseEvent) => void; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onClick}
      aria-current={on ? 'page' : undefined}
      className={cn(
        'rounded-full px-3 py-[6px] whitespace-nowrap text-[#737373] transition-colors hover:bg-ink/5 hover:text-[#0a0a0a] hover:no-underline phone:px-[7px]',
        on && 'bg-green/40 text-ink hover:bg-green/40 hover:text-ink'
      )}
    >
      {children}
    </Link>
  );
}

// your photo; opens a small menu with who you are, your rank (on phones) and log out
function UserMenu({ onMyRank }: { onMyRank: () => void }) {
  const { me } = useApp();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener('mousedown', close);
    addEventListener('keydown', close);
    return () => {
      removeEventListener('mousedown', close);
      removeEventListener('keydown', close);
    };
  }, [open]);
  if (!me) return null;

  const logout = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    location.replace('/');
  };
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 border-0 bg-transparent p-0 text-[14px] font-medium text-[#737373] transition-colors hover:text-[#0a0a0a]"
      >
        <Avatar u={me} />
        <span className="phone:hidden">{me.login}</span>
      </button>
      {open && (
        <div role="menu" className="absolute top-[calc(100%+14px)] right-0 w-[200px] rounded-[12px] border border-[#e5e5e5] bg-white p-1 shadow-[0_8px_24px_rgba(0,0,0,.08)]">
          <div className="px-3 pt-2 pb-[6px]">
            <div className="font-medium text-[#1a1a1a]">{me.login}</div>
            <div className="overflow-hidden text-[12px] text-ellipsis whitespace-nowrap text-[#8a8a8a]">{me.name}</div>
          </div>
          <button
            type="button"
            role="menuitem"
            className={cn(ITEM, 'hidden phone:block')}
            onClick={() => {
              setOpen(false);
              onMyRank();
            }}
          >
            My rank
          </button>
          <button type="button" role="menuitem" className={ITEM} onClick={logout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

// the floating bar: logo and the three views on the left, your account on the right
export function Header({ nav }: { nav: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me, defaultCampus, setHighlight } = useApp();
  const view = pathname.startsWith('/transfers') ? 'transfers' : pathname.startsWith('/calculator') ? 'calc' : pathname.startsWith('/rncp') ? 'rncp' : 'rank';

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

  // your own promo on your campus: the logo opens it at the top, "My rank" at your row
  // (highlighted, like the first visit)
  const home = me ? rankHref({ campus: defaultCampus, promo: me.promo || '', coal: 0, status: 'active', page: 1 }) : '/';
  const myRank = () => {
    if (!me) return;
    memory.landing = home;
    memory.scrollPending = true;
    setHighlight(me.login);
    if (location.pathname === '/') go(home);
    else router.push(home, { scroll: false });
  };

  return (
    <header className="sticky top-4 z-50 mx-auto mt-4 mb-[18px] max-w-[1100px] px-4">
      <div className="flex h-[56px] items-center justify-between gap-4 rounded-[16px] border border-[#e5e5e5] bg-white/75 px-4 backdrop-blur-[16px] phone:gap-2 phone:px-3">
        <div className="flex min-w-0 items-center gap-6 phone:gap-2">
          <Link href={home} scroll={false} onClick={() => scrollTo(0, 0)} aria-label="Peerboard" className="hover:no-underline">
            <Logo compact={nav} />
          </Link>
          {nav && (
            // four tabs on a phone: short names, and they scroll rather than run under your photo
            <nav className="flex min-w-0 items-center gap-1 text-[14px] font-medium phone:gap-0 phone:overflow-x-auto phone:text-[13px] phone:[scrollbar-width:none]">
              <Tab on={view === 'rank'} href="/" onClick={open(ranking)}>
                Ranking
              </Tab>
              <Tab on={view === 'transfers'} href="/transfers" onClick={open(transfers)}>
                Transfers
              </Tab>
              <Tab on={view === 'calc'} href="/calculator">
                <span className="phone:hidden">Calculator</span>
                <span className="hidden phone:inline">Calc</span>
              </Tab>
              <Tab on={view === 'rncp'} href="/rncp">
                RNCP
              </Tab>
            </nav>
          )}
        </div>
        <div className="flex flex-none items-center gap-4">
          {me && nav ? (
            <>
              <button type="button" className={cn(CTA, 'phone:hidden')} onClick={myRank}>
                My rank
              </button>
              <UserMenu onMyRank={myRank} />
            </>
          ) : (
            <a className={CTA} href="/auth/login">
              <span className={cn(nav && 'phone:hidden')}>Continue with 42</span>
              {nav && <span className="hidden phone:inline">Sign in</span>}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
