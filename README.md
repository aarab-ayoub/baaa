# Peerboard

Campus rankings, transfers between campuses, a level calculator and an RNCP checker for 42 students, from the 42 API.

## Run it on your machine

1. Create an app on profile.intra.42.fr with the redirect URI `http://localhost:3000/auth/callback`, and put its keys in `.env`:

   ```
   FT_UID=...
   FT_SECRET=...
   ```

2. `npm install`, `npm run build`, then `npm start` (or `npm run dev` while working on it).

The app answers on http://localhost:3000, to this computer only.

## Deploy on Vercel (free plan)

1. Import the repository on vercel.com. It recognizes Next.js on its own; leave Fluid compute on (the default).
2. In the project's environment variables, add `FT_UID` and `FT_SECRET`. The login comes back to `https://<project>.vercel.app/auth/callback`; set `REDIRECT_URI` only if you use a domain of your own.
3. Add that same URL to the redirect URIs of the app on profile.intra.42.fr.

Functions run in Paris (`vercel.json`), the Vercel region closest to Morocco.

## Student data

- Nobody sees anything before logging in with 42: every page shows the login screen, and `/api/*` and `/img/*` answer 401. Only 42 students and staff can log in, not partner (external) accounts.
- The RNCP page shows your own record only: the login comes from your session, never from the URL.
- Browsers keep nothing: every answer is `no-store`, the session is a single signed cookie, and logging out also clears the browser's cache. The table/cards choice is the only thing saved in the browser.
- The server writes nothing to disk. API data sits in Next's data cache (in memory on your machine, Vercel's data cache once deployed) and is fetched again every 10 minutes, the transfers every hour. Photos pass through and stay in memory for a while.
- So a campus nobody opened recently takes ~20s the first time: the 42 API allows 2 calls a second.

## RNCP

The RNCP page checks your own record against RNCP 6 (IT solutions designer and developer: web and mobile, or applicative) and RNCP 7 (IT architecture expert: information systems and networks, or database architecture and data), and lets you plan projects with the mark you expect. The requirements are 42's, from the "RNCP 6 certificate" and "RNCP 7 certificate" articles on meta.intra.42.fr, as checked on 26 October 2026 by [42calculator](https://github.com/lucas-ht/42calculator) and [42insight](https://github.com/fzphr/42insight); they live in `lib/rncp.ts`. Project names, XP and which projects are group ones come live from the 42 API.

## Where things are

- `app/`: the pages (`/`, `/transfers`, `/calculator`) and routes (`/api/*`, `/auth/*`, `/img/*`)
- `components/`: the three views, and the shared pieces in `components/ui/` (table, cards, filter select, search box, pager, avatar)
- `lib/server/`: the 42 API client (2 calls/s), the cache, the signed sessions, the photo proxy, and the data behind each page
- `proxy.ts`: the host check and content security policy on every request
