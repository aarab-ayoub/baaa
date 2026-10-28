import 'server-only';
import { unstable_cache } from 'next/cache';
import { FRESH_MS } from './config';
import { once } from './once';

// --- cache: next's data cache ------------------------------------------------
// on vercel it's shared by every instance and kept across deploys; on your machine it
// lives in memory only (isrFlushToDisk in next.config.ts). either way nothing goes to a
// disk of ours. data older than maxAge is served once more while it's fetched again
const pending = once('pending', () => new Map<string, Promise<unknown>>());

export function cached<T>(key: string, fn: () => Promise<T>, maxAge = FRESH_MS): Promise<T> {
  // one trip per key at a time, however many people ask at once
  if (!pending.has(key)) {
    const p = unstable_cache(fn, [key], { revalidate: maxAge / 1000 })().finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return pending.get(key) as Promise<T>;
}
