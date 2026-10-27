import { PhotoZoom } from '@/components/ui/photo-zoom';
import type { Student } from '@/lib/types';
import { profileUrl } from '@/lib/utils';

// photo (bigger on hover), login (to their intra profile), and the full name under it
export function StudentCell({ u }: { u: Student }) {
  return (
    <div className="flex items-center gap-3">
      <PhotoZoom u={u} />
      <span className="min-w-0 overflow-hidden">
        <a href={profileUrl(u.login)} target="_blank" rel="noopener noreferrer" className="font-medium">
          {u.login}
        </a>
        {u.bh && <span className="ml-[6px] text-[12px] text-[#c0392b]">{'blackholed ' + u.bh}</span>}
        <div className="overflow-hidden text-ellipsis text-[13px] text-[#8a8a8a] phone:hidden">{u.name}</div>
      </span>
    </div>
  );
}
