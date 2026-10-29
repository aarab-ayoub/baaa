import official from '@/lib/rncp-official.json';
import { levelToXp, xpToLevel } from '@/lib/xp';

// the RNCP titles 42cursus leads to, as 42's own checker sets them: gcc.42.fr ("Grand Cursus
// Checker"), whose rules and project lists are in rncp-official.json (see its `source`). a
// title wants its level, its events, 1 Suite project, 2 work experiences, 2 group projects,
// and every category of its option: so many projects of the category's list validated, and
// so much xp from the projects of its xp list (the piscines' modules among them)

export type TrackId = 'web' | 'app' | 'sys' | 'data';
// `ids`: the projects that count, a piscine as one (see PISCINES); `xpIds`: those whose xp counts
export type Category = { name: string; count: number; xp: number; ids: number[]; xpIds: number[] };
export type Track = { id: TrackId; rncp: 6 | 7; option: 1 | 2; name: string; short: string; level: number; events: number; categories: Category[] };

export const TITLES = { 6: 'IT solutions designer and developer', 7: 'IT architecture expert' } as const;

// a piscine counts once its last module is validated, for the xp its modules gave: gcc lists
// the last module among the projects that count, and the page shows the piscine in its place
export const PISCINES: Record<number, { last: number; modules: number[] }> = {
  2179: { last: 2188, modules: [2180, 2181, 2182, 2183, 2184, 2185, 2186, 2187, 2188] },
  2189: { last: 2198, modules: [2190, 2191, 2192, 2193, 2194, 2195, 2196, 2197, 2198] },
  2199: { last: 2208, modules: [2200, 2201, 2202, 2203, 2204, 2205, 2206, 2207, 2208] },
  2228: { last: 2282, modules: [2230, 2234, 2237, 2251, 2252, 2279, 2280, 2281, 2282] },
  2267: { last: 2272, modules: [2268, 2269, 2270, 2271, 2272] },
  2295: { last: 2317, modules: [2306, 2318, 2311, 2316, 2317] },
  2346: { last: 2345, modules: [2326, 2327, 2328, 2336, 2337, 2343, 2344, 2345] },
  2355: { last: 2360, modules: [2354, 2356, 2357, 2358, 2359, 2360] },
  2364: { last: 2370, modules: [2365, 2366, 2367, 2368, 2369, 2370] },
};
const PISCINE_OF = new Map(Object.entries(PISCINES).map(([id, p]) => [p.last, Number(id)]));

type Official = { name: string; count: number; ids: number[]; xp?: number; xpIds?: number[] };
const category = (c: Official): Category => ({ name: c.name, count: c.count, xp: c.xp ?? 0, ids: [...new Set(c.ids.map((id) => PISCINE_OF.get(id) ?? id))], xpIds: c.xpIds ?? [] });
const levels = official.levels as Record<'6' | '7', number>;
const events = official.events as unknown as Record<'6' | '7', number> & { kinds: string[] };
const track = (id: TrackId, rncp: 6 | 7, option: 1 | 2, name: string, short: string): Track => ({
  id,
  rncp,
  option,
  name,
  short,
  level: levels[rncp],
  events: events[rncp],
  categories: (official.tracks as Record<TrackId, Official[]>)[id].map(category),
});

export const TRACKS: Track[] = [
  track('web', 6, 1, 'Web and mobile application development', 'Web and mobile'),
  track('app', 6, 2, 'Applicative software development', 'Applicative'),
  track('sys', 7, 1, 'Information systems and networks', 'Systems and networks'),
  track('data', 7, 2, 'Database architecture and data', 'Databases and data'),
];
export const SUITE = category(official.suite);
export const WORK = category(official.work); // internships, work experiences, apprenticeships
export const GROUP = category(official.group); // none of them from the common core
export const EVENT_KINDS = new Set(events.kinds); // outside and association events don't count

// every project the page can show, plan or count xp from
export const RNCP_PROJECTS = new Set([...Object.keys(official.names).map(Number), ...Object.keys(PISCINES).map(Number), ...Object.values(PISCINES).flatMap((p) => p.modules)]);

// what the page gets: the student's own record, and the projects it needs to know (`legacy`:
// one 42cursus no longer has, shown only to those who did it)
export type Done = { mark: number; ok: boolean; at: string | null; status: string };
export type RncpData = {
  fetchedAt: string;
  level: number;
  events: number;
  projects: Record<number, Done>;
  catalog: Record<number, { name: string; xp: number; legacy?: boolean }>;
};
// project id -> the mark you plan to get
export type Plan = Record<number, number>;

export type Step = { done: boolean; planned: boolean; busy: boolean; xp: number; planXp: number; baseXp: number };

const BUSY = new Set(['in_progress', 'searching_a_group', 'creating_group', 'waiting_for_correction']);
const parts = (id: number) => PISCINES[id]?.modules ?? [id];
const gained = (data: RncpData, id: number, mark: number) => ((data.catalog[id]?.xp ?? 0) * mark) / 100;

// one project: done (a piscine: its last module), planned or under way, and its xp
export function step(id: number, data: RncpData, plan: Plan): Step {
  const piscine = PISCINES[id];
  const done = data.projects[piscine ? piscine.last : id]?.ok === true;
  const planned = !done && plan[id] != null;
  const s: Step = { done, planned, busy: false, xp: 0, planXp: 0, baseXp: 0 };
  for (const m of parts(id)) {
    const p = data.projects[m];
    s.baseXp += data.catalog[m]?.xp ?? 0;
    if (p?.ok) s.xp += gained(data, m, p.mark);
    else if (planned) s.planXp += gained(data, m, plan[id]);
    if (!done && p && !p.ok && BUSY.has(p.status)) s.busy = true;
  }
  return s;
}

export type Tally = { count: number; planCount: number; xp: number; planXp: number; ok: boolean; okWithPlan: boolean };

// a category: how many of its projects are done, and the xp of its xp list, today and with
// the plan (a planned project adds the xp of what it has in that list)
export function tally(c: Category, data: RncpData, plan: Plan): Tally {
  const xpIds = new Set(c.xpIds);
  let count = 0;
  let planCount = 0;
  let xp = 0;
  let planXp = 0;
  for (const id of c.ids) {
    const s = step(id, data, plan);
    count += Number(s.done);
    planCount += Number(s.planned);
    if (s.planned) for (const m of parts(id)) if (xpIds.has(m) && !data.projects[m]?.ok) planXp += gained(data, m, plan[id]);
  }
  for (const id of xpIds) {
    const p = data.projects[id];
    if (p?.ok) xp += gained(data, id, p.mark);
  }
  return { count, planCount, xp, planXp, ok: count >= c.count && xp >= c.xp, okWithPlan: count + planCount >= c.count && xp + planXp >= c.xp };
}

// the level once every planned project is done (each counted once)
export function levelWithPlan(data: RncpData, plan: Plan) {
  const xp = Object.keys(plan).reduce((sum, id) => sum + step(Number(id), data, plan).planXp, 0);
  return xpToLevel(levelToXp(data.level) + xp);
}
