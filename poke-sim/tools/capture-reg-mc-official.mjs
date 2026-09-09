import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { captureOfficialRoster } from './capture-reg-mb-official.mjs';

const notice = 'https://champions-news.pokemon-home.com/en/page/816.html';
const roster = 'https://web-view.app.pokemonchampions.jp/battle/pages/events/rs178713870219xeaaio/en/pokemon.html';
const response = await fetch(notice, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error('Official notice unavailable: ' + response.status);
const bytes = Buffer.from(await response.arrayBuffer());
if (!bytes.toString('utf8').includes('rs178713870219xeaaio')) throw new Error('Notice no longer links the expected roster');
const artifact = await captureOfficialRoster(roster, 'champions_reg_m_c_2026', notice);
artifact.parent_notice_sha256 = createHash('sha256').update(bytes).digest('hex');
const previous = JSON.parse(fs.readFileSync(new URL('../source/reg-m-b-official-roster.json', import.meta.url)));
const before = new Map(previous.rows.map(row => [row.official_id, row]));
const after = new Map(artifact.rows.map(row => [row.official_id, row]));
artifact.previous_capture_sha256 = createHash('sha256').update(JSON.stringify(previous)).digest('hex');
artifact.identity_delta = {
  added: artifact.rows.filter(row => !before.has(row.official_id)),
  removed: previous.rows.filter(row => !after.has(row.official_id)),
  changed: artifact.rows.filter(row => before.has(row.official_id) && JSON.stringify(row) !== JSON.stringify(before.get(row.official_id)))
};
fs.writeFileSync(new URL('../source/reg-m-c-official-roster.json', import.meta.url), JSON.stringify(artifact, null, 2) + '\n');
console.log(JSON.stringify({ rows: artifact.rows.length, added: artifact.identity_delta.added.length,
  removed: artifact.identity_delta.removed, changed: artifact.identity_delta.changed }, null, 2));
