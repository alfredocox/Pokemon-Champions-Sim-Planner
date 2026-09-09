import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = fileURLToPath(new URL('../', import.meta.url));
const base = new URL(process.argv[2] || 'http://127.0.0.1:8770/');
assert(['127.0.0.1', 'localhost'].includes(base.hostname) && base.port === '8770', 'Local port 8770 only');
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const directory = fs.mkdtempSync(path.join(artifacts, 'move-context-ui-'));
const original = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(root, 'data.js'), 'utf8') + '\nthis.player = TEAMS.player;', original);
const originalMoves = JSON.parse(JSON.stringify(original.player.members.map(m => ({ name: m.name, moves: m.moves }))));
const report = { schema_version: 'move-context-ui-audit-v1', started_at: new Date().toISOString(),
  scope: 'Local v160 browser startup, move context, review quarantine and import checks; no simulations or DB writes',
  source_hashes: Object.fromEntries(['data.js', 'ui.js', 'move_legality.js', 'index.html', 'pokemon-champion-2026.html', 'generated/champions_move_pools.js']
    .map(file => [file, createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')])), cases: [] };
const write = () => fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n');
const browser = await chromium.launch({ headless: true });
try {
  for (const file of ['pokemon-champion-2026.html', 'index.html']) {
    for (const blocked of [false, true]) {
      const id = `${file === 'index.html' ? 'source' : 'bundle'}-${blocked ? 'missing-pool' : 'normal'}`;
      const row = { id, blocked_pool: blocked, checks: [], page_errors: [], asset_requests: [], blocked_nonread: [], screenshots: [] };
      report.cases.push(row);
      const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } });
      await context.route('**/*', route => {
        const request = route.request();
        const target = new URL(request.url());
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
          row.blocked_nonread.push({ method: request.method(), origin: target.origin, pathname: target.pathname });
          return route.abort();
        }
        if (target.pathname.endsWith('/generated/champions_move_pools.js')) {
          row.asset_requests.push({ url: target.origin + target.pathname, blocked });
          if (blocked) return route.abort();
        }
        return route.continue();
      });
      await context.routeWebSocket('**/*', socket => socket.close());
      const page = await context.newPage();
      page.on('pageerror', error => row.page_errors.push(error.message));
      const check = (name, passed, evidence) => row.checks.push({ name, passed: !!passed, evidence });
      async function screenshot(label) {
        const name = `${id}-${label}.png`;
        await page.screenshot({ path: path.join(directory, name) });
        row.screenshots.push(name);
      }
      try {
        row.url = new URL(file + '?move-context-audit=v160&fresh=1', base).href;
        await page.goto(row.url, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForFunction(() => typeof importFromJsonText === 'function' && !!globalThis.ChampionsSim?.moveLegality);
        row.startup = await page.evaluate(() => ({
          build: csGetBuildId(), poolLoaded: !!ChampionsSim.championsMovePools,
          scripts: [...document.scripts].map(s => s.src).filter(s => s.includes('champions_move_pools.js')),
          verdict: ChampionsSim.moveLegality.isMoveLegalForSpecies('Incineroar', 'U-turn', { learnsetContext: 'champions' }),
          historical: ChampionsSim.moveLegality.isMoveLegalForSpecies('Incineroar', 'U-turn', { learnsetContext: 'historical' }),
          playerMoves: TEAMS.player.members.map(m => ({ name: m.name, moves: m.moves })),
          visible: getVisibleTeamKeys({ includeCustom: true }),
          ready: Object.keys(TEAMS).filter(k => isSimReadyTeam(k, TEAMS[k], { includeCustom: true })),
          selectors: Object.fromEntries(['player-select', 'opponent-select'].map(id => [id,
            [...document.getElementById(id).options].map(o => ({ value: o.value, disabled: o.disabled }))]))
        }));
        const start = row.startup;
        check('v160 startup', /^v2\.2\.160(?:-|$)/.test(start.build), start.build);
        check('external pool requested', row.asset_requests.length > 0 && start.scripts.length > 0, row.asset_requests);
        check('pool availability matches network condition', start.poolLoaded === !blocked, start.poolLoaded);
        check('original player moves unchanged at startup', JSON.stringify(start.playerMoves) === JSON.stringify(originalMoves), start.playerMoves);
        check('original stale moves retained', start.playerMoves.some(m => m.moves.includes('U-turn')) && start.playerMoves.some(m => m.moves.includes('Knock Off')), start.playerMoves);
        check('historical evidence still available', start.historical.legal === true, start.historical);
        check('Champions does not borrow historical acceptance', !start.verdict.legal && start.verdict.verification_status === (blocked ? 'unchecked' : 'known'), start.verdict);
        check('original player excluded from both selectors', Object.values(start.selectors).every(options => !options.some(o => o.value === 'player' && !o.disabled)), start.selectors);
        if (blocked) check('missing pool admits no runnable teams', start.ready.length === 0 && Object.values(start.selectors).every(options => !options.some(o => o.value && !o.disabled)), { ready: start.ready, selectors: start.selectors });

        await page.getByRole('tab', { name: 'Teams', exact: true }).click();
        await page.locator('.teams-filter-chip[data-filter="needs_review"]').click();
        const originalCard = page.locator('.team-full-card').filter({ has: page.locator('[data-team="player"]') }).first();
        check('original player appears in actual Needs review filter', await originalCard.count() === 1);
        if (await originalCard.count()) {
          await originalCard.scrollIntoViewIfNeeded();
          row.review_card_text = await originalCard.innerText();
          check('Needs review renders stale moves unchanged', row.review_card_text.includes('U-turn') && row.review_card_text.includes('Knock Off'));
        }
        await screenshot('needs-review');

        row.imports = await page.evaluate(() => {
          // Only persistence is disabled: parsing, validation and catalog writes are real.
          globalThis.__auditPersistenceSuppressed = [];
          _upsertTeamToDB = (key, team) => globalThis.__auditPersistenceSuppressed.push({ key, format: team.format });
          const member = { name: 'Incineroar', ability: 'Intimidate', item: '', nature: 'Hardy', level: 50,
            evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, moves: ['U-turn'] };
          const input = (name, format, moves) => JSON.stringify({ version: 1, teams: { audit: { name, format, members: [{ ...member, moves }] } } });
          const sv = importFromJsonText(input('Audit explicit SV', 'sv', ['U-turn']));
          const shared = importFromJsonText(input('Audit shared SV', 'sv', ['Protect']));
          const missing = importFromJsonText(input('Audit missing format', undefined, ['Protect']));
          const champion = importFromJsonText(input('Audit explicit Champions', 'champions', ['Protect']));
          const svTeam = TEAMS[sv.keys[0]];
          return { sv, shared, missing, champion, svTeam,
            svContext: svTeam ? csLearnsetOptionsForTeam(svTeam) : null,
            sharedFormat: TEAMS[shared.keys[0]]?.format,
            svMoveVerdict: svTeam ? ChampionsSim.moveLegality.validateMovesForSet(svTeam.members[0], csLearnsetOptionsForTeam(svTeam)) : [],
            suppressedPersistence: globalThis.__auditPersistenceSuppressed };
        });
        const imports = row.imports;
        check('SV JSON retains format and historical context', imports.sv.added === 1 && imports.svTeam?.format === 'sv' && imports.svContext?.learnsetContext === 'historical' && imports.svMoveVerdict.every(v => v.legal), imports.sv);
        check('shared-move SV JSON is not rewritten', imports.shared.added === 1 && imports.sharedFormat === 'sv', imports.shared);
        check('missing JSON format explicitly rejected', imports.missing.added === 0 && imports.missing.skipped === 1 && /format/i.test(JSON.stringify(imports.missing.skippedErrors)), imports.missing);
        check('Champions import respects source availability', blocked ? imports.champion.added === 0 && imports.champion.skipped === 1 : imports.champion.added === 1, imports.champion);

        await page.getByRole('tab', { name: 'Set Editor', exact: true }).click();
        await page.locator('#editor-regulation').selectOption('champions_custom_practice');
        row.editor = await page.evaluate(({ blocked, championKey }) => {
          rebuildTeamSelects();
          if (!blocked) document.getElementById('player-select').value = championKey;
          renderEditorRoster();
          const team = getEditablePlayerTeam();
          const index = team.members.findIndex(m => m.name === 'Incineroar');
          openEditorForm(index);
          refreshEditorMoveLegality();
          return { format: team.format, species: document.getElementById('ed-name').value,
            moves: JSON.parse(document.getElementById('editor-move-list').getAttribute('data-moves') || '[]') };
        }, { blocked, championKey: imports.champion.keys[0] });
        await page.locator('#ed-mv-0').fill('U-');
        row.editor.menuText = await page.locator('#ed-mv-menu-0').innerText();
        check('actual Champions editor datalist uses matching source context', row.editor.species === 'Incineroar' && (blocked ? row.editor.moves.length === 0 : row.editor.moves.includes('Protect') && !row.editor.moves.includes('U-turn')), row.editor);
        check('actual Champions move search does not offer U-turn', !row.editor.menuText.includes('U-turn'), row.editor.menuText);
        await page.locator('#ed-mv-0').scrollIntoViewIfNeeded();
        await screenshot('editor');
        row.svDatalist = await page.evaluate(key => {
          csRenderEditorMoveDatalist('Incineroar', TEAMS[key]);
          return JSON.parse(document.getElementById('editor-move-list').getAttribute('data-moves') || '[]');
        }, imports.sv.keys[0]);
        check('explicit SV datalist helper renders historical U-turn', row.svDatalist.includes('U-turn'), {
          scope: 'Real DOM datalist helper with explicit imported SV team; SV is not selectable in the Champions-only player selector', moves: row.svDatalist });
        const finalMoves = await page.evaluate(() => TEAMS.player.members.map(m => ({ name: m.name, moves: m.moves })));
        check('review and editor did not rewrite original player', JSON.stringify(finalMoves) === JSON.stringify(originalMoves), finalMoves);
        check('no simulations created', await page.locator('#replay-list .replay-card').count() === 0);
        check('no JavaScript page errors', row.page_errors.length === 0, row.page_errors);
      } catch (error) {
        row.error = error.stack || String(error);
        check('case completed', false, error.message);
        await screenshot('failure').catch(() => {});
      } finally {
        row.passed = row.checks.every(c => c.passed);
        write();
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  report.finished_at = new Date().toISOString();
  report.passed = report.cases.length === 4 && report.cases.every(c => c.passed);
  write();
}
console.log(JSON.stringify({ directory, passed: report.passed, cases: report.cases.map(c => ({ id: c.id, passed: c.passed, failures: c.checks.filter(k => !k.passed), error: c.error })) }, null, 2));
if (!report.passed) process.exitCode = 1;
