import 'server-only';
import type { Project } from '@/lib/types';
import { getAll } from './api42';
import { cached } from './cache';
import { CAMPUS_MS, CURSUS } from './config';

type ApiProject = { id: number; name: string; difficulty: number };

// every 42cursus project that gives xp, for the level calculator
export function projects() {
  return cached(
    'projects',
    async (): Promise<Project[]> => {
      const list = await getAll<ApiProject>(`/v2/cursus/${CURSUS}/projects`);
      const seen = new Set<string>();
      return list
        .filter((p) => p.difficulty > 0 && !seen.has(p.name) && seen.add(p.name))
        .map((p) => ({ id: p.id, name: p.name, xp: p.difficulty }))
        .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
    },
    CAMPUS_MS
  );
}
