'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const BASE = 'inline-flex flex-none items-center justify-center rounded-[50%] bg-[#eee] object-cover font-semibold uppercase text-[#888]';
const SIZES = { 28: 'size-[28px] text-[11px]', 40: 'size-[40px] text-[14px]' };

// a student's photo, or the first two letters of their login when there's none
export function Avatar({ u, size = 28 }: { u: { login: string; img: string | null }; size?: keyof typeof SIZES }) {
  const [broken, setBroken] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // a photo that failed before the page came alive never fires onError
  useEffect(() => {
    if (ref.current?.complete && !ref.current.naturalWidth) setBroken(true);
  }, []);

  if (!u.img || broken) {
    return (
      <span aria-hidden="true" className={cn(BASE, SIZES[size])}>
        {u.login.slice(0, 2)}
      </span>
    );
  }
  // a plain img: photos come from our own /img proxy, already small
  return (
    <img
      ref={ref}
      className={cn(BASE, SIZES[size])}
      src={u.img}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
    />
  );
}
