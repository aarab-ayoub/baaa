'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SWRConfig } from 'swr';
import { Header } from '@/components/header';
import { LoginScreen } from '@/components/login-screen';
import { fetcher } from '@/lib/client/fetcher';
import { memory } from '@/lib/client/memory';
import type { Me } from '@/lib/types';
import { legacyHref } from '@/lib/url-state';
import { FRESH_MS } from '@/lib/utils';

type App = {
  me: Me | null; // the logged-in student
  defaultCampus: string;
  highlight: string | null; // the row a search found
  setHighlight: (login: string | null) => void;
};

const AppContext = createContext<App | null>(null);

export function useApp() {
  const app = useContext(AppContext);
  if (!app) throw new Error('useApp outside <AppShell>');
  return app;
}

// what every page shares: who's logged in, the header, the login screen, and how data is fetched
export function AppShell({ me, required, children }: { me: Me | null; required: boolean; children: ReactNode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [ended, setEnded] = useState(false);
  const [highlight, setHighlight] = useState<string | null>(null);
  const locked = ended || (required && !me);

  // once, when the page opens
  useEffect(() => {
    memory.onUnauthorized = () => setEnded(true);
    const old = location.hash && legacyHref(location.hash);
    if (old) router.replace(old);
    else if (!locked && params.has('login')) router.replace('/');
  }, []);

  const text = ended ? 'Your session ended, sign in again.' : params.get('login') === 'failed' ? "That didn't work, try again." : '';
  return (
    <AppContext value={{ me, defaultCampus: me?.campus ? String(me.campus) : '75', highlight, setHighlight }}>
      {/* a campus's data is kept for 10 minutes like before, and asked for again after */}
      <SWRConfig value={{ fetcher, dedupingInterval: FRESH_MS, revalidateOnFocus: false, revalidateOnReconnect: false, shouldRetryOnError: false }}>
        <Header nav={!locked} />
        <main className="mx-auto max-w-[900px] px-4 pb-[40px]">{locked ? <LoginScreen text={text} /> : children}</main>
      </SWRConfig>
    </AppContext>
  );
}
