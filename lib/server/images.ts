import 'server-only';
import { bearer } from './api42';
import { once } from './once';

// the cdn only serves student photos to logged-in intra users, so the browser
// can't load them directly. we fetch them here with the app token and pass them on
// from /img/... — only photos of the 42 cdn (no open proxy), only to logged-in
// students, and kept in memory for a while only: no photo is written to disk
const CDN = 'https://cdn.intra.42.fr';
const IMG = /^https:\/\/cdn\.intra\.42\.fr(\/users\/[0-9a-f]{32}\/[\w\-.]{1,80}\.(?:jpe?g|png|gif|webp))$/i;
const IMG_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const IMG_MAX_BYTES = 300 * 1024;
const IMG_CACHE_BYTES = 64 * 1024 * 1024;

export type Img = { type: string; body: Uint8Array<ArrayBuffer> };

const s = once('images', () => ({
  memory: new Map<string, Img>(), // path -> photo, oldest first (LRU)
  bytes: 0,
  pending: new Map<string, Promise<Img>>(),
  active: 0,
  waiting: [] as (() => void)[],
}));

// an api photo url -> our /img/... path for it
export function localImage(url?: string | null) {
  const m = url?.match(IMG);
  return m ? '/img' + m[1] : null;
}

// a path /img/... may ask for: a student photo on the 42 cdn, nothing else
export const isPhotoPath = (p: string) => IMG.test(CDN + p);

async function fetchImage(p: string): Promise<Img> {
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

// memory first, then the cdn
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
      fetchImage(p)
        .then((img) => {
          s.memory.set(p, img);
          s.bytes += img.body.length;
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
