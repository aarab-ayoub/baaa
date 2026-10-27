import 'server-only';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Me } from '@/lib/types';
import { sha, writeDisk } from './cache';
import { CACHE_DIR } from './config';
import { once } from './once';

// --- login with 42: a session per browser, a week long -----------------------
// the student's own 42 token is used once to read /v2/me and then dropped.
// sessions are keyed by a hash of the cookie, so the file on disk holds no usable ids
export const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 5000;
const SESSIONS_FILE = path.join(CACHE_DIR, 'sessions.json');

export type Session = { user: Me; exp: number };

const s = once('sessions', () => ({ all: new Map<string, Session>(), timer: undefined as NodeJS.Timeout | undefined }));

function save() {
  clearTimeout(s.timer);
  s.timer = setTimeout(() => {
    const now = Date.now();
    for (const [k, v] of s.all) if (v.exp < now) s.all.delete(k);
    writeDisk(SESSIONS_FILE, JSON.stringify([...s.all]));
  }, 1000);
}

export function getSession(sid?: string): Session | null {
  if (!sid || !/^[\w-]{43}$/.test(sid)) return null;
  const session = s.all.get(sha(sid));
  if (!session) return null;
  if (session.exp < Date.now()) {
    s.all.delete(sha(sid));
    save();
    return null;
  }
  return session;
}

// a new session for this student, and the cookie value that opens it
export function startSession(user: Me) {
  // drop the oldest one rather than grow forever
  if (s.all.size >= MAX_SESSIONS) s.all.delete(s.all.keys().next().value!);
  const sid = crypto.randomBytes(32).toString('base64url');
  s.all.set(sha(sid), { user, exp: Date.now() + SESSION_MS });
  save();
  return sid;
}

export function endSession(sid?: string) {
  if (!sid) return;
  s.all.delete(sha(sid));
  save();
}

export function restoreSessions() {
  try {
    const now = Date.now();
    for (const [k, v] of JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')) as [string, Session][]) {
      if (v.exp > now && /^[0-9a-f]{64}$/.test(k)) s.all.set(k, v);
    }
  } catch {}
  return [...s.all.values()];
}
