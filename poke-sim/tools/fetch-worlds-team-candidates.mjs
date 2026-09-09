import { load } from 'cheerio';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const EVENT = 'WCS02wAQpCIaqFmXxER4';
export const ROSTER = `https://rk9.gg/roster/${EVENT}`;
export const BRACKET = 'https://standings.limitlessvgc.com/0036/pairings?round=12';
const clean = value => value.replace(/\s+/g, ' ').trim();
const key = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function parseBracket(html) {
  const $ = load(html);
  const names = $('tbody a[href*="/player/"]').toArray().map(a => clean($(a).find('span.text-center').first().text()));
  if (names.some(n => !n) || new Set(names.map(key)).size !== names.length || names.length !== 13) {
    throw new Error('Expected exactly 13 unique Masters top-cut entrants; review bracket/source drift');
  }
  return names;
}

export function parseRoster(html) {
  const $ = load(html);
  return $('tr').toArray().flatMap(tr => {
    const cells = $(tr).children('td');
    if (clean(cells.eq(4).text()) !== 'Masters') return [];
    const href = cells.find(`a[href^="/teamlist/public/${EVENT}/"]`).attr('href');
    return href ? [{ player: clean(cells.eq(1).text() + ' ' + cells.eq(2).text()), url: new URL(href, ROSTER).href }] : [];
  });
}

export function parseSheet(html, teamId) {
  const $ = load(html);
  const cards = $('div.pokemon').toArray().filter(el => $(el).find('b').toArray().some(b => clean($(b).text()) === 'EN'));
  if (cards.length !== 6) throw new Error('Expected six English Pokemon rows');
  return cards.map((el, index) => {
    const card = $(el);
    function field(label) {
      const node = card.find('b').toArray().find(b => clean($(b).text()) === label);
      if (!node) throw new Error(`Missing ${label}`);
      let value = '';
      for (let next = node.nextSibling; next && next.type === 'text'; next = next.nextSibling) value += next.data;
      return clean(value);
    }
    const languageNode = card.find('b').toArray().find(b => clean($(b).text()) === 'EN');
    let species = '';
    for (const child of el.children) {
      if (child === languageNode) break;
      if (child.type === 'text') species += child.data;
    }
    const member = {
      member_id: `${teamId}:slot-${index + 1}`,
      registered_slot: index + 1,
      species: clean(species),
      ability: field('Ability:'), item: field('Held Item:'),
      stat_alignment: field('Stat Alignment:'),
      moves: card.find('h5 .badge').toArray().map(m => clean($(m).text())),
      stat_points: null,
      battle_stats: null
    };
    if (!member.species || !member.ability || !member.item || !member.stat_alignment || member.moves.length !== 4 || member.moves.some(m => !m)) {
      throw new Error('Incomplete or changed team-sheet structure');
    }
    return member;
  });
}

async function capture(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  return { html: bytes.toString('utf8'), source: { url, retrieved_at: new Date().toISOString(), sha256: createHash('sha256').update(bytes).digest('hex') } };
}

export async function main() {
  const bracket = await capture(BRACKET);
  const roster = await capture(ROSTER);
  const entrants = parseBracket(bracket.html);
  const players = parseRoster(roster.html);
  const teams = [];
  for (const player of entrants) {
    const matches = players.filter(row => key(row.player) === key(player));
    if (matches.length !== 1) throw new Error(`Ambiguous/missing roster identity: ${player}`);
    const sheet = await capture(matches[0].url);
    const id = `worlds-2026-masters-${new URL(matches[0].url).pathname.split('/').pop()}`;
    teams.push({ id, player, stage: 'top_cut', final_placement: null,
      verification: 'published_open_sheet', simulation_status: 'blocked_missing_stats_and_ruleset_review',
      source: sheet.source, members: parseSheet(sheet.html, id) });
    console.log(`Captured ${player}`);
  }
  const catalog = {
    schema_version: 1, format: 'doubles', event_id: EVENT, event_name: '2026 Pokemon VGC World Championship',
    event_dates: ['2026-08-28', '2026-08-30'], division: 'Masters',
    checked_at: new Date().toISOString(), status: 'review_only_not_runtime_promoted',
    ruleset: { name: null, verification: 'needs_official_ruleset_review' },
    placement_scope: 'Round 12 top-cut entrants including three byes; not final standings',
    sources: [bracket.source, roster.source],
    missing_fields_policy: 'Unknown stat points remain null. No guessed spreads, automatic TEAMS insertion, DB promotion, trusted coaching, or exact-stat benchmarks.',
    teams
  };
  // Write only after every identity and sheet passes: a failed fetch cannot publish a partial catalog.
  writeFileSync(new URL('../source/worlds-2026-masters-top-cut.json', import.meta.url), JSON.stringify(catalog, null, 2) + '\n');
  console.log(`${teams.length} review-only teams; no runtime or database writes.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
