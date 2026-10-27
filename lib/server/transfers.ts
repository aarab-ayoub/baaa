import 'server-only';
import type { Move, Transfers } from '@/lib/types';
import { getAll } from './api42';
import { cached, pack, type Entry } from './cache';
import { campuses } from './campuses';
import { CURSUS } from './config';
import { once } from './once';
import { isStudent, student, type CursusUser } from './students';

// the api has no transfer object: changing campus adds a campus_users row for the new
// campus, and that row becomes the primary one once the student is there. rows added
// before the cursus even started are piscine leftovers (rabat's first promo got a
// benguerir or khouribga row that way), so only a campus joined after the start counts.
// only people with a second campus can have moved, and the whole network has a few
// thousand of them, so one list covers every campus: ~100 calls to build, done in the
// background and kept on disk, and a campus's transfers are a filter over it (instant)
const TRANSFERS_MS = 60 * 60 * 1000; // nobody changes campus by the minute
const AFTER_START_MS = 30 * 24 * 60 * 60 * 1000;
// the api takes long id lists, but every page after the first repeats the whole url in
// its Link header (up to 4 times) and node's fetch refuses headers over 16KB: 500 ids
// break that, 200 stay far below. most ids here are staff who come back with nothing,
// so 200 at a time still needs far fewer calls than 100 would
const IDS_PER_CALL = 200;

type CampusUser = { user_id: number; campus_id: number; is_primary: boolean; created_at: string; updated_at: string };
type Moved = Pick<Move, 'from' | 'to' | 'status' | 'at'>;

const chunks = <T>(list: T[], n = IDS_PER_CALL) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, (i + 1) * n));

// the primary campus_users row of each of these people
function primaryRows(ids: number[]) {
  return Promise.all(chunks(ids).map((c) => getAll<CampusUser>(`/v2/campus_users?filter[user_id]=${c.join(',')}&filter[is_primary]=true`))).then((r) => r.flat());
}

// a student's latest move from their campus_users rows, or null if they never moved
function lastMove(rows: CampusUser[], beginAt: string, known: Set<number>): Moved | null {
  const list = rows.filter((r) => known.has(r.campus_id)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const to = list.pop();
  if (!to || !list.length || !(Date.parse(to.created_at) > Date.parse(beginAt) + AFTER_START_MS)) return null;
  // on the way: they still belong to their primary campus. arrived: they come from the
  // campus that stopped being primary when the new one took over, the one touched last
  const from = to.is_primary ? list.reduce((a, b) => (b.updated_at > a.updated_at ? b : a)) : list.find((r) => r.is_primary);
  if (!from || from.campus_id === to.campus_id) return null;
  return to.is_primary
    ? { from: from.campus_id, to: to.campus_id, status: 'arrived', at: to.updated_at.slice(0, 10) }
    : { from: from.campus_id, to: to.campus_id, status: 'moving', at: to.created_at.slice(0, 10) };
}

// every move in the network, newest first
export function allMoves() {
  return cached(
    'transfers',
    async (): Promise<Transfers> => {
      const known = new Set((await campuses()).value.map((c) => c.id));
      const rows = new Map<number, CampusUser[]>(); // user id -> their campus_users rows
      for (const r of await getAll<CampusUser>('/v2/campus_users?filter[is_primary]=false')) {
        if (!rows.has(r.user_id)) rows.set(r.user_id, []);
        rows.get(r.user_id)!.push(r);
      }
      // most second campuses belong to staff, who have no 42cursus row: skip them. these
      // calls take seconds each on 42's side, so they all go out at once (still 2/s)
      const cus = (await Promise.all(chunks([...rows.keys()]).map((ids) => getAll<CursusUser>(`/v2/cursus/${CURSUS}/cursus_users?filter[user_id]=${ids.join(',')}`))))
        .flat()
        .filter(isStudent);
      for (const r of await primaryRows(cus.map((cu) => cu.user.id))) rows.get(r.user_id)!.push(r);
      const students: Move[] = [];
      for (const cu of cus) {
        const move = lastMove(rows.get(cu.user.id)!, cu.begin_at, known);
        if (move) students.push({ ...student(cu), ...move });
      }
      students.sort((a, b) => b.at.localeCompare(a.at) || b.level - a.level);
      return { fetchedAt: new Date().toISOString(), students };
    },
    TRANSFERS_MS
  );
}

// one campus's share of that list, packed once per version of it
const views = once('campusMoves', () => new Map<number, { of: Entry<Transfers>; entry: Entry<Transfers> }>());

export async function transfers(campusId: number) {
  const all = await allMoves();
  const hit = views.get(campusId);
  if (hit?.of === all) return hit.entry;
  const students = all.value.students.filter((s) => s.from === campusId || s.to === campusId);
  const entry = pack({ fetchedAt: all.value.fetchedAt, students });
  views.set(campusId, { of: all, entry });
  return entry;
}
