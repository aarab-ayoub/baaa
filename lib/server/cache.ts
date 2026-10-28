import 'server-only';
import { getCache } from '@vercel/functions';
import { after } from 'next/server';
import { later } from './api42';
import { FRESH_MS } from './config';
import { once } from './once';

// --- cache: in this server's memory, then vercel's runtime cache -----------------
// the runtime cache is shared by every instance of the app and kept across deploys (keys
// are ours, not built from the code). on your machine it's memory as well. nothing goes to
// a disk of ours. data older than maxAge is served once more while it's fetched again in
// the background, and a key is fetched once at a time however many people ask
export type Entry<T> = { at: number; value: T };

const KEEP_S = 7 * 24 * 60 * 60; // how long a shared copy may live, fresh or not
const shared = getCache({ namespace: 'peerboard-1' });
const memory = once('memory', () => new Map<string, Entry<unknown>>());
const pending = once('pending', () => new Map<string, Promise<Entry<unknown>>>());

// fetch a key now and keep what comes back
export function keep<T>(key: string, fn: () => Promise<T>): Promise<Entry<T>> {
  if (!pending.has(key)) {
    const p = fn()
      .then(async (value) => {
        const entry = { at: Date.now(), value };
        memory.set(key, entry);
        await shared.set(key, entry, { ttl: KEEP_S }).catch((e: Error) => console.error('cache:', e.message));
        return entry;
      })
      .finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return pending.get(key) as Promise<Entry<T>>;
}

// what's at hand for a key, fetching nothing: this server's copy, or the shared one when
// that's newer
export async function peek<T>(key: string, maxAge = FRESH_MS): Promise<Entry<T> | null> {
  const mine = memory.get(key) as Entry<T> | undefined;
  if (mine && Date.now() - mine.at <= maxAge) return mine;
  const theirs = (await shared.get(key).catch(() => null)) as Entry<T> | null;
  if (theirs && (!mine || theirs.at > mine.at)) {
    memory.set(key, theirs);
    return theirs;
  }
  return mine ?? null;
}

// fetch a key in the background, after the response, behind what people are waiting for
export function warm<T>(key: string, fn: () => Promise<T>) {
  if (pending.has(key)) return;
  const p = later(() => keep(key, fn));
  after(() => p.then(() => {}, (e: Error) => console.error('refresh:', e.message)));
}

export async function cached<T>(key: string, fn: () => Promise<T>, maxAge = FRESH_MS): Promise<T> {
  const hit = await peek<T>(key, maxAge);
  if (!hit) return (await keep(key, fn)).value;
  if (Date.now() - hit.at > maxAge) warm(key, fn);
  return hit.value;
}
