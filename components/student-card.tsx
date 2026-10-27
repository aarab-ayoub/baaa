import type { ReactNode } from 'react';
import { LevelLink } from '@/components/level-link';
import { PhotoZoom } from '@/components/ui/photo-zoom';
import type { Student } from '@/lib/types';
import { profileUrl } from '@/lib/utils';

// one student as a card: rank (if any) and level on top, the photo, login and full name;
// `children` adds what a list needs on top of that (the transfers: status and destination)
export function StudentCard({ u, rank, children }: { u: Student; rank?: number; children?: ReactNode }) {
  return (
    <>
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-[#8a8a8a] tabular-nums">{rank != null && '#' + rank}</span>
        <span className="text-[15px] font-semibold tabular-nums">
          <LevelLink level={u.level} />
        </span>
      </div>
      <div className="mt-1 flex justify-center">
        <PhotoZoom u={u} size={72} />
      </div>
      <a href={profileUrl(u.login)} target="_blank" rel="noopener noreferrer" className="mt-3 block truncate text-[15px] font-medium">
        {u.login}
      </a>
      <div className="min-h-[18px] truncate text-[13px] text-[#8a8a8a]">{u.name}</div>
      {u.bh && <div className="mt-1 text-[12px] text-[#c0392b]">{'blackholed ' + u.bh}</div>}
      {children}
    </>
  );
}
