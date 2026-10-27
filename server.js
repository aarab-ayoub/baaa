// 42 rank — tiny server, no dependencies (Node 18+)
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

// --- config ---------------------------------------------------------------
for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { FT_UID, FT_SECRET } = process.env;
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '127.0.0.1'; // local only unless you say otherwise
const API = 'https://api.intra.42.fr';
const CURSUS = 21; // 42cursus
const FRESH_MS = 10 * 60 * 1000; // after this, serve cached data and refresh in background
const CAMPUS_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CAMPUS = 75;
// must also be listed in "Redirect URI" of the app on profile.intra.42.fr
const REDIRECT_URI = process.env.REDIRECT_URI || `http://localhost:${PORT}/auth/callback`;
const REQUIRE_LOGIN = process.env.REQUIRE_LOGIN !== '0';

if (!FT_UID || !FT_SECRET) {
  console.error('missing FT_UID / FT_SECRET in .env');
  process.exit(1);
}

// --- auth (client_credentials) -------------------------------------------
let token = null;
let tokenExp = 0;
let tokenReq = null;

function getToken(force = false) {
  if (!force && token && Date.now() < tokenExp - 60_000) return token;
  if (!tokenReq) tokenReq = fetchToken().finally(() => (tokenReq = null));
  return tokenReq;
}

async function fetchToken() {
  const res = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: FT_UID,
      client_secret: FT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`auth failed: ${res.status}`);
  const data = await res.json();
  token = data.access_token;
  tokenExp = Date.now() + data.expires_in * 1000;
  console.log('got new token, expires in', data.expires_in, 's');
  return token;
}

// --- rate-limited GET (app limit is 2 req/s) -----------------------------
let last = 0;
const queue = [];
let busy = false;

function throttle() {
  return new Promise((resolve) => {
    queue.push(resolve);
    if (!busy) drain();
  });
}

async function drain() {
  busy = true;
  while (queue.length) {
    const wait = last + 550 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    queue.shift()();
  }
  busy = false;
}

async function get(url, tries = 0) {
  await throttle();
  const res = await fetch(API + url, {
    headers: { Authorization: `Bearer ${await getToken()}` },
  });
  if (res.status === 401 && tries < 1) {
    await getToken(true);
    return get(url, tries + 1);
  }
  if (res.status === 429 && tries < 5) {
    await new Promise((r) => setTimeout(r, 1500));
    return get(url, tries + 1);
  }
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return { data: await res.json(), total: Number(res.headers.get('x-total') || 0) };
}

async function getAll(url) {
  const sep = url.includes('?') ? '&' : '?';
  const page = (n) => get(`${url}${sep}per_page=100&page=${n}`);
  const first = await page(1);
  const pages = Math.ceil(first.total / 100);
  const rest = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, i) => page(i + 2)));
  return first.data.concat(...rest.map((r) => r.data));
}

// --- disk: api data, photos and sessions survive restarts --------------------
// so a restart is instant, costs no api calls, and doesn't log anyone out
const CACHE_DIR = path.join(__dirname, '.cache');
fs.mkdirSync(path.join(CACHE_DIR, 'img'), { recursive: true, mode: 0o700 });
fs.chmodSync(CACHE_DIR, 0o700);
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');

// write to a temp file then rename, so a crash never leaves half a file
function writeDisk(file, body) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.promises
    .writeFile(tmp, body, { mode: 0o600 })
    .then(() => fs.promises.rename(tmp, file))
    .catch((e) => console.error('disk:', e.message));
}

// --- cache: stale-while-revalidate, stores ready-to-send gzipped JSON ----
const cache = new Map();
const pending = new Map();

function pack(body, value) {
  return {
    at: Date.now(),
    value,
    body,
    gz: zlib.gzipSync(body, { level: 9 }),
    etag: '"' + crypto.createHash('sha1').update(body).digest('base64url').slice(0, 16) + '"',
  };
}

function refresh(key, fn) {
  if (!pending.has(key)) {
    const p = fn()
      .then((value) => {
        const body = Buffer.from(JSON.stringify(value));
        const entry = pack(body, value);
        cache.set(key, entry);
        writeDisk(path.join(CACHE_DIR, `data-${sha(key).slice(0, 24)}.json`), JSON.stringify({ key, at: entry.at, value }));
        return entry;
      })
      .finally(() => pending.delete(key));
    pending.set(key, p);
  }
  return pending.get(key);
}

