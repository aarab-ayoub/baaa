import 'server-only';
import { EVENT_KINDS, RNCP_PROJECTS, type Done, type RncpData } from '@/lib/rncp';
import { get, getAll } from './api42';
import { CURSUS } from './config';
import legacy from './legacy-projects.json';
import { once } from './once';
import { catalog } from './projects';

type ApiUser = {
  id: number;
  cursus_users: { cursus_id: number; level: number }[];
  projects_users: { final_mark: number | null; status: string; 'validated?': boolean | null; marked_at: string | null; cursus_ids: number[]; project: { id: number } }[];
};
type ApiEvent = { kind: string; begin_at: string };

const MEMO_MS = 60_000;

// a student's own record, for their own eyes only: fetched when they open the page and
// kept a minute in memory so reloading costs no api calls, never stored anywhere
const recent = once('rncpRecent', () => new Map<string, Promise<RncpData>>());

export function rncpOf(login: string) {
  if (!recent.has(login)) {
    const p = load(login);
    recent.set(login, p);
    setTimeout(() => recent.delete(login), MEMO_MS).unref?.();
    p.catch(() => recent.delete(login));
  }
  return recent.get(login)!;
}

async function load(login: string): Promise<RncpData> {
  // your profile and events go first in the api queue, at the same time; the catalog never
  // makes you wait (lib/server/projects.ts)
  const who = encodeURIComponent(login);
  const [u, signedUp, all] = await Promise.all([get<ApiUser>(`/v2/users/${who}`, true).then((r) => r.data), getAll<ApiEvent>(`/v2/users/${who}/events`, true), catalog()]);
  // events you signed up for that already took place, of the kinds gcc counts
  const now = Date.now();
  const events = signedUp.filter((e) => EVENT_KINDS.has(e.kind) && Date.parse(e.begin_at) <= now);

  // a project tried more than once: the validated try, else the latest
  const projects: Record<number, Done> = {};
  for (const pu of u.projects_users) {
    if (!pu.cursus_ids.includes(CURSUS)) continue;
    const p: Done = { mark: pu.final_mark ?? 0, ok: pu['validated?'] === true, at: pu.marked_at, status: pu.status };
    const had = projects[pu.project.id];
    if (!had || (p.ok && !had.ok) || (p.ok === had.ok && (p.at ?? '') > (had.at ?? ''))) projects[pu.project.id] = p;
  }

  // names and xp of the projects the page shows; the ones 42cursus no longer lists from
  // legacy-projects.json (scripts/legacy-projects.mjs)
  const byId = new Map(all.map((p) => [p.id, p]));
  const old = new Map(legacy.map((p) => [p.id, p]));
  const known: RncpData['catalog'] = {};
  for (const id of RNCP_PROJECTS) {
    const p = byId.get(id);
    const o = old.get(id);
    if (p) known[id] = { name: p.name, xp: p.xp, ...(o && { legacy: true }) };
    else if (o) known[id] = { name: o.name, xp: o.xp, legacy: true };
  }
  return {
    fetchedAt: new Date().toISOString(),
    level: u.cursus_users.find((c) => c.cursus_id === CURSUS)?.level ?? 0,
    events: events.length,
    projects,
    catalog: known,
  };
}
