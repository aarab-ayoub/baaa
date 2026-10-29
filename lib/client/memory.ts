import type { Coalition, RankedStudent } from '@/lib/types';
import type { MovesState, RankState } from '@/lib/url-state';

// what the views need from each other, or from before they were last opened: they
// come and go with navigation, this stays for as long as the page is open
export const memory = {
  // switching view keeps the campus on screen; a view gets its own filters back only for that campus
  shownCampus: null as string | null,
  lastRank: null as RankState | null,
  lastMoves: null as MovesState | null,
  // the campus ranking loaded last: the calculator takes levels and the coalition bonus from it
  ranking: null as { students: RankedStudent[]; order: Coalition[] } | null,
  // landed on the bare ranking url: open your own promo with your row highlighted
  firstVisit: typeof window !== 'undefined' && location.pathname === '/' && !location.search && !location.hash,
  landing: null as string | null, // a ranking we're on our way to: wait for it before looking
  seekMe: false, // "My rank" asked: find your row
  level: null as number | null, // the calculator's current level
  rncpTrack: null as string | null, // the RNCP track looked at last
  rankQuery: '',
  movesQuery: '',
  onUnauthorized: () => {},
};
