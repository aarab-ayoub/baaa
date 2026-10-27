'use strict';

// everything is built with DOM calls, never html strings, so api data can't inject markup
// (the server also enforces this with a trusted-types CSP)

const PER_PAGE = 100;
const FRESH_MS = 10 * 60 * 1000;
const $ = (id) => document.getElementById(id);

let data = null;
let loadedCampus = null;
let highlight = null;
let scrollPending = false;
let me = null; // the logged-in student
let defaultCampus = '75';
const campusData = new Map(); // campus id -> { data, at }, so switching back is instant
let campusById = new Map(); // id -> { id, name, country }, in the api's country order

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'color') el.style.backgroundColor = v; // cssom, allowed by the csp
      else el[k] = v;
    }
  }
  for (const kid of kids) if (kid != null && kid !== false) el.append(kid);
  return el;
}

// state lives in the hash so any view can be shared:
//   ranking     #c=75&s=absorbed&y=2024&k=506&p=2
//   transfers   #transfers&c=21&f=21&t=FR&m=moving&y=2023
//   calculator  #calc&l=7.42
function state() {
  const q = new URLSearchParams(location.hash.slice(1));
  // origin / destination: one campus id, or a whole country by its code
  const place = (k) => (/^(\d{1,5}|[A-Z]{2})$/.test(q.get(k)) ? q.get(k) : '');
  return {
    calc: q.has('calc'),
    transfers: q.has('transfers'),
    level: q.get('l'),
    campus: /^\d{1,5}$/.test(q.get('c')) ? q.get('c') : defaultCampus,
    status: q.get('s') === 'absorbed' ? 'absorbed' : 'active',
    from: place('f'),
    to: place('t'),
    move: ['moving', 'arrived'].includes(q.get('m')) ? q.get('m') : '',
    promo: /^\d{4}$/.test(q.get('y')) ? q.get('y') : '',
    coal: /^\d{1,6}$/.test(q.get('k')) ? Number(q.get('k')) : 0,
    page: Math.min(999, Math.max(1, parseInt(q.get('p'), 10) || 1)),
  };
}

let lastRank = {};
let lastMoves = {};
let shownCampus = null; // the ranking and the transfers always open on the same campus

function link(over) {
  const s = { ...state(), ...lastRank, ...over };
  const q = new URLSearchParams({ c: s.campus });
  if (s.status === 'absorbed') q.set('s', 'absorbed');
  if (s.promo) q.set('y', s.promo);
  if (s.coal) q.set('k', s.coal);
  if (s.page > 1) q.set('p', s.page);
  return '#' + q;
}

function go(over) {
  location.hash = link(over);
}

function movesLink(over) {
  const s = { ...state(), ...lastMoves, ...over };
  const q = new URLSearchParams({ c: s.campus });
  if (s.from) q.set('f', s.from);
  if (s.to) q.set('t', s.to);
  if (s.move) q.set('m', s.move);
  if (s.promo) q.set('y', s.promo);
  if (s.page > 1) q.set('p', s.page);
  return '#transfers&' + q;
}

function goMoves(over) {
  location.hash = movesLink(over);
}

// switching view keeps the campus on screen; a view gets its own filters back only for that campus
function keepCampus(last, reset) {
  const campus = shownCampus || state().campus;
  return last.campus === campus ? {} : { ...reset, campus, page: 1 };
}

async function api(path) {
  const r = await fetch(path, { credentials: 'same-origin', cache: 'no-cache' });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) showLogin('Your session ended, sign in again.');
  if (!r.ok) throw new Error(j.error || 'request failed (' + r.status + ')');
  return j;
}

function msg(text) {
  $('msg').textContent = text;
}

const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function showLogin(text) {
  for (const v of ['view-rank', 'view-transfers', 'view-calc', 'nav']) $(v).hidden = true;
  $('view-login').hidden = false;
  $('login-msg').textContent = text || '';
}

function firstName(u) {
  return (u.name || '').trim().split(/\s+/)[0] || u.login;
}

