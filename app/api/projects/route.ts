import { apiRoute, send } from '@/lib/server/http';
import { projects } from '@/lib/server/projects';

export const GET = apiRoute(async (req) => send(req, await projects(), 'application/json'));
