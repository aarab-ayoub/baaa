import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { later } from './api42';
import { restoreCache } from './cache';
import { CACHE_DIR, DEFAULT_CAMPUS, FT_SECRET, FT_UID } from './config';
import { rememberImage } from './images';
import { projects } from './projects';
import { ranking } from './ranking';
import { restoreSessions } from './sessions';
import { allMoves } from './transfers';

// runs once when the server starts (instrumentation.ts)
export function boot() {
  if (!FT_UID || !FT_SECRET) {
    console.error('missing FT_UID / FT_SECRET in .env');
    process.exit(1);
  }
  fs.mkdirSync(path.join(CACHE_DIR, 'img'), { recursive: true, mode: 0o700 });
  fs.chmodSync(CACHE_DIR, 0o700);

  // api data, photos and sessions from the last run: instant, no api calls, nobody logged out
  const values = restoreCache() as { students?: { img: string | null }[] }[];
  for (const v of values) for (const u of v?.students || []) rememberImage(u.img);
  const sessions = restoreSessions();
  for (const { user } of sessions) rememberImage(user.img);
  console.log(`restored ${values.length} cached responses, ${sessions.length} sessions`);

  // nobody is waiting on these yet, so they only use the api when it's free
  later(() => {
    ranking(DEFAULT_CAMPUS).catch((e) => console.error('warmup:', e.message));
    allMoves().catch((e) => console.error('warmup:', e.message));
    projects().catch((e) => console.error('warmup:', e.message));
  });
}