function showMe() {
  const out = h('button', { type: 'button', class: 'link' }, 'log out');
  out.onclick = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    location.replace('/');
  };
  $('me').replaceChildren(avatar(me), h('span', { class: 'hide-sm' }, me.login), out);
}

async function init() {
  const auth = await api('/api/me');
  me = auth.user;
  if (auth.required && !me) {
    return showLogin(location.hash === '#login-failed' ? "That didn't work, try again." : '');
  }
  if (location.hash === '#login-failed') history.replaceState(null, '', '/');
  $('nav').hidden = false;
  if (me) {
    showMe();
    if (me.campus) defaultCampus = String(me.campus);
    if (me.level != null) setCur(me.level);
    // first visit: open your own promo with your row highlighted
    if (!location.hash) {
      history.replaceState(null, '', link({ campus: defaultCampus, promo: me.promo || '', coal: 0, status: 'active', page: 1 }));
      highlight = me.login;
      scrollPending = true;
    }
  }

  $('find').onsubmit = (e) => {
    e.preventDefault();
    find($('q').value.trim().toLowerCase());
  };
  $('nav-rank').onclick = (e) => {
    e.preventDefault();
    go(keepCampus(lastRank, { status: 'active', promo: '', coal: 0 }));
  };
  $('nav-transfers').onclick = (e) => {
    e.preventDefault();
    goMoves(keepCampus(lastMoves, { from: '', to: '', move: '', promo: '' }));
  };
  initCalc();
  addEventListener('hashchange', route);

  const list = await api('/api/campuses');
  campusById = new Map(list.map((c) => [c.id, c]));
  for (const sel of [$('campus'), $('tr-campus')]) {
    let group = null;
    for (const c of list) {
      if (!group || group.label !== c.country) sel.append((group = h('optgroup', { label: c.country })));
      group.append(new Option(c.name, c.id));
    }
  }
  $('campus').onchange = (e) => go({ campus: e.target.value, promo: '', coal: 0, status: 'active', page: 1 });
  $('promo').onchange = (e) => go({ promo: e.target.value, page: 1 });
  $('coal').onchange = (e) => go({ coal: Number(e.target.value) || 0, page: 1 });
  $('status').onchange = (e) => go({ status: e.target.value, page: 1 });

  $('tr-campus').onchange = (e) => goMoves({ campus: e.target.value, from: '', to: '', move: '', promo: '', page: 1 });
  $('tr-from').onchange = (e) => goMoves({ from: e.target.value, page: 1 });
  $('tr-to').onchange = (e) => goMoves({ to: e.target.value, page: 1 });
  $('tr-status').onchange = (e) => goMoves({ move: e.target.value, page: 1 });
  $('tr-promo').onchange = (e) => goMoves({ promo: e.target.value, page: 1 });
  // the search narrows the list as you type
  $('tr-find').onsubmit = (e) => e.preventDefault();
  $('tr-q').oninput = () => (state().page > 1 ? goMoves({ page: 1 }) : renderMoves());
  route();
}

// the coalition bonus only applies while your coalition is 1st on the campus
function leads(u) {
  if (!data || !u?.coal) return false;
  return data.order[0]?.id === u.coal;
}

async function loadCampus(id) {
  const hit = campusData.get(id);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.data;
  const d = await api('/api/ranking/' + id);
  d.coal = new Map(d.coalitions.map((c) => [c.id, c]));
  d.order = [...d.coalitions].sort((a, b) => b.score - a.score);
  d.promos = [...new Set(d.students.map((u) => u.promo).filter(Boolean))].sort().reverse();
  d.memo = new Map();
  campusData.set(id, { data: d, at: Date.now() });
  return d;
}

