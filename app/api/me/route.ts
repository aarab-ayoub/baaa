import type { NextRequest } from 'next/server';
import { REQUIRE_LOGIN } from '@/lib/server/config';
import { sessionOf } from '@/lib/server/http';

export function GET(req: NextRequest) {
  const me = sessionOf(req);
  return Response.json({ user: me ? me.user : null, required: REQUIRE_LOGIN }, { headers: { 'Cache-Control': 'no-store' } });
}
