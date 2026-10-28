import 'server-only';
import type { NextRequest } from 'next/server';
import { SECURE } from './config';
import { getSession } from './sessions';

// nothing about students stays behind in a browser or in a cache on the way: the page
// keeps what it needs in memory while it's open, and that's all
const NO_STORE = { 'Cache-Control': 'no-store' };

export function fail(status: number, error: string) {
  return Response.json({ error }, { status, headers: NO_STORE });
}

export const send = (data: unknown) => Response.json(data, { headers: NO_STORE });

export function redirect(to: string, cookies: string[] = []) {
  const headers = new Headers({ Location: to, ...NO_STORE });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(null, { status: 302, headers });
}

export const cookie = (name: string, value: string, maxAge: number) =>
  `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${SECURE ? '; Secure' : ''}`;

export const sessionOf = (req: NextRequest) => getSession(req.cookies.get('sid')?.value);

// a no from deep inside, like an hourly limit: the route answers with its status
export class Refused extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Context<P> = { params: Promise<P> };

// on your machine, only answer to its own host name: blocks DNS-rebinding tricks where a
// random website points its domain at 127.0.0.1 to read this server from your browser.
// vercel only ever hands us requests for the project's own domains
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;

// an api route: student data is only for logged-in 42 students, only for our own page
// (other sites' scripts are refused), and a failing 42 api becomes a 502, not an error page
export function apiRoute<P = object>(handle: (req: NextRequest, ctx: Context<P>) => Promise<Response>) {
  return async (req: NextRequest, ctx: Context<P>) => {
    if (!process.env.VERCEL && !LOCAL.test(req.headers.get('host') ?? '')) return fail(421, 'bad host');
    const site = req.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin' && site !== 'none') return fail(403, 'forbidden');
    if (!sessionOf(req)) return fail(401, 'login required');
    try {
      return await handle(req, ctx);
    } catch (e) {
      if (e instanceof Refused) return fail(e.status, e.message);
      console.error((e as Error).message);
      return fail(502, '42 api unavailable, try again');
    }
  };
}