async function route() {
  const s = state();
  const view = s.calc ? 'calc' : s.transfers ? 'transfers' : 'rank';
  for (const v of ['rank', 'transfers', 'calc']) {
    $('view-' + v).hidden = v !== view;
    $('nav-' + v).classList.toggle('on', v === view);
  }
  if (s.calc) return showCalc(s);
  shownCampus = s.campus;
  if (s.transfers) return showTransfers(s);

  lastRank = { campus: s.campus, status: s.status, promo: s.promo, coal: s.coal, page: s.page };
  $('campus').value = s.campus;
  if (s.campus !== loadedCampus || !data) {
    loadedCampus = s.campus;
    data = null;
    if (!campusData.has(s.campus)) {
      $('tbl').hidden = true;
      $('pages').replaceChildren();
      $('fetched').textContent = '';
      msg('Loading… the first time a campus opens it can take ~20s.');
    }
    try {
      const d = await loadCampus(s.campus);
      if (loadedCampus !== s.campus) return;
      data = d;
    } catch (e) {
      msg('Something went wrong: ' + e.message);
      return;
    }
    if (me && highlight === me.login && scrollPending) {
      const i = rows(s).findIndex((r) => r.u.login === me.login);
      if (i >= PER_PAGE && s.page === 1) return go({ page: Math.floor(i / PER_PAGE) + 1 });
    }
    $('fetched').textContent = 'updated ' + clock(data.fetchedAt);
  }
  render();
}

// --- ranking ----------------------------------------------------------------

// filtered + ranked list, memoized per filter combo (switching back and forth is free)
function rows(s = state()) {
  const key = `${s.promo}|${s.coal}|${s.status}`;
  let out = data.memo.get(key);
  if (!out) {
    out = [];
    let rank = 0;
    for (const u of data.students) {
      if (s.promo && u.promo !== s.promo) continue;
      if (s.coal && u.coal !== s.coal) continue;
      if ((s.status === 'absorbed') !== !!u.bh) continue;
      // students arrive sorted by level; equal level = equal rank
      if (!out.length || u.level !== out[out.length - 1].u.level) rank = out.length + 1;
      out.push({ u, rank });
    }
    data.memo.set(key, out);
  }
  return out;
}

function fillSelect(sel, placeholder, options, value) {
  // the empty choice is just the field name, picking it clears the filter
  sel.replaceChildren(new Option(placeholder, ''), ...options.map(([v, label]) => new Option(label, v)));
  sel.value = value;
}

function filters(s) {
  fillSelect($('promo'), 'Promo', data.promos.map((y) => [y, y]), s.promo);
  fillSelect($('coal'), 'Coalition', data.order.map((c) => [String(c.id), c.name]), s.coal ? String(s.coal) : '');
  $('status').value = s.status;
  for (const id of ['promo', 'coal']) $(id).classList.toggle('set', !!$(id).value);
}

function render() {
  if (!data) return;
  const s = state();
  filters(s);
  const all = rows(s);
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const page = Math.min(s.page, pages);

  const tbl = $('tbl');
  tbl.classList.toggle('one-promo', !!s.promo);
  tbl.classList.toggle('one-coal', !!s.coal);
  fillTable(tbl, RANK_COLS, all.slice((page - 1) * PER_PAGE, page * PER_PAGE), (r) => rowClass(r.u));
  msg(all.length ? `${all.length} student${all.length > 1 ? 's' : ''}` : 'Nobody here with these filters.');
  $('pages').replaceChildren(...(pages > 1 ? pager(page, pages, (n) => link({ page: n })) : []));
  if (scrollPending) {
    scrollPending = false;
    document.querySelector('tr.hl')?.scrollIntoView({ block: 'center' });
  }
}

function initials(u, size = 28) {
  const el = h('span', { class: 'av', ariaHidden: 'true' }, u.login.slice(0, 2));
  el.style.width = el.style.height = size + 'px';
  return el;
}

function avatar(u, size = 28) {
  if (!u.img) return initials(u, size);
  const img = h('img', {
    class: 'av',
    src: u.img,
    alt: '',
    width: size,
    height: size,
    loading: 'lazy',
    decoding: 'async',
    referrerPolicy: 'no-referrer',
  });
  // if the photo is gone, show initials instead of a broken icon
  img.addEventListener('error', () => img.replaceWith(initials(u, size)), { once: true });
  return img;
}

// --- tables -------------------------------------------------------------------
// every list is the same table: a column is its header, its class and how to draw
// one cell, so the ranking and the transfers share the markup, styles and pager

