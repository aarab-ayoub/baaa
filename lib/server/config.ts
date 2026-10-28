import 'server-only';

// read from .env, which next loads on its own (on vercel: the project's environment variables)
export const FT_UID = process.env.FT_UID ?? '';
export const FT_SECRET = process.env.FT_SECRET ?? '';
// must also be listed in "Redirect URI" of the app on profile.intra.42.fr. on vercel it
// defaults to the production domain, on your machine to localhost
const ORIGIN = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : `http://localhost:${Number(process.env.PORT) || 3000}`;
export const REDIRECT_URI = process.env.REDIRECT_URI || `${ORIGIN}/auth/callback`;
// once the app is served over https, its cookies only travel over https
export const SECURE = REDIRECT_URI.startsWith('https:');

export const API = 'https://api.intra.42.fr';
export const CURSUS = 21; // 42cursus
export const FRESH_MS = 10 * 60 * 1000; // after this, cached data is served once more while it's fetched again
export const CAMPUS_MS = 24 * 60 * 60 * 1000;
