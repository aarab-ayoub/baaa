'use client';

import { go } from '@/lib/client/nav';
import { calcHref } from '@/lib/url-state';

// a level that opens the calculator on it, in the page (a click with a modifier: new tab)
export function LevelLink({ level }: { level: number }) {
  const href = calcHref(level);
  return (
    <a
      href={href}
      title="open in the calculator"
      className="hover:decoration-dotted"
      onClick={(e) => {
        if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        go(href);
        scrollTo(0, 0);
      }}
    >
      {level.toFixed(2)}
    </a>
  );
}