function fillTable(tbl, cols, list, classOf) {
  if (!tbl.tHead.rows.length) tbl.tHead.append(h('tr', null, ...cols.map((c) => h('th', { class: c.cls }, c.head))));
  tbl.tBodies[0].replaceChildren(...list.map((r) => h('tr', { class: classOf(r) || null }, ...cols.map((c) => h('td', { class: c.cls }, c.cell(r))))));
  tbl.hidden = !list.length;
}

function rowClass(u) {
  return [u.login === highlight && 'hl', me && u.login === me.login && 'mine', u.bh && 'gone'].filter(Boolean).join(' ');
}

function who(u) {
  return h(
    'div',
    { class: 'who' },
    avatar(u),
    h(
      'span',
      null,
      h('a', { href: 'https://profile.intra.42.fr/users/' + encodeURIComponent(u.login), target: '_blank', rel: 'noopener noreferrer' }, u.login),
      u.bh && h('span', { class: 'tag' }, 'blackholed ' + u.bh),
      h('div', { class: 'name' }, u.name)
    )
  );
}

function levelLink(u) {
  return h('a', { href: '#calc&l=' + u.level, title: 'open in the calculator' }, u.level.toFixed(2));
}

// `to(n)` is the link to page n of whichever list this is
function pager(page, pages, to) {
  const nums = new Set([1, pages]);
  for (let i = page - 2; i <= page + 2; i++) if (i > 1 && i < pages) nums.add(i);
  const out = [];
  let prev = 0;
  if (page > 1) out.push(h('a', { href: to(page - 1) }, '‹'));
  for (const n of [...nums].sort((a, b) => a - b)) {
    if (n - prev > 1) out.push(' … ');
    out.push(n === page ? h('b', null, String(n)) : h('a', { href: to(n) }, String(n)));
    prev = n;
  }
  if (page < pages) out.push(h('a', { href: to(page + 1) }, '›'));
  return out;
}

function coalition(u) {
  const c = data.coal.get(u.coal);
  return c ? h('span', null, h('span', { class: 'dot', color: c.color }), c.name) : '';
}

const RANK_COLS = [
  { head: '#', cls: 'num', cell: (r) => String(r.rank) },
  { head: 'Student', cell: (r) => who(r.u) },
  { head: 'Coalition', cls: 'hide-sm col-coal', cell: (r) => coalition(r.u) },
  { head: 'Promo', cls: 'col-promo', cell: (r) => r.u.promo },
  { head: 'Level', cls: 'num lvl', cell: (r) => levelLink(r.u) },
];

function find(q) {
  if (!data || !q) return;
  const u = data.students.find((x) => x.login === q);
  if (!u) {
    msg(`No "${q}" on this campus.`);
    return;
  }
  let s = state();
  let i = rows(s).findIndex((r) => r.u === u);
  if (i < 0) {
    // not in this view: drop the filters that hide them
    s = { ...s, promo: '', coal: 0, status: u.bh ? 'absorbed' : 'active' };
    i = rows(s).findIndex((r) => r.u === u);
  }
  highlight = q;
  scrollPending = true;
  const to = link({ ...s, page: Math.floor(i / PER_PAGE) + 1 });
  if (to === location.hash) render();
  else location.hash = to;
}

// --- transfers ----------------------------------------------------------------

// campus countries as the api spells them -> ISO code, which is all a flag emoji needs
const COUNTRY_CODES = {
  Angola: 'AO', Armenia: 'AM', Australia: 'AU', Austria: 'AT', Belgium: 'BE', Brazil: 'BR', Canada: 'CA',
  'Czech Republic': 'CZ', Finland: 'FI', France: 'FR', Germany: 'DE', Italy: 'IT', Japan: 'JP', Jordan: 'JO',
  'Korea, Republic of': 'KR', Lebanon: 'LB', Luxembourg: 'LU', Madagascar: 'MG', Malaysia: 'MY', Morocco: 'MA',
  Netherlands: 'NL', 'Palestine, State of': 'PS', Poland: 'PL', Portugal: 'PT', Singapore: 'SG', Spain: 'ES',
  Switzerland: 'CH', Thailand: 'TH', Turkey: 'TR', 'United Arab Emirates': 'AE', 'United Kingdom': 'GB',
};
const MOVES = { moving: ['In progress', '#d69e2e'], arrived: ['Arrived', '#38a169'] };

