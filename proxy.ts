import { NextResponse, type NextRequest } from 'next/server';

// only answer to our own host name: blocks DNS-rebinding tricks where a random
// website points its domain at 127.0.0.1 to read this server from your browser
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;

const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

export function proxy(request: NextRequest) {
  if (!LOCAL.test(request.headers.get('host') ?? '')) return fail(421, 'bad host');
  const { pathname, search } = request.nextUrl;
  if (pathname.length + search.length > 2000) return fail(414, 'url too long');
  // the page only ever calls its own api, so refuse other sites' scripts
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none' && /^\/(api|img)\//.test(pathname)) return fail(403, 'forbidden');

  // strict: no inline code except next's own (marked with this request's nonce), no
  // eval, nothing loaded from anywhere but this server
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const dev = process.env.NODE_ENV === 'development';
  const csp = [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' ${dev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self'",
    "connect-src 'self'",
    "manifest-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ');

  const headers = new Headers(request.headers);
  headers.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
