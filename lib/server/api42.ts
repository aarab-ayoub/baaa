import 'server-only';
import { AsyncLocalStorage } from 'node:async_hooks';
import { API, FT_SECRET, FT_UID } from './config';
import { once } from './once';

// --- auth (client_credentials) -------------------------------------------
const auth = once('auth', () => ({ token: '', exp: 0, pending: null as Promise<string> | null }));

function getToken(force = false): string | Promise<string> {
  if (!force && auth.token && Date.now() < auth.exp - 60_000) return auth.token;
  auth.pending ??= fetchToken().finally(() => (auth.pending = null));
  return auth.pending;
}

async function fetchToken() {
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: FT_UID, client_secret: FT_SECRET }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`auth failed: ${res.status}`);
  const data = await res.json();
  auth.token = data.access_token;
  auth.exp = Date.now() + data.expires_in * 1000;
  console.log('got new token, expires in', data.expires_in, 's');
  return auth.token;
}

export const bearer = async () => `Bearer ${await getToken()}`;

// --- rate-limited GET (app limit is 2 req/s) -----------------------------
// work nobody is waiting on (warmups, refreshing old data) runs inside later() and
// only gets a turn when no call for someone looking at the page is queued
const background = once('background', () => new AsyncLocalStorage<boolean>());
export const later = <T>(fn: () => T): T => background.run(true, fn);

const lane = once('lane', () => ({ last: 0, busy: false, queue: [] as (() => void)[], idle: [] as (() => void)[] }));

function throttle() {
  return new Promise<void>((resolve) => {
    (background.getStore() ? lane.idle : lane.queue).push(resolve);
    if (!lane.busy) drain();
  });
}

async function drain() {
  lane.busy = true;
  while (lane.queue.length || lane.idle.length) {
    const wait = lane.last + 550 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lane.last = Date.now();
    (lane.queue.shift() ?? lane.idle.shift())?.();
  }
  lane.busy = false;
}

export async function get<T>(url: string, tries = 0): Promise<{ data: T; total: number }> {
  await throttle();
  let res: Response;
  try {
    res = await fetch(API + url, { headers: { Authorization: await bearer() }, cache: 'no-store' });
  } catch (e) {
    // a dropped connection now and then shouldn't sink a job of a hundred calls
    if (tries >= 3) throw e;
    await new Promise((r) => setTimeout(r, 1000));
    return get(url, tries + 1);
  }
  if (res.status === 401 && tries < 1) {
    await getToken(true);
    return get(url, tries + 1);
  }
  if (res.status === 429 && tries < 5) {
    await new Promise((r) => setTimeout(r, 1500));
    return get(url, tries + 1);
  }
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return { data: await res.json(), total: Number(res.headers.get('x-total') || 0) };
}

export async function getAll<T>(url: string): Promise<T[]> {
  const sep = url.includes('?') ? '&' : '?';
  const page = (n: number) => get<T[]>(`${url}${sep}per_page=100&page=${n}`);
  const first = await page(1);
  const pages = Math.ceil(first.total / 100);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => page(i + 2)));
  return first.data.concat(...rest.map((r) => r.data));
}