let moves = null;
let loadedMoves = null;
const movesData = new Map(); // campus id -> { data, at }

// two regional-indicator letters make a flag
function flag(country) {
  const cc = COUNTRY_CODES[country];
  return cc ? String.fromCodePoint(...[...cc].map((ch) => 0x1f1a5 + ch.charCodeAt(0))) : '';
}

// "Korea, Republic of" -> "Korea"
const countryName = (country) => (country || '?').split(',')[0];

// an origin / destination filter is a campus id ("1") or a whole country ("FR")
function at(id, f) {
  if (!f) return true;
  if (/^\d+$/.test(f)) return id === Number(f);
  return COUNTRY_CODES[campusById.get(id)?.country] === f;
}

async function loadMoves(id) {
  const hit = movesData.get(id);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.data;
  const d = await api('/api/transfers/' + id);
  d.promos = [...new Set(d.students.map((u) => u.promo).filter(Boolean))].sort().reverse();
  movesData.set(id, { data: d, at: Date.now() });
  return d;
}

async function showTransfers(s) {
  lastMoves = { campus: s.campus, from: s.from, to: s.to, move: s.move, promo: s.promo, page: s.page };
  $('tr-campus').value = s.campus;
  if (s.campus !== loadedMoves || !moves) {
    loadedMoves = s.campus;
    moves = null;
    if (!movesData.has(s.campus)) {
      $('tr-tbl').hidden = true;
      $('tr-pages').replaceChildren();
      $('tr-fetched').textContent = '';
      $('tr-msg').textContent = 'Loading…';
    }
    try {
      const d = await loadMoves(s.campus);
      if (loadedMoves !== s.campus) return;
      moves = d;
    } catch (e) {
      $('tr-msg').textContent = 'Something went wrong: ' + e.message;
      return;
    }
    $('tr-fetched').textContent = 'updated ' + clock(moves.fetchedAt);
  }
  renderMoves();
}

// filtered list; `skip` leaves one filter out, to count what each of its choices would give
function moveRows(s, skip) {
  const q = $('tr-q').value.trim().toLowerCase();
  return moves.students.filter(
    (u) =>
      (skip === 'from' || at(u.from, s.from)) &&
      (skip === 'to' || at(u.to, s.to)) &&
      (skip === 'move' || !s.move || u.status === s.move) &&
      (!s.promo || u.promo === s.promo) &&
      (!q || u.login.includes(q) || u.name.toLowerCase().includes(q))
  );
}

// every campus seen on that side of a move, by country, plus the whole country when it has several
function placeSelect(sel, placeholder, key, rows, value) {
  const seen = new Set(moves.students.map((u) => u[key]));
  const count = (f) => rows.filter((u) => at(u[key], f)).length;
  const groups = new Map();
  for (const c of campusById.values()) {
    if (!seen.has(c.id)) continue;
    if (!groups.has(c.country)) groups.set(c.country, []);
    groups.get(c.country).push(c);
  }
  const options = [];
  for (const [country, list] of groups) {
    const group = h('optgroup', { label: countryName(country) });
    const cc = COUNTRY_CODES[country];
    if (cc && list.length > 1) group.append(new Option(`${flag(country)} All of ${countryName(country)} (${count(cc)})`, cc));
    for (const c of list) group.append(new Option(`${flag(country)} ${c.name} (${count(String(c.id))})`, c.id));
    options.push(group);
  }
  sel.replaceChildren(new Option(placeholder, ''), ...options);
  sel.value = value;
}

