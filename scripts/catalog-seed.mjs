// writes lib/server/catalog-seed.json: every 42cursus project with its xp and whether it's a
// group one (same rule as catalog() in lib/server/projects.ts). the app answers with this
// copy while its live list, a ~30s fetch, isn't there yet; refresh it now and then:
//   node --env-file=.env scripts/catalog-seed.mjs
import fs from 'node:fs';

const API = 'https://api.intra.42.fr';
const CURSUS = 21;

const res = await fetch(`${API}/oauth/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'client_credentials', client_id: process.env.FT_UID, client_secret: process.env.FT_SECRET }),
});
if (!res.ok) throw new Error(`auth failed: ${res.status}`);
const { access_token } = await res.json();

const list = [];
for (let page = 1; ; page++) {
  const r = await fetch(`${API}/v2/cursus/${CURSUS}/projects?per_page=100&page=${page}`, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!r.ok) throw new Error(`page ${page}: ${r.status}`);
  const batch = await r.json();
  list.push(...batch);
  if (batch.length < 100) break;
  await new Promise((s) => setTimeout(s, 600)); // the app's limit is 2 calls a second
}

const seed = list
  .map((p) => {
    const sessions = (p.project_sessions || []).filter((s) => s.cursus_id == null || s.cursus_id === CURSUS);
    return { id: p.id, name: p.name, xp: p.difficulty || 0, group: sessions.length > 0 && sessions.every((s) => s.solo === false) };
  })
  .sort((a, b) => a.id - b.id);
fs.writeFileSync(new URL('../lib/server/catalog-seed.json', import.meta.url), '[\n' + seed.map((p) => JSON.stringify(p)).join(',\n') + '\n]\n');
console.log(`${seed.length} projects (${seed.filter((p) => p.group).length} group ones) written to lib/server/catalog-seed.json`);
