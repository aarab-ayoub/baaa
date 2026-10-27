import type { NextRequest } from 'next/server';
import { cookie, fail } from '@/lib/server/http';
import { endSession } from '@/lib/server/sessions';

// logout is the only POST, and only from our own page (no csrf logouts)
export function POST(req: NextRequest) {
  if (req.headers.get('sec-fetch-site') !== 'same-origin') return fail(403, 'forbidden');
  endSession(req.cookies.get('sid')?.value);
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'Set-Cookie': cookie('sid', '', 0) } });
}
