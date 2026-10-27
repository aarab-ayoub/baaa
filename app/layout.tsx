import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { peek } from '@/lib/server/cache';
import { REQUIRE_LOGIN } from '@/lib/server/config';
import { getSession } from '@/lib/server/sessions';
import type { Ranking } from '@/lib/types';
import './globals.css';

export const metadata: Metadata = { title: '42 rank', referrer: 'no-referrer' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  let me = getSession((await cookies()).get('sid')?.value)?.user ?? null;
  // sessions keep the photo from login time; the campus ranking has the current, sharper one
  const now = me && peek<Ranking>(`rank:${me.campus}`)?.students.find((s) => s.login === me!.login);
  if (me && now?.img) me = { ...me, img: now.img };
  return (
    <html lang="en">
      <body>
        <AppShell me={me} required={REQUIRE_LOGIN}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
