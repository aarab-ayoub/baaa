import 'server-only';
import { after } from 'next/server';
import type { Project } from '@/lib/types';
import { getAll } from './api42';
import { cached } from './cache';
import seed from './catalog-seed.json';
import { CAMPUS_MS, CURSUS } from './config';

type ApiProject = { id: number; name: string; difficulty: number; project_sessions?: { solo: boolean; cursus_id: number | null }[] };
export type CatalogProject = { id: number; name: string; xp: number; group: boolean };

// how long a page waits for the live list before the copy shipped with the app answers
const LIVE_WAIT_MS = 800;

// every 42cursus project: its xp, and whether it's a group one (every 42cursus session
// of it is done in a team; a project that's solo somewhere doesn't count as one). 42 sends
// it with every campus's sessions, 2-5 MB a page and ~30s in all, so it's kept a day
function live() {
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

// the live list when it's at hand; until it is, the copy shipped with the app (made by
// scripts/catalog-seed.mjs) answers at once and the live one carries on after the response
export async function catalog(): Promise<CatalogProject[]> {
  const fresh = live();
  const quick = await Promise.race([fresh.catch(() => null), new Promise<null>((r) => setTimeout(r, LIVE_WAIT_MS, null))]);
  if (quick) return quick;
  after(() => fresh.then(() => {}, (e) => console.error('catalog:', (e as Error).message)));
  return seed;
}

// every 42cursus project that gives xp, for the level calculator
export async function projects(): Promise<Project[]> {
  const seen = new Set<string>();
  return (await catalog())
    .filter((p) => p.xp > 0 && !seen.has(p.name) && seen.add(p.name))
    .map((p) => ({ id: p.id, name: p.name, xp: p.xp }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
}