function renderMoves() {
  if (!moves) return;
  const s = state();
  placeSelect($('tr-from'), 'Origin', 'from', moveRows(s, 'from'), s.from);
  placeSelect($('tr-to'), 'Destination', 'to', moveRows(s, 'to'), s.to);
  const byStatus = moveRows(s, 'move');
  fillSelect($('tr-status'), 'Status', Object.entries(MOVES).map(([k, [label]]) => [k, `${label} (${byStatus.filter((u) => u.status === k).length})`]), s.move);
  fillSelect($('tr-promo'), 'Promo', moves.promos.map((y) => [y, y]), s.promo);
  for (const id of ['tr-from', 'tr-to', 'tr-status', 'tr-promo']) $(id).classList.toggle('set', !!$(id).value);

  const all = moveRows(s);
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const page = Math.min(s.page, pages);
  const tbl = $('tr-tbl');
  tbl.classList.toggle('one-promo', !!s.promo);
  fillTable(tbl, MOVE_COLS, all.slice((page - 1) * PER_PAGE, page * PER_PAGE), rowClass);
  $('tr-msg').textContent = all.length
    ? `${all.length} student${all.length > 1 ? 's' : ''}`
    : moves.students.length
      ? 'Nobody here with these filters.'
      : 'Nobody is moving to or from this campus.';
  $('tr-pages').replaceChildren(...(pages > 1 ? pager(page, pages, (n) => movesLink({ page: n })) : []));
}

function place(id) {
  const c = campusById.get(id);
  return h('span', { class: 'place' }, h('span', { class: 'flag', ariaHidden: 'true' }, flag(c?.country)), c ? c.name : '?');
}

// "🇲🇦 Khouribga → 🇫🇷 Paris", with the countries underneath like a student's full name
function trip(u) {
  const a = countryName(campusById.get(u.from)?.country);
  const b = countryName(campusById.get(u.to)?.country);
  return h(
    'div',
    { class: 'trip' },
    h('div', null, place(u.from), h('span', { class: 'arrow' }, '→'), place(u.to)),
    h('div', { class: 'name' }, a === b ? a : `${a} → ${b}`)
  );
}

const month = (day) => new Date(day).toLocaleDateString('en', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function moveStatus(u) {
  const [label, color] = MOVES[u.status];
  return h('span', null, h('span', { class: 'dot', color }), label, ' ', h('span', { class: 'when hide-sm' }, (u.status === 'moving' ? 'since ' : '') + month(u.at)));
}

const MOVE_COLS = [
  { head: 'Student', cell: who },
  { head: 'Transfer', cell: trip },
  { head: 'Promo', cls: 'hide-sm col-promo', cell: (u) => u.promo },
  { head: 'Level', cls: 'num lvl hide-sm', cell: levelLink },
  { head: 'Status', cell: moveStatus },
];

// --- level calculator -------------------------------------------------------

// total xp needed to reach each level in 42cursus (level 0 to 30)
const XP_TABLE = [
  0, 462, 2688, 5885, 11777, 29217, 46255, 63559, 74340, 85483, 95000, 105630, 124446, 145782, 169932, 197316,
  228354, 263508, 303366, 348516, 399672, 457632, 523320, 597756, 682104, 777684, 885996, 1008738, 1147842,
  1305486, 1484148,
];
const MAX_LEVEL = XP_TABLE.length - 1;
const COALITION_BONUS = 1.042;
const SAVE_KEY = 'calc-v1';

function levelToXp(level) {
  level = Math.min(MAX_LEVEL, Math.max(0, level));
  const i = Math.min(MAX_LEVEL - 1, Math.floor(level));
  return XP_TABLE[i] + (level - i) * (XP_TABLE[i + 1] - XP_TABLE[i]);
}

function xpToLevel(xp) {
  for (let i = 0; i < MAX_LEVEL; i++) {
    if (xp < XP_TABLE[i + 1]) return i + (xp - XP_TABLE[i]) / (XP_TABLE[i + 1] - XP_TABLE[i]);
  }
  return MAX_LEVEL;
}

// plain text box so it always reads "11.80" (a number box would show "11,8" on french browsers)
function setCur(level) {
  $('cur').value = Math.min(MAX_LEVEL, Math.max(0, Number(level) || 0)).toFixed(2);
}

function readCur() {
  const v = parseFloat($('cur').value.replace(',', '.'));
  return Math.min(MAX_LEVEL, Math.max(0, Number.isFinite(v) ? v : 0));
}

const fmt = (n) => Math.round(n).toLocaleString('en');
const clampMark = (v) => Math.min(125, Math.max(0, Math.round(Number(v) || 0)));

let projects = null;
let picked = [];
let mark = 100;
const PRESETS = [100, 115, 125];
let results = [];
let active = 0;

// the picked list survives reloads (per browser, nothing sent anywhere)
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ picked, mark, bonus: $('bonus').checked }));
  } catch {}
}

