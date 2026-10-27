import 'server-only';
import path from 'node:path';

// read from .env, which next loads on its own
export const FT_UID = process.env.FT_UID ?? '';
export const FT_SECRET = process.env.FT_SECRET ?? '';
// must also be listed in "Redirect URI" of the app on profile.intra.42.fr
export const REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:${Number(process.env.PORT) || 3000}/auth/callback`;
export const REQUIRE_LOGIN = process.env.REQUIRE_LOGIN !== '0';

export const API = 'https://api.intra.42.fr';
export const CURSUS = 21; // 42cursus
export const FRESH_MS = 10 * 60 * 1000; // after this, serve cached data and refresh in background
export const CAMPUS_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_CAMPUS = 75;

// api data, photos and sessions survive restarts in here (CACHE_DIR can move it elsewhere)
export const CACHE_DIR = path.resolve(/* turbopackIgnore: true */ process.env.CACHE_DIR || '.cache');
