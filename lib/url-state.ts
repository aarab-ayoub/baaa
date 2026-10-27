// each view keeps its filters in the query string, so any view can be shared:
//   ranking     /?c=75&s=absorbed&y=2024&k=506&p=2
//   transfers   /transfers?c=21&f=21&t=FR&m=moving&y=2023
//   calculator  /calculator?l=7.42

type Query = { get(name: string): string | null };

export type RankState = { campus: string; status: 'active' | 'absorbed'; promo: string; coal: number; page: number };
export type MovesState = { campus: string; from: string; to: string; move: '' | 'moving' | 'arrived'; promo: string; page: number };

const campusOf = (v: string | null) => (v && /^\d{1,5}$/.test(v) ? v : '');
// origin / destination: one campus id, or a whole country by its code
const placeOf = (v: string | null) => (v && /^(\d{1,5}|[A-Z]{2})$/.test(v) ? v : '');
const promoOf = (v: string | null) => (v && /^\d{4}$/.test(v) ? v : '');
const pageOf = (v: string | null) => Math.min(999, Math.max(1, parseInt(v ?? '', 10) || 1));

export function rankState(q: Query, defaultCampus: string): RankState {
  const k = q.get('k');
  return {
    campus: campusOf(q.get('c')) || defaultCampus,
    status: q.get('s') === 'absorbed' ? 'absorbed' : 'active',
    promo: promoOf(q.get('y')),
    coal: k && /^\d{1,6}$/.test(k) ? Number(k) : 0,
    page: pageOf(q.get('p')),
  };
}

export function rankHref(s: RankState) {
  const q = new URLSearchParams({ c: s.campus });
  if (s.status === 'absorbed') q.set('s', 'absorbed');
  if (s.promo) q.set('y', s.promo);
  if (s.coal) q.set('k', String(s.coal));
  if (s.page > 1) q.set('p', String(s.page));
  return '/?' + q;
}

export function movesState(q: Query, defaultCampus: string): MovesState {
  const m = q.get('m');
  return {
    campus: campusOf(q.get('c')) || defaultCampus,
    from: placeOf(q.get('f')),
    to: placeOf(q.get('t')),
    move: m === 'moving' || m === 'arrived' ? m : '',
    promo: promoOf(q.get('y')),
    page: pageOf(q.get('p')),
  };
}

export function movesHref(s: MovesState) {
  const q = new URLSearchParams({ c: s.campus });
  if (s.from) q.set('f', s.from);
  if (s.to) q.set('t', s.to);
  if (s.move) q.set('m', s.move);
  if (s.promo) q.set('y', s.promo);
  if (s.page > 1) q.set('p', String(s.page));
  return '/transfers?' + q;
}

export const calcHref = (level: number) => '/calculator?l=' + level;

// links from before next.js kept the same state after a #: #c=75&y=2024, #transfers&c=21, #calc&l=7.42
export function legacyHref(hash: string) {
  const q = new URLSearchParams(hash.slice(1));
  if (q.has('login-failed')) return '/?login=failed';
  const view = q.has('calc') ? '/calculator' : q.has('transfers') ? '/transfers' : '/';
  q.delete('calc');
  q.delete('transfers');
  if (q.size) return `${view}?${q}`;
  return view === '/' ? null : view;
}
