import 'server-only';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { later } from './api42';
import { CACHE_DIR, FRESH_MS } from './config';
import { once } from './once';

export const sha = (x: string) => crypto.createHash('sha256').update(x).digest('hex');
export const etagOf = (body: string | Uint8Array) => '"' + crypto.createHash('sha1').update(body).digest('base64url').slice(0, 16) + '"';

// --- disk: so a restart is instant, costs no api calls, and doesn't log anyone out
// write to a temp file then rename, so a crash never leaves half a file
export function writeDisk(file: string, body: string | Uint8Array) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.promises
    .writeFile(tmp, body, { mode: 0o600 })
    .then(() => fs.promises.rename(tmp, file))
    .catch((e) => console.error('disk:', e.message));
}

// --- cache: stale-while-revalidate, keeps ready-to-send (and gzipped) JSON ---
export type Entry<T> = { at: number; value: T; body: string; gz: Uint8Array<ArrayBuffer>; etag: string };

export function pack<T>(value: T, at = Date.now()): Entry<T> {
  const body = JSON.stringify(value);
  return { at, value, body, gz: new Uint8Array(zlib.gzipSync(body, { level: 9 })), etag: etagOf(body) };
}

const cache = once('cache', () => new Map<string, Entry<unknown>>());
const pending = once('pending', () => new Map<string, Promise<Entry<unknown>>>());

function refresh<T>(key: string, fn: () => Promise<T>): Promise<Entry<T>> {
  if (!pending.has(key)) {
    const p = fn()
      .then((value) => {
        const entry = pack(value);
        cache.set(key, entry);
        writeDisk(path.join(CACHE_DIR, `data-${sha(key).slice(0, 24)}.json`), JSON.stringify({ key, at: entry.at, value }));
        return entry;
      })
      .finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return pending.get(key) as Promise<Entry<T>>;
}

export async function cached<T>(key: string, fn: () => Promise<T>, maxAge = FRESH_MS): Promise<Entry<T>> {
  const hit = cache.get(key) as Entry<T> | undefined;
  if (!hit) return refresh(key, fn);
  if (Date.now() - hit.at > maxAge) later(() => refresh(key, fn)).catch((e) => console.error(e.message));
  return hit;
}

// already there, or on its way
export const isCached = (key: string) => cache.has(key) || pending.has(key);

// put everything the last run saved back in memory, and hand back the values
export function restoreCache() {
  const values: unknown[] = [];
  for (const f of fs.readdirSync(CACHE_DIR)) {
    if (!/^data-[0-9a-f]+\.json$/.test(f)) continue;
    try {
      const { key, at, value } = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'));
      cache.set(key, pack(value, at));
      values.push(value);
    } catch {
      fs.rmSync(path.join(CACHE_DIR, f), { force: true });
    }
  }
  return values;
}
