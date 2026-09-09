import fs from 'node:fs';
import crypto from 'node:crypto';
import { load } from 'cheerio';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function parseOfficialRoster(bytes) {
const $ = load(bytes.toString('utf8'));
const declarations = $('script:not([src])').toArray().map(el => $(el).text()).filter(text => text.includes('const pokemons ='));
if (declarations.length !== 1) throw new Error('Ambiguous roster declaration');
// The official page embeds JSON; never execute downloaded JavaScript.
const match = declarations[0].match(/^\s*const pokemons = (\[[\s\S]*\]);const noPrefix = /);
if (!match) throw new Error('Official roster encoding changed');
const rows = JSON.parse(match[1]);
const seen = new Set();
for (const row of rows) {
  if (!Array.isArray(row) || row.length !== 3 || !/^\d{4}-\d{3}$/.test(row[0]) || ![0, 1].includes(row[1]) || typeof row[2] !== 'string' || !row[2] || seen.has(row[0])) throw new Error('Invalid or duplicate roster row');
  seen.add(row[0]);
}
if (!rows.length) throw new Error('Empty roster');
return rows.map(([official_id, eligible, label]) => ({ official_id, eligible: eligible === 1, label }));
}

export async function captureOfficialRoster(url, regulationId, parentNoticeUrl) {
const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error('Official roster unavailable: ' + response.status);
const bytes = Buffer.from(await response.arrayBuffer());
const rows = parseOfficialRoster(bytes);
return {
  schema_version: 'champions-official-roster-capture-v1',
  regulation_id: regulationId,
  source_url: url,
  parent_notice_url: parentNoticeUrl,
  captured_at_utc: new Date().toISOString(),
  source_sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  source_bytes: bytes.length,
  competitive_use: false,
  review_status: 'official_roster_captured_mapping_not_approved',
  rows
};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
const artifact = await captureOfficialRoster(
  'https://web-view.app.pokemonchampions.jp/battle/pages/events/rs178066986988lmoqpm/en/pokemon.html',
  'champions_reg_m_b_2026', 'https://champions-news.pokemon-home.com/en/page/776.html');
fs.writeFileSync(new URL('../source/reg-m-b-official-roster.json', import.meta.url), JSON.stringify(artifact, null, 2) + '\n');
console.log(`Captured ${artifact.rows.length} official rows; ${artifact.rows.filter(row => row.eligible).length} eligible. No runtime promotion.`);
}
