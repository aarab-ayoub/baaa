'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const SIZE = 176;
const DELAY_MS = 2000; // a quick pass over a photo shouldn't open it

// an avatar; resting on it for 2s grows the photo out of it, big enough to see who that
// is. fixed to the window so no table or scroll box can cut it off, and gone on scroll
export function PhotoZoom({ u, size = 40 }: { u: { login: string; img: string | null; photo: string | null }; size?: 40 | 72 }) {
  const [box, setBox] = useState<DOMRect | null>(null);
  const [sharp, setSharp] = useState(false); // the 350px photo has arrived
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const big = useRef<HTMLImageElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!box) return;
    if (big.current?.complete && big.current.naturalWidth) setSharp(true);
    const hide = () => setBox(null);
    addEventListener('scroll', hide, { passive: true, capture: true });
    return () => removeEventListener('scroll', hide, { capture: true });
  }, [box]);

  const enter = (e: React.MouseEvent<HTMLElement>) => {
    if (!u.img) return;
    const el = e.currentTarget;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setBox(el.getBoundingClientRect()), DELAY_MS);
  };
  const leave = () => {
    clearTimeout(timer.current);
    setBox(null);
  };

  const top = box && Math.max(8, Math.min(innerHeight - SIZE - 16, box.top + box.height / 2 - SIZE / 2));
  return (
    <span className="relative flex-none" onMouseEnter={enter} onMouseLeave={leave}>
      <Avatar u={u} size={size} />
      {box && (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed z-50 block size-[176px] origin-left animate-pop overflow-hidden rounded-[22px] border-4 border-white bg-[#eee] shadow-[0_14px_36px_rgba(17,47,44,.22)]"
          style={{ left: box.right + 12, top: top! }}
        >
          {/* the small photo is already loaded; the sharp one only shows once it has arrived,
              so a missing one never leaves a broken-image icon */}
          <img src={u.img!} alt="" className="absolute inset-0 size-full object-cover" />
          {u.photo && (
            <img ref={big} src={u.photo} alt="" onLoad={() => setSharp(true)} className={cn('absolute inset-0 size-full object-cover', !sharp && 'opacity-0')} />
          )}
        </span>
      )}
    </span>
  );
}
