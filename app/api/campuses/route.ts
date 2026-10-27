import { campuses } from '@/lib/server/campuses';
import { apiRoute, send } from '@/lib/server/http';

export const GET = apiRoute(async (req) => send(req, await campuses(), 'application/json'));
