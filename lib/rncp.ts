import { levelToXp, xpToLevel } from '@/lib/xp';

// the RNCP titles 42cursus leads to, as 42's articles "RNCP 6 certificate" and "RNCP 7
// certificate" (meta.intra.42.fr) set them, checked on 26 October 2026 by 42calculator.fr
// (lucas-ht/42calculator) and 42insight (fzphr/42insight, MIT). besides the level, the
// events and two work experiences, a title wants every category of its track, one Suite
// project, the common core, and two group projects after it

export type TrackId = 'web' | 'app' | 'sys' | 'data';
export type Category = { name: string; xp: number; count: number; ids: number[] };
export type Track = { id: TrackId; rncp: 6 | 7; name: string; short: string; level: number; events: number; experiences: number; categories: Category[] };

export const TITLES = { 6: 'IT solutions designer and developer', 7: 'IT architecture expert' } as const;

const WEB = [2199, 2189, 2179, 1396, 1401, 1402, 1428, 1405, 1429, 2485, 2600, 1427];

export const TRACKS: Track[] = [
  {
    id: 'web',
    rncp: 6,
    name: 'Web and mobile application development',
    short: 'Web and mobile',
    level: 17,
    events: 10,
    experiences: 2,
    categories: [
      { name: 'Web', xp: 15000, count: 2, ids: WEB },
      { name: 'Mobile', xp: 10000, count: 2, ids: [1379, 1395, 1406, 2355, 1427] },
    ],
  },
  {
    id: 'app',
    rncp: 6,
    name: 'Applicative software development',
    short: 'Applicative',
    level: 17,
    events: 10,
    experiences: 2,
    categories: [
      {
        name: 'Object-oriented programming',
        xp: 10000,
        count: 2,
        ids: [1389, 1386, 2199, 2189, 2179, 1396, 1401, 1402, 1428, 1405, 1429, 2355, 1379, 1395, 1406, 1435, 1436, 1437, 2364, 2550, 2371, 2749],
      },
      { name: 'Functional programming', xp: 10000, count: 2, ids: [2228, 1403, 1407, 1429] },
      {
        name: 'Imperative programming',
        xp: 10000,
        count: 2,
        ids: [1330, 1463, 1411, 1415, 1416, 1381, 1388, 1468, 1469, 1420, 1466, 1467, 1464, 1425, 1424, 1840, 1451, 1405, 1404, 1417, 1448, 1446, 1447, 1419, 1430, 1443],
      },
    ],
  },
  {
    id: 'sys',
    rncp: 7,
    name: 'Information systems and networks',
    short: 'Systems and networks',
    level: 21,
    events: 15,
    experiences: 2,
    categories: [
      {
        name: 'Unix and kernel',
        xp: 30000,
        count: 2,
        ids: [1467, 1468, 1463, 1330, 1411, 1415, 1469, 1466, 1416, 1381, 1388, 1420, 1464, 1425, 1424, 1426, 1431, 1432, 1438, 1439, 1440, 1441, 1442, 1421, 1422, 1423, 1456, 2749],
      },
      { name: 'System administration', xp: 50000, count: 3, ids: [1414, 2071, 2064, 1381, 1397, 1399, 1400, 2520, 2521, 2522, 2523, 2746, 2750, 2747] },
      { name: 'Security', xp: 50000, count: 3, ids: [1430, 1443, 1404, 1840, 1451, 1405, 1417, 1448, 1446, 1447, 1419, 2346, 2393, 2395, 2527, 2529, 2097] },
    ],
  },
  {
    id: 'data',
    rncp: 7,
    name: 'Database architecture and data',
    short: 'Databases and data',
    level: 21,
    events: 15,
    experiences: 2,
    categories: [
      { name: 'Web and databases', xp: 50000, count: 2, ids: WEB },
      { name: 'Artificial intelligence', xp: 70000, count: 3, ids: [2295, 1391, 1453, 1457, 2551, 1383, 1460, 1384, 1392, 2077, 2076, 2372, 2267] },
    ],
  },
];

