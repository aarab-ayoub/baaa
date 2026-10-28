'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const UP_MS = 350;

// a round arrow in the bottom right corner once you're a screen down; back to the top
// in a third of a second (at once for people who asked their system for less motion)
export function ScrollTop() {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const check = () => setShown(scrollY > innerHeight);
    check();
    addEventListener('scroll', check, { passive: true });
    return () => removeEventListener('scroll', check);
  }, []);

  const up = () => {
    const from = scrollY;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return scrollTo(0, 0);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / UP_MS);
      scrollTo(0, from * (1 - t) ** 3); // fast first, slowing down at the top
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  return (
    <button
      type="button"
      aria-label="Back to top"
      title="Back to top"
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      onClick={up}
      className={cn(
        'fixed right-6 bottom-6 z-40 inline-flex size-[44px] items-center justify-center rounded-full border-0 bg-ink p-0 text-green shadow-[0_8px_24px_rgba(17,17,17,.25)] transition-[opacity,translate] duration-200 hover:-translate-y-[2px] phone:right-4 phone:bottom-4',
        !shown && 'pointer-events-none translate-y-2 opacity-0'
      )}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
      </svg>
    </button>
  );
}
