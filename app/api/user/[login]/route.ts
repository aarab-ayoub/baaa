import { apiRoute, fail, send } from '@/lib/server/http';
import { userLevel } from '@/lib/server/users';

const LOGIN = /^[a-z0-9-]{1,32}$/;

export const GET = apiRoute<{ login: string }>(async (_req, { params }) => {
  const login = (await params).login.toLowerCase();
  if (!LOGIN.test(login)) return fail(404, 'no such student');
  const user = await userLevel(login);
  if (user.level == null) return fail(404, 'no 42cursus level for this login');
  return send(user);
});
