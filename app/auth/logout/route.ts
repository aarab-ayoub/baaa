import type { NextRequest } from 'next/server';
import { cookie, fail } from '@/lib/server/http';

// logout is the only POST, and only from our own page (no csrf logouts). nothing about
// students is in the browser's cache to clear (all of it is sent no-store); asking chrome to
// clear it anyway made logging out hang for seconds while it went through the whole cache
export function POST(req: NextRequest) {
  if (req.headers.get('sec-fetch-site') !== 'same-origin') return fail(403, 'forbidden');
  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store', 'Set-Cookie': cookie('sid', '', 0) },
  });
}