async function cached(key, fn, maxAge = FRESH_MS) {
  const hit = cache.get(key);
  if (!hit) return refresh(key, fn);
  if (Date.now() - hit.at > maxAge) refresh(key, fn).catch((e) => console.error(e.message));
  return hit;
}

// --- profile pictures ---------------------------------------------------
// the cdn only serves student photos to logged-in intra users, so the browser
// can't load them directly. we fetch them here with the app token and serve them
// from /img/... — only urls that came out of the api are allowed (no open proxy).
const CDN = 'https://cdn.intra.42.fr';
const IMG = /^https:\/\/cdn\.intra\.42\.fr(\/users\/[0-9a-f]{32}\/[\w\-.]{1,80}\.(?:jpe?g|png|gif|webp))$/i;
const IMG_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const IMG_MAX_BYTES = 300 * 1024;
const IMG_CACHE_BYTES = 64 * 1024 * 1024;
const knownImages = new Set();
const images = new Map(); // path -> { type, body }, oldest first (LRU)
let imageBytes = 0;
let imgActive = 0;
const imgWaiting = [];

async function fetchImage(p) {
  // at most 8 cdn downloads at a time
  if (imgActive >= 8) await new Promise((r) => imgWaiting.push(r));
  imgActive++;
  try {
    const res = await fetch(CDN + p, {
      headers: { Authorization: `Bearer ${await getToken()}` },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    const type = (res.headers.get('content-type') || '').split(';')[0].trim();
    if (!res.ok || !IMG_TYPES.has(type)) throw new Error(`img ${res.status}`);
    const body = Buffer.from(await res.arrayBuffer());
    if (body.length > IMG_MAX_BYTES) throw new Error('img too big');
    return { type, body };
  } finally {
    imgActive--;
    imgWaiting.shift()?.();
  }
}

const imgPending = new Map();

const EXT_TYPE = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
const imgFile = (p) => path.join(CACHE_DIR, 'img', sha(p).slice(0, 32));

// memory first, then disk, then the cdn (and keep what we downloaded)
async function loadImage(p) {
  try {
    const body = await fs.promises.readFile(imgFile(p));
    return { type: EXT_TYPE[p.split('.').pop().toLowerCase()], body };
  } catch {
    const img = await fetchImage(p);
    writeDisk(imgFile(p), img.body);
    return img;
  }
}

async function image(p) {
  const hit = images.get(p);
  if (hit) {
    images.delete(p);
    images.set(p, hit);
    return hit;
  }
  if (!imgPending.has(p)) {
    imgPending.set(
      p,
      loadImage(p)
        .then((img) => {
          img.etag = '"' + crypto.createHash('sha1').update(img.body).digest('base64url').slice(0, 16) + '"';
          images.set(p, img);
          imageBytes += img.body.length;
          for (const [k, v] of images) {
            if (imageBytes <= IMG_CACHE_BYTES) break;
            images.delete(k);
            imageBytes -= v.body.length;
          }
          return img;
        })
        .finally(() => imgPending.delete(p))
    );
  }
  return imgPending.get(p);
}

function localImage(url) {
  const m = url && url.match(IMG);
  if (!m) return null;
  knownImages.add(m[1]);
  return '/img' + m[1];
}

// --- data -----------------------------------------------------------------
const COLOR = /^#[0-9a-f]{3,8}$/i;

// photos we show instead of the intra one
const PHOTO_OVERRIDES = { ayaarab: '/chongo.jpg' };

// every 42cursus project that gives xp, for the level calculator
function projects() {
  return cached(
    'projects',
    async () => {
      const list = await getAll(`/v2/cursus/${CURSUS}/projects`);
      const seen = new Set();
      return list
        .filter((p) => p.difficulty > 0 && !seen.has(p.name) && seen.add(p.name))
        .map((p) => ({ id: p.id, name: p.name, xp: p.difficulty }))
        .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
    },
    CAMPUS_MS
  );
}

function campuses() {
  return cached(
    'campuses',
    async () => {
      const list = await getAll('/v2/campus');
      return list
        .filter((c) => c.active)
        .map((c) => ({ id: c.id, name: c.name, country: c.country }))
        .sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
    },
    CAMPUS_MS
  );
}

async function ranking(campusId) {
  return cached(`rank:${campusId}`, async () => {
    const [cursusUsers, blocs] = await Promise.all([
      getAll(`/v2/cursus/${CURSUS}/cursus_users?filter[campus_id]=${campusId}`),
      get(`/v2/blocs?filter[campus_id]=${campusId}&filter[cursus_id]=${CURSUS}`).then((r) => r.data),
    ]);

    const coalitions = (blocs[0]?.coalitions || []).map((c) => ({
      id: c.id,
      name: c.name,
      color: COLOR.test(c.color) ? c.color : '#888',
      score: c.score,
    }));

    const member = new Map();
    const lists = await Promise.all(coalitions.map((c) => getAll(`/v2/coalitions/${c.id}/coalitions_users`)));
    coalitions.forEach((c, i) => {
      for (const u of lists[i]) member.set(u.user_id, c.id);
    });

    // blackholed_at is often left in the past for students who got extra time,
    // so "absorbed" = the cursus was actually closed (end_at set and passed).
    const now = Date.now();
    const students = cursusUsers
      .filter((cu) => cu.user && cu.user.kind === 'student' && !cu.user['staff?'])
      .map((cu) => {
        const u = cu.user;
        // avatar is shown at 28px, so the smallest version is plenty
        const img = u.image?.versions?.micro || u.image?.versions?.small || u.image?.link;
        const ended = cu.end_at && new Date(cu.end_at).getTime() <= now && !u['alumni?'];
        return {
          login: u.login,
          name: u.usual_full_name || u.displayname || '',
          img: PHOTO_OVERRIDES[u.login] || localImage(img),
          level: cu.level,
          promo: u.pool_year || '',
          coal: member.get(u.id) || null,
          bh: ended ? cu.end_at.slice(0, 10) : null,
        };
      })
      .sort((a, b) => b.level - a.level || a.login.localeCompare(b.login));

    return { fetchedAt: new Date().toISOString(), coalitions, students };
  });
}

// --- http -----------------------------------------------------------------
// strict: no inline code, no eval, no html strings into the DOM (trusted types),
// nothing loaded from anywhere except this server and 42's image cdn
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self'",
    "connect-src 'self'",
    "manifest-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "require-trusted-types-for 'script'",
    "trusted-types 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer', // cdn hotlink protection rejects foreign referers, empty is fine
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'X-DNS-Prefetch-Control': 'off',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Permissions-Policy':
    'accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), usb=(), xr-spatial-tracking=(), interest-cohort=()',
};

// only answer to our own host name: blocks DNS-rebinding tricks where a random
// website points its domain at 127.0.0.1 to read this server from your browser
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`, `[::1]:${PORT}`]);

// a cold campus costs ~10-50 calls of our 1200/hour 42 quota; cap how many can be
// pulled per hour so nobody can drain the key by clicking through every campus
const COLD_LOADS_PER_HOUR = 15;
const coldLoads = [];
const LOOKUPS_PER_HOUR = 100;
const lookups = [];

function allowColdLoad(log = coldLoads, max = COLD_LOADS_PER_HOUR) {
  const hourAgo = Date.now() - 3600_000;
  while (log.length && log[0] < hourAgo) log.shift();
  if (log.length >= max) return false;
  log.push(Date.now());
  return true;
}

// level of one student, for the calculator's "take level from login"
const LOGIN = /^[a-z0-9-]{1,32}$/;

function userLevel(login) {
  return cached(`user:${login}`, async () => {
    let u;
    try {
      u = (await get(`/v2/users/${login}`)).data;
    } catch (e) {
      if (/-> 404$/.test(e.message)) return { login, level: null };
      throw e;
    }
    const cu = (u.cursus_users || []).find((c) => c.cursus_id === CURSUS);
    return { login: u.login, level: cu ? cu.level : null };
  });
}

const STATIC = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/chongo.jpg': ['public/chongo.jpg', 'image/jpeg'],
};
for (const [route, [file, type]] of Object.entries(STATIC)) {
  STATIC[route] = { ...pack(fs.readFileSync(path.join(__dirname, file))), type };
}

function send(req, res, entry, type, cacheControl, compress = true) {
  const headers = { ...SECURITY_HEADERS, 'Content-Type': type, ETag: entry.etag, 'Cache-Control': cacheControl, Vary: 'Accept-Encoding' };
  if (req.headers['if-none-match'] === entry.etag) {
    res.writeHead(304, headers);
    return res.end();
  }
  // jpegs are already compressed, gzip would only cost cpu
  const gzip = compress && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (gzip) headers['Content-Encoding'] = 'gzip';
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : gzip ? entry.gz : entry.body);
}

// --- login with 42 (oauth authorization code) ------------------------------
// sessions live in memory: a restart logs everyone out, which is fine here.
// the student's own 42 token is used once to read /v2/me and then dropped.
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 5000;
// keyed by a hash of the cookie, so the file on disk holds no usable session ids
const sessions = new Map(); // sha(sid) -> { user, exp }
const SESSIONS_FILE = path.join(CACHE_DIR, 'sessions.json');
let saveTimer = null;

function saveSessions() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const now = Date.now();
    for (const [k, v] of sessions) if (v.exp < now) sessions.delete(k);
    writeDisk(SESSIONS_FILE, JSON.stringify([...sessions]));
  }, 1000);
}

function cookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

function sameToken(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function session(req) {
  const sid = cookies(req).sid;
  if (!sid || !/^[\w-]{43}$/.test(sid)) return null;
  const s = sessions.get(sha(sid));
  if (!s) return null;
  if (s.exp < Date.now()) {
    sessions.delete(sha(sid));
    saveSessions();
    return null;
  }
  return s;
}

function redirect(res, to, setCookies = []) {
  res.writeHead(302, { ...SECURITY_HEADERS, Location: to, 'Cache-Control': 'no-store', 'Set-Cookie': setCookies });
  res.end();
}

function login(req, res) {
  // cookies are per host name, so start on the same host 42 will send us back to
  const home = new URL(REDIRECT_URI);
  if (req.headers.host !== home.host) return redirect(res, `${home.origin}/auth/login`);
  const state = crypto.randomBytes(32).toString('base64url');
  const q = new URLSearchParams({
    client_id: FT_UID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'public',
    state,
  });
  redirect(res, `${API}/oauth/authorize?${q}`, [cookie('oauth_state', state, 600)]);
}

async function callback(req, res, url) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expected = cookies(req).oauth_state;
  const clear = cookie('oauth_state', '', 0);
  // state must match the cookie we set, or someone is trying to log you in as them
  if (!code || !state || !expected || !sameToken(state, expected) || !/^[\w-]{1,200}$/.test(code)) {
    return redirect(res, '/#login-failed', [clear]);
  }
  const tr = await fetch(`${API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: FT_UID,
      client_secret: FT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tr.ok) return redirect(res, '/#login-failed', [clear]);
  const { access_token } = await tr.json();

  const mr = await fetch(`${API}/v2/me`, {
    headers: { Authorization: `Bearer ${access_token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!mr.ok) return redirect(res, '/#login-failed', [clear]);
  const me = await mr.json();
  const cu = (me.cursus_users || []).find((c) => c.cursus_id === CURSUS);
  const campus = (me.campus_users || []).find((c) => c.is_primary)?.campus_id || me.campus?.[0]?.id || null;
  const user = {
    login: me.login,
    name: me.usual_full_name || me.displayname || '',
    img: PHOTO_OVERRIDES[me.login] || localImage(me.image?.versions?.micro || me.image?.link),
    level: cu ? cu.level : null,
    promo: me.pool_year || '',
    campus,
  };

  if (sessions.size >= MAX_SESSIONS) {
    // drop the oldest one rather than grow forever
    sessions.delete(sessions.keys().next().value);
  }
  const sid = crypto.randomBytes(32).toString('base64url');
  sessions.set(sha(sid), { user, exp: Date.now() + SESSION_MS });
  saveSessions();
  console.log('login:', user.login);
  redirect(res, '/', [clear, cookie('sid', sid, SESSION_MS / 1000)]);
}

function logout(req, res) {
  const sid = cookies(req).sid;
  if (sid) {
    sessions.delete(sha(sid));
    saveSessions();
  }
  res.writeHead(204, { ...SECURITY_HEADERS, 'Cache-Control': 'no-store', 'Set-Cookie': cookie('sid', '', 0) });
  res.end();
}

function fail(res, status, msg) {
  res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify({ error: msg }));
}

const server = http.createServer(async (req, res) => {
    if (!ALLOWED_HOSTS.has(req.headers.host)) return fail(res, 421, 'bad host');
    if (req.url.length > 300) return fail(res, 414, 'url too long');
    // the page only ever calls its own api, so refuse other sites' scripts
    const site = req.headers['sec-fetch-site'];
    const sameSite = !site || site === 'same-origin' || site === 'none';
    if (!sameSite && /^\/(api|img)\//.test(req.url)) return fail(res, 403, 'forbidden');

    // logout is the only POST, and only from our own page (no csrf logouts)
    if (req.method === 'POST' && req.url === '/auth/logout') {
      if (site !== 'same-origin') return fail(res, 403, 'forbidden');
      return logout(req, res);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return fail(res, 405, 'method not allowed');
    }
    const url = new URL(req.url, 'http://x');
    try {
      const file = STATIC[url.pathname];
      if (file) return send(req, res, file, file.type, 'no-cache', !file.type.startsWith('image/'));

      if (url.pathname === '/favicon.ico') {
        res.writeHead(204, { ...SECURITY_HEADERS, 'Cache-Control': 'public, max-age=604800' });
        return res.end();
      }

      if (url.pathname === '/auth/login') return login(req, res);
      if (url.pathname === '/auth/callback') {
        return await callback(req, res, url).catch((e) => {
          console.error('login:', e.message);
          redirect(res, '/#login-failed', [cookie('oauth_state', '', 0)]);
        });
      }

      const me = session(req);
      if (url.pathname === '/api/me') {
        res.writeHead(200, { ...SECURITY_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify({ user: me ? me.user : null, required: REQUIRE_LOGIN }));
      }
      // student data is only for logged-in 42 students
      if (REQUIRE_LOGIN && !me && /^\/(api|img)\//.test(url.pathname)) return fail(res, 401, 'login required');

      if (url.pathname === '/api/projects') {
        return send(req, res, await projects(), 'application/json', 'no-cache');
      }

      const lu = url.pathname.match(/^\/api\/user\/([^/]+)$/);
      if (lu) {
        const login = lu[1].toLowerCase();
        if (!LOGIN.test(login)) return fail(res, 404, 'no such student');
        if (!cache.has(`user:${login}`) && !pending.has(`user:${login}`) && !allowColdLoad(lookups, LOOKUPS_PER_HOUR)) {
          return fail(res, 429, 'too many lookups this hour, try again later');
        }
        const entry = await userLevel(login);
        if (entry.value.level == null) return fail(res, 404, 'no 42cursus level for this login');
        return send(req, res, entry, 'application/json', 'no-cache');
      }

      if (url.pathname.startsWith('/img/')) {
        const p = url.pathname.slice(4);
        if (!knownImages.has(p)) return fail(res, 404, 'not found');
        let img;
        try {
          img = await image(p);
        } catch (e) {
          return fail(res, 404, 'no picture');
        }
        // the url holds a content hash, so browsers may keep it for a week
        return send(req, res, img, img.type, 'private, max-age=604800, immutable', false);
      }

      if (url.pathname === '/api/campuses') {
        return send(req, res, await campuses(), 'application/json', 'no-cache');
      }

      const m = url.pathname.match(/^\/api\/ranking\/(\d{1,5})$/);
      if (m) {
        const id = Number(m[1]);
        // only real campuses, so nobody can make us spam the API with junk ids
        const list = (await campuses()).value;
        if (!list.some((c) => c.id === id)) return fail(res, 404, 'unknown campus');
        if (!cache.has(`rank:${id}`) && !pending.has(`rank:${id}`) && !allowColdLoad()) {
          return fail(res, 429, 'too many new campuses this hour, try again later');
        }
        return send(req, res, await ranking(id), 'application/json', 'no-cache');
      }
      fail(res, 404, 'not found');
    } catch (e) {
      console.error(e.message);
      fail(res, 502, '42 api unavailable, try again');
    }
  });

// --- restore from disk -------------------------------------------------------
function rememberImages(value) {
  for (const u of value?.students || []) if (u.img?.startsWith('/img/')) knownImages.add(u.img.slice(4));
}

for (const f of fs.readdirSync(CACHE_DIR)) {
  if (!/^data-[0-9a-f]+\.json$/.test(f)) continue;
  try {
    const { key, at, value } = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8'));
    cache.set(key, { ...pack(Buffer.from(JSON.stringify(value)), value), at });
    rememberImages(value);
  } catch {
    fs.rmSync(path.join(CACHE_DIR, f), { force: true });
  }
}
try {
  const now = Date.now();
  for (const [k, v] of JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'))) {
    if (v.exp > now && /^[0-9a-f]{64}$/.test(k)) {
      sessions.set(k, v);
      if (v.user.img?.startsWith('/img/')) knownImages.add(v.user.img.slice(4));
    }
  }
} catch {}
console.log(`restored ${cache.size} cached responses, ${sessions.size} sessions`);

// drop slow or oversized clients instead of holding sockets open for them
server.headersTimeout = 10_000;
server.requestTimeout = 60_000; // a cold campus can take ~30s
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 50;
server.maxRequestsPerSocket = 1000;

server.listen(PORT, HOST, () => {
  console.log(`http://${HOST}:${PORT}`);
  ranking(DEFAULT_CAMPUS).catch((e) => console.error('warmup:', e.message));
  projects().catch((e) => console.error('warmup:', e.message));
});
