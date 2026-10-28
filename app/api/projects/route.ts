import { apiRoute, send } from '@/lib/server/http';
import { projects } from '@/lib/server/projects';

export const GET = apiRoute(async () => send(await projects()));
