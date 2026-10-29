'use client';

import type { ReactNode } from 'react';
import { useLoggingIn } from '@/lib/client/login';
import { cn } from '@/lib/utils';

// a turning ring, still for people who asked their system for less motion
export function Spinner({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={cn('size-[14px] flex-none motion-safe:animate-spin', className)} fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// "Continue with 42": once clicked, a spinner and `busy` until 42's page opens, and further
// clicks do nothing (a click with a modifier, for a new tab, works as usual)
export function LoginLink({ className, children, busy: busyLabel }: { className?: string; children: ReactNode; busy: ReactNode }) {
  const [busy, start] = useLoggingIn();
  return (
    <a
      href="/auth/login"
      aria-busy={busy || undefined}
      aria-disabled={busy || undefined}
      onClick={(e) => {
        if (busy) return e.preventDefault();
        if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        start();
      }}
      className={cn(className, busy && 'cursor-progress gap-2 hover:brightness-100')}
    >
      {busy ? (
        <>
          <Spinner />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </a>
  );
}
