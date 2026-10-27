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
  image?: { link?: string; versions?: { micro?: string; small?: string } };
};
export type CursusUser = { begin_at: string; end_at: string | null; level: number; cursus_id: number; user: ApiUser };

// photos we show instead of the intra one
export const PHOTO_OVERRIDES: Record<string, string> = { ayaarab: '/chongo.jpg' };

export const isStudent = (cu: CursusUser) => cu.user && cu.user.kind === 'student' && !cu.user['staff?'];

// one 42cursus row -> what the page shows about that student
export function student(cu: CursusUser): Student {
  const u = cu.user;
  // avatar is shown at 28px, so the smallest version is plenty
  const img = u.image?.versions?.micro || u.image?.versions?.small || u.image?.link;
  // blackholed_at is often left in the past for students who got extra time,
  // so "absorbed" = the cursus was actually closed (end_at set and passed).
  const ended = cu.end_at && new Date(cu.end_at).getTime() <= Date.now() && !u['alumni?'];
  return {
    login: u.login,
    name: u.usual_full_name || u.displayname || '',
    img: PHOTO_OVERRIDES[u.login] || localImage(img),
    level: cu.level,
    promo: u.pool_year || '',
    bh: ended ? cu.end_at!.slice(0, 10) : null,
  };
}
