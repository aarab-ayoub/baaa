import { apiRoute, send, sessionOf } from '@/lib/server/http';
import { rncpOf } from '@/lib/server/rncp';

// your own record only: the login comes from your session, never from the url
export const GET = apiRoute(async (req) => send(await rncpOf(sessionOf(req)!.user.login)));
