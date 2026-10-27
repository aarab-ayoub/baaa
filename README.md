# 42 rank

Campus rankings, transfers between campuses and a level calculator for 42 students, from the 42 API.

## Run

1. Create an app on profile.intra.42.fr with the redirect URI `http://localhost:3000/auth/callback`, and put its keys in `.env`:

   ```
   FT_UID=...
   FT_SECRET=...
   REDIRECT_URI=http://localhost:3000/auth/callback
   REQUIRE_LOGIN=1
   ```

2. `npm install`, `npm run build`, then `npm start` (or `npm run dev` while working on it).

The app answers on http://localhost:3000. API data, photos and sessions are kept in `.cache/`, so a restart is instant and keeps everyone logged in.

## Where things are

- `app/`: the pages (`/`, `/transfers`, `/calculator`) and routes (`/api/*`, `/auth/*`, `/img/*`)
- `components/`: the three views, and the shared pieces in `components/ui/` (table, filter select, search box, pager, avatar)
- `lib/server/`: the 42 API client (2 calls/s), the cache, sessions, the photo proxy, and the data behind each page
- `proxy.ts`: the host check and content security policy on every request
