import { isCached } from '@/lib/server/cache';
import { apiRoute, fail, send } from '@/lib/server/http';
import { allow } from '@/lib/server/limits';
import { userLevel } from '@/lib/server/users';

const LOGIN = /^[a-z0-9-]{1,32}$/;

export const GET = apiRoute<{ login: string }>(async (req, { params }) => {
  const login = (await params).login.toLowerCase();
  if (!LOGIN.test(login)) return fail(404, 'no such student');
  if (!isCached(`user:${login}`) && !allow('lookups')) return fail(429, 'too many lookups this hour, try again later');
  const entry = await userLevel(login);
  if (entry.value.level == null) return fail(404, 'no 42cursus level for this login');
  return send(req, entry, 'application/json');
});