export const SUITE: Category = { name: 'Suite', xp: 0, count: 1, ids: [1854, 1458, 2064, 1394, 1424, 1448, 1443, 1855, 1460, 2071] };
// internships, work experiences and apprenticeships: each validated one counts once
export const EXPERIENCES: Category = { name: 'Work experience', xp: 0, count: 2, ids: [1638, 1644, 1662, 1880, 1864, 1872, 2338, 2339, 2340, 2341] };
// ft_transcendence closes the common core, the 2019 one and the December 2025 one
export const CORE_END = 1337;
// the core's own group projects, both generations: they never count as "after the core"
export const CORE_GROUP = new Set([1315, 1326, 1331, 1332, 1336, 1337, 2688, 2701, 2702, 2703, 2706, 2725, 2726, 2727]);
export const GROUP_PROJECTS = 2;
// a piscine counts once its last module is validated, for the xp its modules gave
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

// every project the page can show or plan
export const RNCP_PROJECTS = new Set([
  ...TRACKS.flatMap((t) => t.categories.flatMap((c) => c.ids)),
  ...SUITE.ids,
  ...EXPERIENCES.ids,
  CORE_END,
  ...Object.values(PISCINES).flatMap((p) => p.modules),
]);

// what the page gets: the student's own record, and the projects it needs to know
export type Done = { mark: number; ok: boolean; at: string | null; status: string };
export type RncpData = {
  fetchedAt: string;
  level: number;
  events: number;
  projects: Record<number, Done>;
  catalog: Record<number, { name: string; xp: number; group: boolean }>;
};
// project id -> the mark you plan to get
export type Plan = Record<number, number>;

export type Step = { done: boolean; planned: boolean; busy: boolean; xp: number; planXp: number; baseXp: number };

const BUSY = new Set(['in_progress', 'searching_a_group', 'creating_group', 'waiting_for_correction']);

// one project: done (a piscine: its last module), planned or under way, and its xp
export function step(id: number, data: RncpData, plan: Plan): Step {
  const piscine = PISCINES[id];
  const parts = piscine ? piscine.modules : [id];
  const done = data.projects[piscine ? piscine.last : id]?.ok === true;
  const planned = !done && plan[id] != null;
  const s: Step = { done, planned, busy: false, xp: 0, planXp: 0, baseXp: 0 };
  for (const m of parts) {
    const base = data.catalog[m]?.xp ?? 0;
    const p = data.projects[m];
    s.baseXp += base;
    if (p?.ok) s.xp += (base * p.mark) / 100;
    else if (planned) s.planXp += (base * plan[id]) / 100;
    if (!done && p && !p.ok && BUSY.has(p.status)) s.busy = true;
  }
  return s;
}

export type Tally = { count: number; planCount: number; xp: number; planXp: number; ok: boolean; okWithPlan: boolean };

// a category: how many of its projects are done and the xp they gave, today and with the plan
export function tally(c: Category, data: RncpData, plan: Plan): Tally {
  let count = 0;
  let planCount = 0;
  let xp = 0;
  let planXp = 0;
  for (const id of c.ids) {
    const s = step(id, data, plan);
    count += Number(s.done);
    planCount += Number(s.planned);
    xp += s.xp;
    planXp += s.planXp;
  }
  return { count, planCount, xp, planXp, ok: count >= c.count && xp >= c.xp, okWithPlan: count + planCount >= c.count && xp + planXp >= c.xp };
}

// the level once every planned project is done (each counted once)
export function levelWithPlan(data: RncpData, plan: Plan) {
  const xp = Object.keys(plan).reduce((sum, id) => sum + step(Number(id), data, plan).planXp, 0);
  return xpToLevel(levelToXp(data.level) + xp);
}

// group projects outside the common core, validated after ft_transcendence (a missing
// date never counts); planned ones count once the core is done or planned too
export function groupProjects(data: RncpData, plan: Plan) {
  const counts = (id: number) => data.catalog[id]?.group === true && !CORE_GROUP.has(id);
  const core = data.projects[CORE_END];
  const coreAt = core?.ok ? core.at : null;
  const done = coreAt ? Object.entries(data.projects).filter(([id, p]) => p.ok && counts(Number(id)) && p.at != null && p.at > coreAt).length : 0;
  const coreOnTheWay = core?.ok === true || plan[CORE_END] != null;
  const planned = coreOnTheWay ? Object.keys(plan).map(Number).filter((id) => !data.projects[id]?.ok && counts(id)).length : 0;
  return { done, planned };
}
