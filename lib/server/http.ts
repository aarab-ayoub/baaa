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

// an api route: student data is only for logged-in 42 students, and a failing
// 42 api becomes a 502 instead of an error page
export function apiRoute<P = object>(handle: (req: NextRequest, ctx: Context<P>) => Promise<Response>) {
  return async (req: NextRequest, ctx: Context<P>) => {
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
