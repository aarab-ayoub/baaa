import 'server-only';
import type { Campus } from '@/lib/types';
import { getAll } from './api42';
import { cached } from './cache';
import { CAMPUS_MS } from './config';

type ApiCampus = Campus & { active: boolean };

export function campuses() {
  return cached(
    'campuses',
    async (): Promise<Campus[]> => {
      const list = await getAll<ApiCampus>('/v2/campus');
      return list
        .filter((c) => c.active)
        .map((c) => ({ id: c.id, name: c.name, country: c.country }))
        .sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
    },
    CAMPUS_MS
  );
}

// only real campuses, so nobody can make us spam the API with junk ids
export async function campusId(param: string) {
  if (!/^\d{1,5}$/.test(param)) return null;
  const id = Number(param);
  return (await campuses()).some((c) => c.id === id) ? id : null;
}
