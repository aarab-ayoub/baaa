import { campuses } from '@/lib/server/campuses';
import { apiRoute, send } from '@/lib/server/http';

export const GET = apiRoute(async () => send(await campuses()));
