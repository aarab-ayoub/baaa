import 'server-only';
import type { Student } from '@/lib/types';
import { localImage } from './images';

// the parts of the api's cursus_users rows we read
export type ApiUser = {
  id: number;
  login: string;
  usual_full_name?: string;
  displayname?: string;
  kind: string;
  'staff?': boolean;
  'alumni?': boolean;
  pool_year?: string;
  image?: { link?: string; versions?: { micro?: string; small?: string; medium?: string } };
};
export type CursusUser = { begin_at: string; end_at: string | null; level: number; cursus_id: number; user: ApiUser };

export const isStudent = (cu: CursusUser) => cu.user && cu.user.kind === 'student' && !cu.user['staff?'];

// one 42cursus row -> what the page shows about that student
export function student(cu: CursusUser): Student {
  const u = cu.user;
  // 42 has square photos at 25 (micro), 175 (small) and 350px (medium): the 40px
  // avatar takes small (sharp on retina), the zoom on hover takes medium
  const v = u.image?.versions;
  // blackholed_at is often left in the past for students who got extra time,
  // so "absorbed" = the cursus was actually closed (end_at set and passed).
  const ended = cu.end_at && new Date(cu.end_at).getTime() <= Date.now() && !u['alumni?'];
  return {
    login: u.login,
    name: u.usual_full_name || u.displayname || '',
    img: localImage(v?.small || v?.micro || u.image?.link),
    photo: localImage(v?.medium || v?.small || u.image?.link),
    level: cu.level,
    promo: u.pool_year || '',
    bh: ended ? cu.end_at!.slice(0, 10) : null,
  };
}
