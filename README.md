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
- Browsers keep nothing: every answer is `no-store`, the session is a single signed cookie, and logging out removes it. The table/cards choice is the only thing saved in the browser.
- The server writes nothing to disk. API data sits in memory and in Vercel's runtime cache (shared by the app's servers, kept across deploys; on your machine it's memory too) and is fetched again every 10 minutes, the transfers every hour. Photos pass through and stay in memory for a while.
- A campus nobody opened recently comes in best students first: 42 sorts them by level, so the top of the list shows after one call (a few seconds) while the rest streams in. The 42 API allows 2 calls a second.

## RNCP

The RNCP page checks your own record against RNCP 6 (IT solutions designer and developer: option 1 web and mobile, option 2 applicative) and RNCP 7 (IT architecture expert: option 1 information systems and networks, option 2 database architecture and data), and lets you plan projects with the mark you expect.

The rules and project lists are 42's own, from [gcc.42.fr](https://gcc.42.fr) (the Grand Cursus Checker): its rules and each option compiled, read on 29 October 2026, in `lib/rncp-official.json`. They're the same as gcc's: level, events (of the kinds gcc counts), 1 Suite project, 2 work experiences, 2 group projects outside the common core, and per category so many projects and so much XP. Projects 42cursus no longer lists, which gcc still counts for those who did them, are in `lib/server/legacy-projects.json` (`node --env-file=.env scripts/legacy-projects.mjs`). Project names and XP come live from the 42 API; a project's XP counts as its XP times your mark (42's awarded XP isn't open to apps like this one). The piscine module grouping is from [42calculator](https://github.com/lucas-ht/42calculator).

To refresh the rules after 42 changes them: log in on gcc.42.fr, compile the four options, and rebuild `lib/rncp-official.json` from the answers.

## Credits

- Country flags on Windows (which has no flag emojis): the "Twemoji Country Flags" font from [country-flag-emoji-polyfill](https://github.com/talkjs/country-flag-emoji-polyfill) (MIT); the flag art is [Twemoji](https://github.com/twitter/twemoji) by Twitter, licensed [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Where things are

- `app/`: the pages (`/`, `/transfers`, `/calculator`) and routes (`/api/*`, `/auth/*`, `/img/*`)
- `components/`: the three views, and the shared pieces in `components/ui/` (table, cards, filter select, search box, pager, avatar)
- `lib/server/`: the 42 API client (2 calls/s), the cache, the signed sessions, the photo proxy, and the data behind each page
- `proxy.ts`: the host check and content security policy on every request
