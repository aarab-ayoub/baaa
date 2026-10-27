import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { bearer } from './api42';
import { etagOf, sha, writeDisk } from './cache';
import { CACHE_DIR } from './config';
import { once } from './once';

// the cdn only serves student photos to logged-in intra users, so the browser
// can't load them directly. we fetch them here with the app token and serve them
// from /img/... — only urls that came out of the api are allowed (no open proxy).
const CDN = 'https://cdn.intra.42.fr';
const IMG = /^https:\/\/cdn\.intra\.42\.fr(\/users\/[0-9a-f]{32}\/[\w\-.]{1,80}\.(?:jpe?g|png|gif|webp))$/i;
const IMG_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const EXT_TYPE: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
const IMG_MAX_BYTES = 300 * 1024;
const IMG_CACHE_BYTES = 64 * 1024 * 1024;

export type Img = { type: string; body: Uint8Array<ArrayBuffer>; etag: string };

const s = once('images', () => ({
  known: new Set<string>(),
  memory: new Map<string, Img>(), // path -> photo, oldest first (LRU)
  bytes: 0,
  pending: new Map<string, Promise<Img>>(),
  active: 0,
  waiting: [] as (() => void)[],
}));

const imgFile = (p: string) => path.join(CACHE_DIR, 'img', sha(p).slice(0, 32));

// an api photo url -> our /img/... path for it (and from now on it may be served)
export function localImage(url?: string | null) {
  const m = url?.match(IMG);
  if (!m) return null;
  s.known.add(m[1]);
  return '/img' + m[1];
}

export const isKnownImage = (p: string) => s.known.has(p);

// photos named in data restored from disk may be served again
export function rememberImage(url?: string | null) {
  if (url?.startsWith('/img/')) s.known.add(url.slice(4));
}

async function fetchImage(p: string) {
  // at most 8 cdn downloads at a time
  if (s.active >= 8) await new Promise<void>((r) => s.waiting.push(r));
  s.active++;
  try {
    const res = await fetch(CDN + p, {
      headers: { Authorization: await bearer() },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (!res.ok || !IMG_TYPES.has(type)) throw new Error(`img ${res.status}`);
    const body = new Uint8Array(await res.arrayBuffer());
    if (body.length > IMG_MAX_BYTES) throw new Error('img too big');
    return { type, body };
  } finally {
    s.active--;
    s.waiting.shift()?.();
  }
}

// memory first, then disk, then the cdn (and keep what we downloaded)
async function loadImage(p: string) {
  try {
    const body = new Uint8Array(await fs.promises.readFile(imgFile(p)));
    return { type: EXT_TYPE[p.split('.').pop()!.toLowerCase()], body };
  } catch {
    const img = await fetchImage(p);
    writeDisk(imgFile(p), img.body);
    return img;
  }
}

export async function image(p: string): Promise<Img> {
  const hit = s.memory.get(p);
  if (hit) {
    s.memory.delete(p);
    s.memory.set(p, hit);
    return hit;
  }
  if (!s.pending.has(p)) {
    s.pending.set(
      p,
      loadImage(p)
        .then(({ type, body }) => {
          const img = { type, body, etag: etagOf(body) };
          s.memory.set(p, img);
          s.bytes += body.length;
          for (const [k, v] of s.memory) {
            if (s.bytes <= IMG_CACHE_BYTES) break;
            s.memory.delete(k);
            s.bytes -= v.body.length;
          }
          return img;
        })
        .finally(() => s.pending.delete(p))
    );
  }
  return s.pending.get(p)!;
}
