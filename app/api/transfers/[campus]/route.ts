import { campusId } from '@/lib/server/campuses';
import { apiRoute, fail, send } from '@/lib/server/http';
import { transfers } from '@/lib/server/transfers';

// every campus's transfers come out of one list, so a new campus costs no calls
export const GET = apiRoute<{ campus: string }>(async (req, { params }) => {
  const id = await campusId((await params).campus);
  if (id == null) return fail(404, 'unknown campus');
  return send(req, await transfers(id), 'application/json');
});
