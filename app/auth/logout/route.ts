import type { NextRequest } from 'next/server';
import { cookie, fail } from '@/lib/server/http';

// logout is the only POST, and only from our own page (no csrf logouts). the browser
// is also told to drop anything it may still hold from us
export function POST(req: NextRequest) {
  if (req.headers.get('sec-fetch-site') !== 'same-origin') return fail(403, 'forbidden');
  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'no-store', 'Clear-Site-Data': '"cache"', 'Set-Cookie': cookie('sid', '', 0) },
  });
}