function restore() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s) return;
    picked = (s.picked || [])
      .filter((p) => p && typeof p.name === 'string' && Number.isFinite(p.xp))
      .map((p) => ({ id: p.id, name: p.name, xp: p.xp, mark: clampMark(p.mark), bonus: !!p.bonus }));
    setMark(s.mark);
    $('bonus').checked = !!s.bonus;
  } catch {}
}

// a preset lights its button; anything else lives in the "other" box
function setMark(v, typing = false) {
  mark = clampMark(v ?? 100);
  if (!typing) $('mark').value = PRESETS.includes(mark) ? '' : mark;
  for (const b of document.querySelectorAll('.seg')) b.classList.toggle('on', Number(b.dataset.mark) === mark);
}

function initCalc() {
  restore();
  setMark(mark);
  $('cur').oninput = calc;
  $('cur').onblur = () => setCur(readCur());
  for (const b of document.querySelectorAll('.seg')) {
    b.onclick = () => {
      setMark(b.dataset.mark);
      save();
      $('proj').focus();
    };
  }
  $('mark').oninput = () => {
    setMark($('mark').value === '' ? 100 : $('mark').value, true);
    save();
  };
  $('bonus').onchange = save;
  $('clear').onclick = () => {
    picked = [];
    drawPicked();
  };

  $('fill').onsubmit = async (e) => {
    e.preventDefault();
    const q = $('fill-q').value.trim().toLowerCase();
    if (!q) return;
    // the campus already loaded has it for free, otherwise ask the api
    let u = data?.students.find((x) => x.login === q);
    if (!u) {
      $('fill-msg').textContent = 'Looking up ' + q + '…';
      try {
        u = await api('/api/user/' + encodeURIComponent(q));
      } catch (err) {
        $('fill-msg').textContent = q + ': ' + err.message;
        return;
      }
    }
    setCur(u.level);
    $('fill-q').value = '';
    $('fill-msg').textContent = `Using ${u.login}'s level.`;
    if (data?.students.includes(u)) {
      $('bonus').checked = leads(u);
      $('fill-msg').textContent += leads(u) ? ' Their coalition is 1st right now, so the bonus is on.' : '';
    }
    calc();
  };

  // project search: type, arrows to move, enter or click to add
  const input = $('proj');
  input.oninput = search;
  input.onfocus = search;
  input.onkeydown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!results.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
      drawResults();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) add(results[active]);
    } else if (e.key === 'Escape') {
      closeResults();
    }
  };
  input.onblur = () => setTimeout(closeResults, 150);
}

function search() {
  const q = $('proj').value.trim().toLowerCase();
  if (!projects || !q) return closeResults();
  const starts = [];
  const has = [];
  for (const p of projects) {
    const n = p.name.toLowerCase();
    if (n.startsWith(q)) starts.push(p);
    else if (n.includes(q)) has.push(p);
  }
  results = starts.concat(has).slice(0, 8);
  active = 0;
  drawResults();
}

function drawResults() {
  const ul = $('proj-results');
  if (!results.length) {
    ul.replaceChildren(h('li', { class: 'none' }, 'No project with that name'));
  } else {
    ul.replaceChildren(
      ...results.map((p, i) => {
        const li = h('li', { role: 'option', ariaSelected: String(i === active), class: i === active ? 'on' : null }, h('span', null, p.name), h('span', { class: 'muted' }, fmt(p.xp) + ' xp'));
        li.onmousedown = (e) => {
          e.preventDefault(); // keep focus in the input
          add(p);
        };
        return li;
      })
    );
  }
  ul.hidden = false;
  $('proj').setAttribute('aria-expanded', 'true');
}

