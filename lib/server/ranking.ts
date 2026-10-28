import 'server-only';
import type { Coalition, Ranking } from '@/lib/types';
import { get, getAll } from './api42';
import { cached, keep, peek, type Entry } from './cache';
import { CURSUS } from './config';
import { Refused } from './http';
import { allow } from './limits';
import { once } from './once';
import { isStudent, student, type CursusUser } from './students';

type Bloc = { coalitions: { id: number; name: string; color: string; score: number }[] };

const COLOR = /^#[0-9a-f]{3,8}$/i;
const FULL_MS = 24 * 60 * 60 * 1000; // a whole campus is fetched again once a day
const key = (campusId: number) => `rank:${campusId}`;

// a kept ranking also knows when it was last fetched whole
type Kept = Ranking & { fullAt?: number };
// same level: alphabetical, and the page gives each their own rank in that order
const order = (a: { level: number; login: string }, b: { level: number; login: string }) => b.level - a.level || a.login.localeCompare(b.login);

// a ranking on its way, for whoever waits for it: the lines sent so far (newline-delimited
// json: {students} for each page, then {done} or {error}) and who listens for the next ones
export type Feed = { lines: string[]; listeners: Set<() => void>; done: boolean };
const feeds = once('rankFeeds', () => new Map<number, Feed>());

// the whole ranking of a campus. 42 sends its students best first, so each page that comes
// in extends the top of the list, and `feed` gets it at once; the coalitions come last
async function build(campusId: number, feed?: Feed): Promise<Kept> {
  const push = (line: unknown) => {
    if (!feed) return;
    feed.lines.push(JSON.stringify(line) + '\n');
    for (const l of feed.listeners) l();
  };
  const page = (n: number, urgent = false) => get<CursusUser[]>(`/v2/cursus/${CURSUS}/cursus_users?filter[campus_id]=${campusId}&sort=-level,id&per_page=100&page=${n}`, urgent);

  const first = await page(1, true); // the first hundred go before anything else
  const blocs = get<Bloc[]>(`/v2/blocs?filter[campus_id]=${campusId}&filter[cursus_id]=${CURSUS}`).then((r) => r.data);
  const rest = Array.from({ length: Math.max(0, Math.ceil(first.total / 100) - 1) }, (_, i) => page(i + 2).then((r) => r.data));
  const all: CursusUser[] = [];
  const add = (list: CursusUser[]) => {
    all.push(...list);
    const students = list.filter(isStudent).map(student);
    if (students.length) push({ students });
  };

  // the coalitions queue up behind the pages
  const members = (async () => {
    const coalitions: Coalition[] = ((await blocs)[0]?.coalitions || []).map((c) => ({ id: c.id, name: c.name, color: COLOR.test(c.color) ? c.color : '#888', score: c.score }));
    const lists = await Promise.all(coalitions.map((c) => getAll<{ user_id: number }>(`/v2/coalitions/${c.id}/coalitions_users`)));
    const member = new Map<number, number>();
    coalitions.forEach((c, i) => {
      for (const u of lists[i]) member.set(u.user_id, c.id);
    });
    return { coalitions, member };
  })();

  add(first.data);
  for (const p of rest) add(await p); // in page order, as each arrives
  const { coalitions, member } = await members;
  const students = all
    .filter(isStudent)
    .map((cu) => ({ ...student(cu), coal: member.get(cu.user.id) || null }))
    .sort(order);
  const ranking: Kept = { fetchedAt: new Date().toISOString(), coalitions, students, fullAt: Date.now() };
  push({ done: { fetchedAt: ranking.fetchedAt, coalitions, members: Object.fromEntries(students.filter((s) => s.coal).map((s) => [s.login, s.coal])) } });
  return ranking;
}

// a ranking kept less than a day: a level only changes when a project is marked, so only the
// students with a project marked since the last look are fetched again (1-2 calls instead of
// the 20-80 of a whole campus). new students, transfers, blackholes, coalitions and photos
// wait for the next whole fetch
async function update(campusId: number, old: Entry<Kept>): Promise<Kept> {
  if (!old.value.fullAt || Date.now() - old.value.fullAt > FULL_MS) return build(campusId);
  const since = new Date(old.at - 60_000).toISOString(); // a minute of overlap, so no mark slips between two looks
  const marked = await getAll<{ user?: { id: number } }>(`/v2/projects_users?filter[campus]=${campusId}&filter[cursus]=${CURSUS}&range[marked_at]=${since},${new Date().toISOString()}`);
  const ids = [...new Set(marked.map((p) => p.user?.id).filter((id): id is number => !!id))];
  const batches = Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) => ids.slice(i * 100, (i + 1) * 100));
  const rows = (await Promise.all(batches.map((b) => getAll<CursusUser>(`/v2/cursus/${CURSUS}/cursus_users?filter[user_id]=${b.join(',')}`)))).flat();
  const fresh = new Map(rows.filter(isStudent).map((cu) => [cu.user.login, student(cu)]));
  const students = old.value.students.map((u) => { const f = fresh.get(u.login); return f ? { ...f, coal: u.coal } : u; }).sort(order);
  console.log(`rank ${campusId}: ${ids.length} students with a new mark, ${1 + batches.length} calls`);
  return { ...old.value, fetchedAt: new Date().toISOString(), students };
}

// a campus's ranking right away when it's kept, or a feed of it while it's fetched
export async function rankingNow(campusId: number): Promise<{ ranking: Ranking } | { feed: Feed }> {
  if (await peek(key(campusId), Infinity)) return { ranking: await cached<Kept>(key(campusId), () => build(campusId), undefined, (old) => update(campusId, old)) };
  let feed = feeds.get(campusId);
  if (!feed) {
    if (!allow('campuses', String(campusId))) throw new Refused(429, 'too many new campuses this hour, try again later');
    const f: Feed = { lines: [], listeners: new Set(), done: false };
    feeds.set(campusId, f);
    keep(key(campusId), () => build(campusId, f))
      .catch((e: Error) => {
        console.error(e.message);
        f.lines.push(JSON.stringify({ error: '42 api unavailable, try again' }) + '\n');
      })
      .finally(() => {
        f.done = true;
        feeds.delete(campusId);
        for (const l of f.listeners) l();
      });
    feed = f;
  }
  return { feed };
}
