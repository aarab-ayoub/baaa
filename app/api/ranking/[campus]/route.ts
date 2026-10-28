import { campusId } from '@/lib/server/campuses';
import { apiRoute, fail, send } from '@/lib/server/http';
import { ranking } from '@/lib/server/ranking';

export const GET = apiRoute<{ campus: string }>(async (_req, { params }) => {
  const id = await campusId((await params).campus);
  if (id == null) return fail(404, 'unknown campus');
  return send(await ranking(id));
});
