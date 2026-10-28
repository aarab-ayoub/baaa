import 'server-only';
import type { Project } from '@/lib/types';
import { getAll } from './api42';
import { cached } from './cache';
import { CAMPUS_MS, CURSUS } from './config';

type ApiProject = { id: number; name: string; difficulty: number; project_sessions?: { solo: boolean; cursus_id: number | null }[] };
export type CatalogProject = { id: number; name: string; xp: number; group: boolean };

// every 42cursus project: its xp, and whether it's a group one (every 42cursus session
// of it is done in a team; a project that's solo somewhere doesn't count as one)
export function catalog() {
  return cached(
    'catalog',
    async (): Promise<CatalogProject[]> => {
      const list = await getAll<ApiProject>(`/v2/cursus/${CURSUS}/projects`);
      return list.map((p) => {
        const sessions = (p.project_sessions || []).filter((s) => s.cursus_id == null || s.cursus_id === CURSUS);
        return { id: p.id, name: p.name, xp: p.difficulty || 0, group: sessions.length > 0 && sessions.every((s) => s.solo === false) };
      });
    },
    CAMPUS_MS
  );
}

// every 42cursus project that gives xp, for the level calculator
export async function projects(): Promise<Project[]> {
  const seen = new Set<string>();
  return (await catalog())
    .filter((p) => p.xp > 0 && !seen.has(p.name) && seen.add(p.name))
    .map((p) => ({ id: p.id, name: p.name, xp: p.xp }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
}
