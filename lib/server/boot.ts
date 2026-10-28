import 'server-only';
import { FT_SECRET, FT_UID } from './config';

// runs once when the server starts (instrumentation.ts)
export function boot() {
  if (!FT_UID || !FT_SECRET) {
    console.error('missing FT_UID / FT_SECRET in .env');
    process.exit(1);
  }
}
