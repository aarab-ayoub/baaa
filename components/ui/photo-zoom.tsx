'use client';

import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';

const SIZE = 176;

// the 40px avatar; hovering it grows the photo out of it, big enough to see who that is.
// fixed to the window so no table or scroll box can cut it off, and gone on scroll
export function PhotoZoom({ u }: { u: { login: string; img: string | null; photo: string | null } }) {
  const [box, setBox] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!box) return;
    const hide = () => setBox(null);
    addEventListener('scroll', hide, { passive: true, capture: true });
    return () => removeEventListener('scroll', hide, { capture: true });
  }, [box]);

  const top = box && Math.max(8, Math.min(innerHeight - SIZE - 16, box.top + box.height / 2 - SIZE / 2));
  return (
    <span className="relative flex-none" onMouseEnter={(e) => u.img && setBox(e.currentTarget.getBoundingClientRect())} onMouseLeave={() => setBox(null)}>
      <Avatar u={u} size={40} />
      {box && (
        <span
          aria-hidden="true"
          className="pointer-events-none fixed z-50 block size-[176px] origin-left animate-pop overflow-hidden rounded-[22px] border-4 border-white bg-[#eee] shadow-[0_14px_36px_rgba(17,47,44,.22)]"
          style={{ left: box.right + 12, top: top! }}
        >
          {/* the small photo shows at once, the sharp one paints over it when it arrives */}
          <img src={u.img!} alt="" className="absolute inset-0 size-full object-cover" />
          {u.photo && <img src={u.photo} alt="" className="absolute inset-0 size-full object-cover" />}
        </span>
      )}
    </span>
  );
}
