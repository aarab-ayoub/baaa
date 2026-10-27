import 'server-only';
import type { NextRequest } from 'next/server';
import { REQUIRE_LOGIN } from './config';
import { getSession } from './sessions';

export function fail(status: number, error: string) {
  return Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

type Sendable = { body: string | Uint8Array<ArrayBuffer>; gz?: Uint8Array<ArrayBuffer>; etag: string };

// a cached body with its etag, or a 304 when the browser already has it. next doesn't
// compress route responses, so json goes out pre-gzipped (photos are compressed already)
export function send(req: Request, entry: Sendable, type: string, cacheControl = 'no-cache') {
  const headers: Record<string, string> = { 'Content-Type': type, ETag: entry.etag, 'Cache-Control': cacheControl, Vary: 'Accept-Encoding' };
  if (req.headers.get('if-none-match') === entry.etag) return new Response(null, { status: 304, headers });
  const gzip = entry.gz && /\bgzip\b/.test(req.headers.get('accept-encoding') || '');
  if (gzip) headers['Content-Encoding'] = 'gzip';
  return new Response(req.method === 'HEAD' ? null : gzip ? entry.gz : entry.body, { headers });
}

export function redirect(to: string, cookies: string[] = []) {
  const headers = new Headers({ Location: to, 'Cache-Control': 'no-store' });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(null, { status: 302, headers });
}

export const cookie = (name: string, value: string, maxAge: number) => `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;

export const sessionOf = (req: NextRequest) => getSession(req.cookies.get('sid')?.value);

type Context<P> = { params: Promise<P> };

// an api route: student data is only for logged-in 42 students, and a failing
// 42 api becomes a 502 instead of an error page
export function apiRoute<P = object>(handle: (req: NextRequest, ctx: Context<P>) => Promise<Response>) {
  return async (req: NextRequest, ctx: Context<P>) => {
    if (REQUIRE_LOGIN && !sessionOf(req)) return fail(401, 'login required');
    try {
      return await handle(req, ctx);
    } catch (e) {
      console.error((e as Error).message);
      return fail(502, '42 api unavailable, try again');
    }
  };
}
