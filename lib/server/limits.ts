import 'server-only';
import { once } from './once';

// a cold campus costs ~10-50 calls of our 1200/hour 42 quota; cap how many can be
// pulled per hour so nobody can drain the key by clicking through every campus.
// fetching the same one again within the hour (to refresh it) is free
const PER_HOUR = { campuses: 15, lookups: 100 };

const logs = once('limits', () => ({ campuses: new Map<string, number>(), lookups: new Map<string, number>() }));

export function allow(kind: keyof typeof PER_HOUR, key: string) {
  const log = logs[kind];
  const hourAgo = Date.now() - 3600_000;
  for (const [k, at] of log) {
    if (at >= hourAgo) break; // oldest first
    log.delete(k);
  }
  if (log.has(key)) return true;
  if (log.size >= PER_HOUR[kind]) return false;
  log.set(key, Date.now());
  return true;
}
