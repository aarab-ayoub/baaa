import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { REQUIRE_LOGIN } from '@/lib/server/config';
import { getSession } from '@/lib/server/sessions';
import './globals.css';

export const metadata: Metadata = { title: '42 rank', referrer: 'no-referrer' };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const me = getSession((await cookies()).get('sid')?.value)?.user ?? null;
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
