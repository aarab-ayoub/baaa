import 'server-only';
import type { Ranking } from '@/lib/types';
import { get, getAll } from './api42';
import { cached } from './cache';
import { CURSUS } from './config';
import { Refused } from './http';
import { allow } from './limits';
import { isStudent, student, type CursusUser } from './students';

type Bloc = { coalitions: { id: number; name: string; color: string; score: number }[] };

const COLOR = /^#[0-9a-f]{3,8}$/i;

export function ranking(campusId: number) {
  return cached(`rank:${campusId}`, async (): Promise<Ranking> => {
    if (!allow('campuses', String(campusId))) throw new Refused(429, 'too many new campuses this hour, try again later');
    const [cursusUsers, blocs] = await Promise.all([
      getAll<CursusUser>(`/v2/cursus/${CURSUS}/cursus_users?filter[campus_id]=${campusId}`),
      get<Bloc[]>(`/v2/blocs?filter[campus_id]=${campusId}&filter[cursus_id]=${CURSUS}`).then((r) => r.data),
    ]);

    const coalitions = (blocs[0]?.coalitions || []).map((c) => ({
      id: c.id,
      name: c.name,
      color: COLOR.test(c.color) ? c.color : '#888',
      score: c.score,
    }));

    const member = new Map<number, number>();
    const lists = await Promise.all(coalitions.map((c) => getAll<{ user_id: number }>(`/v2/coalitions/${c.id}/coalitions_users`)));
    coalitions.forEach((c, i) => {
      for (const u of lists[i]) member.set(u.user_id, c.id);
    });

    // same level: alphabetical, and the page gives each their own rank in that order
    const students = cursusUsers
      .filter(isStudent)
      .map((cu) => ({ ...student(cu), coal: member.get(cu.user.id) || null }))
      .sort((a, b) => b.level - a.level || a.login.localeCompare(b.login));

    return { fetchedAt: new Date().toISOString(), coalitions, students };
  });
}