function closeResults() {
  $('proj-results').hidden = true;
  $('proj').setAttribute('aria-expanded', 'false');
  results = [];
}

function add(p) {
  picked.push({ id: p.id, name: p.name, xp: p.xp, mark, bonus: $('bonus').checked });
  $('proj').value = '';
  closeResults();
  drawPicked();
  $('proj').focus();
}

async function showCalc(s) {
  if (s.level != null && /^\d{1,2}(\.\d+)?$/.test(s.level)) setCur(Number(s.level));
  if (!projects) {
    $('add-msg').textContent = 'Loading projects…';
    try {
      projects = await api('/api/projects');
    } catch (e) {
      $('add-msg').textContent = 'Could not load projects: ' + e.message;
      return;
    }
    $('add-msg').textContent = '';
  }
  drawPicked();
}

function gained(p) {
  return Math.round(((p.xp * p.mark) / 100) * (p.bonus ? COALITION_BONUS : 1));
}

// rows are only rebuilt when the list changes; editing a mark updates in place
function drawPicked() {
  $('picked').replaceChildren(
    ...picked.map((p) => {
      const out = h('span', { class: 'p-gain' }, '+' + fmt(gained(p)));
      const mark = h('input', { type: 'number', min: 0, max: 125, step: 1, value: p.mark, class: 'p-mark', ariaLabel: 'mark for ' + p.name });
      mark.oninput = () => {
        p.mark = clampMark(mark.value);
        out.textContent = '+' + fmt(gained(p));
        calc();
      };
      const bonus = h('button', { type: 'button', class: p.bonus ? 'p-bonus on' : 'p-bonus', title: 'coalition 1st bonus', ariaPressed: String(p.bonus) }, '+4.2%');
      bonus.onclick = () => {
        p.bonus = !p.bonus;
        bonus.classList.toggle('on', p.bonus);
        bonus.ariaPressed = String(p.bonus);
        out.textContent = '+' + fmt(gained(p));
        calc();
      };
      const del = h('button', { type: 'button', class: 'link', title: 'remove', ariaLabel: 'remove ' + p.name }, '×');
      const li = h(
        'li',
        null,
        h('div', { class: 'p-name' }, h('div', null, p.name), h('div', { class: 'p-xp' }, fmt(p.xp) + ' xp')),
        h('div', { class: 'p-ctrl' }, mark, bonus, out, del)
      );
      del.onclick = () => {
        picked.splice(picked.indexOf(p), 1);
        li.remove();
        calc();
      };
      return li;
    })
  );
  calc();
}

function calc() {
  const cur = readCur();
  const start = levelToXp(cur);
  const total = picked.reduce((n, p) => n + gained(p), 0);
  const endXp = Math.min(start + total, XP_TABLE[MAX_LEVEL]);
  const end = xpToLevel(endXp);

  $('end').textContent = end.toFixed(2);
  $('end').classList.toggle('up', total > 0);
  $('gain').textContent = total ? `+${(end - cur).toFixed(2)} levels · +${fmt(total)} xp` : '';

  // bar = progress inside the level you end up in; grey part is where you start from
  const lvl = Math.min(MAX_LEVEL - 1, Math.floor(end));
  const lo = XP_TABLE[lvl];
  const hi = XP_TABLE[lvl + 1];
  const pct = (x) => Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100));
  const nowPct = start >= lo ? pct(start) : 0;
  const endPct = pct(endXp);
  $('track-now').style.width = nowPct + '%';
  $('track-add').style.left = nowPct + '%';
  $('track-add').style.width = Math.max(0, endPct - nowPct) + '%';
  $('track-text').textContent = end >= MAX_LEVEL ? 'max level' : `${fmt(hi - endXp)} xp to level ${lvl + 1}`;

  $('empty').hidden = picked.length > 0;
  $('picked-foot').hidden = picked.length < 2;
  save();
}

init().catch((e) => msg('Something went wrong: ' + e.message));
