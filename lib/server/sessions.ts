import 'server-only';
import crypto from 'node:crypto';
import type { Me } from '@/lib/types';
import { FT_SECRET } from './config';

// --- login with 42: a session per browser, a week long -----------------------
// the student's own 42 token is used once to read /v2/me and then dropped. the session
// lives in the cookie itself, signed with the app secret so nobody can make one up or
// change theirs: the server keeps nothing about who's logged in
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export type Session = { user: Me; exp: number };

const sign = (data: string) => crypto.createHmac('sha256', FT_SECRET).update(`session:${data}`).digest('base64url');

// a new session for this student: the cookie value that holds it
export function startSession(user: Me) {
  const session: Session = { user, exp: Date.now() + SESSION_MS };
  const data = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${data}.${sign(data)}`;
}

export function getSession(sid?: string): Session | null {
  if (!sid || sid.length > 4000) return null;
  const [data, mac] = sid.split('.');
  if (!data || !mac) return null;
  const given = Buffer.from(mac);
  const expected = Buffer.from(sign(data));
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as Session;
    return session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}
