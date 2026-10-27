import { Avatar } from '@/components/ui/avatar';
import type { Student } from '@/lib/types';
import { profileUrl } from '@/lib/utils';

// photo, login (to their intra profile), and the full name under it
export function StudentCell({ u }: { u: Student }) {
  return (
    <div className="flex items-center gap-[10px]">
      <Avatar u={u} />
      <span className="min-w-0 overflow-hidden">
        <a href={profileUrl(u.login)} target="_blank" rel="noopener noreferrer">
          {u.login}
        </a>
        {u.bh && <span className="ml-[6px] text-[11px] text-[#c0392b]">{'blackholed ' + u.bh}</span>}
        <div className="overflow-hidden text-ellipsis text-[12px] text-[#8a8a8a] phone:hidden">{u.name}</div>
      </span>
    </div>
  );
}
