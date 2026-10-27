import { isCached } from '@/lib/server/cache';
import { campusId } from '@/lib/server/campuses';
import { apiRoute, fail, send } from '@/lib/server/http';
import { allow } from '@/lib/server/limits';
import { ranking } from '@/lib/server/ranking';

export const GET = apiRoute<{ campus: string }>(async (req, { params }) => {
  const id = await campusId((await params).campus);
  if (id == null) return fail(404, 'unknown campus');
  if (!isCached(`rank:${id}`) && !allow('campuses')) return fail(429, 'too many new campuses this hour, try again later');
  return send(req, await ranking(id), 'application/json');
});
