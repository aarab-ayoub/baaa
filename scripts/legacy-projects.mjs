// writes lib/server/legacy-projects.json: projects gcc still counts for the students who did
// them (old versions, deprecated piscines) but 42cursus no longer lists, with their xp
//   node --env-file=.env scripts/legacy-projects.mjs
import fs from 'node:fs';

const API = 'https://api.intra.42.fr';
const official = JSON.parse(fs.readFileSync(new URL('../lib/rncp-official.json', import.meta.url), 'utf8'));
const current = new Set(JSON.parse(fs.readFileSync(new URL('../lib/server/catalog-seed.json', import.meta.url), 'utf8')).map((p) => p.id));
// and old versions 42cursus still lists next to the current one
const SUPERSEDED = [1853]; // doom_nukem: no session since 2022, doom-nukem (1458) is the one done now
const ids = Object.keys(official.names).map(Number).filter((id) => !current.has(id) || SUPERSEDED.includes(id));

const res = await fetch(`${API}/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.FT_UID, client_secret: process.env.FT_SECRET }),
});
const { access_token } = await res.json();
const r = await fetch(`${API}/v2/projects?filter[id]=${ids.join(',')}&per_page=100`, { headers: { Authorization: `Bearer ${access_token}` } });
if (!r.ok) throw new Error(`projects: ${r.status}`);
const found = new Map((await r.json()).map((p) => [p.id, p]));
// a project's xp is per session; the 42cursus one when there is one, else the largest
const xpOf = (p) => {
  const s = (p.project_sessions || []).filter((x) => x.difficulty);
  return (s.find((x) => x.cursus_id === 21) ?? s.sort((a, b) => b.difficulty - a.difficulty)[0])?.difficulty ?? p.difficulty ?? 0;
};
const out = ids.map((id) => ({ id, name: official.names[id], xp: found.has(id) ? xpOf(found.get(id)) : 0 })).sort((a, b) => a.id - b.id);
fs.writeFileSync(new URL('../lib/server/legacy-projects.json', import.meta.url), '[\n' + out.map((p) => JSON.stringify(p)).join(',\n') + '\n]\n');
console.log(`${out.length} legacy projects written (${out.filter((p) => !p.xp).length} without xp)`);
