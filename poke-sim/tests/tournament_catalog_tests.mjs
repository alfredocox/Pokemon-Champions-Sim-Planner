import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { parseBracket, parseRoster, parseSheet, EVENT } from '../tools/fetch-worlds-team-candidates.mjs';
import { validateCatalog, generateCatalog } from '../tools/build-tournament-catalog.mjs';

const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const catalog = JSON.parse(read('source/worlds-2026-masters-top-cut.json'));
validateCatalog(catalog);
assert.equal(catalog.format, 'doubles');
assert.equal(catalog.teams.length, 13);
assert.equal(catalog.teams.flatMap(t => t.members).length, 78);
assert.equal(read('generated/tournament_catalog.js'), generateCatalog(catalog), 'generated data drift');
assert.ok(read('sw.js').includes("'./generated/tournament_catalog.js'"), 'source-page offline cache must include review catalog');
assert.ok(read('index.html').includes('<script src="generated/tournament_catalog.js"></script>'));
assert.ok(read('tools/build-bundle.py').includes('sanitize_inline_js(tournament_catalog)'));
const context = { TEAMS: [{ id: 'existing-regression' }] };
vm.createContext(context);
vm.runInContext(read('generated/tournament_catalog.js'), context);
assert.equal(JSON.stringify(context.TEAMS), '[{"id":"existing-regression"}]', 'review candidates must not enter runtime TEAMS');
for (const mutate of [
  c => c.format = 'singles',
  c => delete c.format,
  c => c.teams[0].format = 'singles',
  c => c.teams[0].members[0].stat_points = { hp: 32 },
  c => c.teams[0].members[0].member_id = c.teams[1].members[0].member_id,
  c => c.teams[0].simulation_status = 'approved',
  c => c.teams[0].source.url = 'javascript:alert(1)',
  c => c.teams[1].id = c.teams[0].id,
  c => c.teams[0].members[0].moves.pop()
]) {
  const invalid = structuredClone(catalog);
  mutate(invalid);
  assert.throws(() => validateCatalog(invalid));
}
assert.throws(() => parseBracket('<table><tbody></tbody></table>'));
assert.throws(() => parseSheet('<div class="pokemon">Not a sheet</div>', 'id'));
const card = '<div class="pokemon"><img src="sprite.png">Gengar <b>EN</b><br><b>Ability:</b> Cursed Body <b>Held Item:</b> Focus Sash<br><b>Stat Alignment:</b> Timid<br><h5><span class="badge">Protect</span><span class="badge">Shadow Ball</span><span class="badge">Sludge Bomb</span><span class="badge">Taunt</span></h5></div>';
const parsed = parseSheet(card.repeat(6), 'fixture');
assert.equal(parsed[0].species, 'Gengar');
assert.equal(parsed[0].ability, 'Cursed Body');
assert.equal(parsed[0].stat_alignment, 'Timid');
assert.equal(parsed[0].stat_points, null);
assert.equal(parsed[5].member_id, 'fixture:slot-6');
const rosterRow = division => `<tr><td>hidden</td><td>Test</td><td>Player</td><td>US</td><td>${division}</td><td>trainer</td><td><a href="/teamlist/public/${EVENT}/test">View</a></td></tr>`;
assert.equal(parseRoster('<table>' + rosterRow('Masters') + rosterRow('Junior') + '</table>').length, 1);
const categories = JSON.parse(read('competitive_benchmark_manifest.json')).categories;
assert.equal(JSON.parse(read('competitive_benchmark_manifest.json')).competitive_format, 'doubles');
assert.deepEqual(categories.map(c => c.id), ['tournament_candidates', 'permanent_regressions', 'mechanics_edge_cases']);
for (const category of categories) assert.ok(existsSync(new URL('../' + category.source, import.meta.url)));
const render = read('ui.js').split('function csRenderTournamentCatalog() {')[1].split('\nfunction renderOverviewTab()')[0];
vm.runInContext('function _escapeHtml(s) { return String(s).replace(/</g, "&lt;").replace(/>/g, "&gt;"); } function csRenderTournamentCatalog() {' + render, context);
context.CS_TOURNAMENT_CATALOG.teams[0].player = '<script>unsafe</script>';
const html = vm.runInContext('csRenderTournamentCatalog()', context);
assert.ok(!html.includes('<script>unsafe'));
assert.ok(html.includes('Exact-stat simulation blocked'));
assert.ok(html.includes('Masters Doubles Top Cut'));
assert.equal((html.match(/<details /g) || []).length, 13);
assert.ok(!html.includes('onclick=') && !html.includes('simulateBattle'));
console.log('Tournament catalog: 13 teams / 78 stable members; provenance, parser drift, fail-closed stats, generation, isolation, UI escaping and benchmark categories pass.');
