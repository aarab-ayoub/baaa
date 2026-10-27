import 'server-only';
import { once } from './once';

// a cold campus costs ~10-50 calls of our 1200/hour 42 quota; cap how many can be
// pulled per hour so nobody can drain the key by clicking through every campus
const PER_HOUR = { campuses: 15, lookups: 100 };

const logs = once('limits', () => ({ campuses: [] as number[], lookups: [] as number[] }));

export function allow(kind: keyof typeof PER_HOUR) {
  const log = logs[kind];
  const hourAgo = Date.now() - 3600_000;
  while (log.length && log[0] < hourAgo) log.shift();
  if (log.length >= PER_HOUR[kind]) return false;
  log.push(Date.now());
  return true;
}
