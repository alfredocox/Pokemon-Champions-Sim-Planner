import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { captureVisibleReplay } from './capture-visible-replay.mjs';
import { compareVisibleReplay, ingestDirectory } from './compare-visible-replay.mjs';
import { assertRequestedReplay, assertReplayContinuity } from './browser-replay-contract.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = new URL(process.argv[2] || 'http://127.0.0.1:8770/pokemon-champion-2026.html?browser-audit=v160&fresh=1');
assert(['127.0.0.1', 'localhost'].includes(url.hostname), 'This audit is local-only');
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const directory = fs.mkdtempSync(path.join(artifacts, 'browser-replay-'));
const write = (name, value) => fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2) + '\n');
const inventory = { schema_version: 'champions-visual-inventory-v1', expected_game_count: 0, cases: [], runs: [] };
const diagnostics = { url: url.href, page_errors: [], blocked_nonread_requests: [] };
const auditMemberEdit = process.env.AUDIT_MEMBER_EDIT === '1';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
page.on('pageerror', error => diagnostics.page_errors.push(error.message));
await page.route('**/*', route => {
  const request = route.request();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
    diagnostics.blocked_nonread_requests.push({ method: request.method(), origin: new URL(request.url()).origin });
    return route.abort();
  }
  return route.continue();
});

async function capture(id, kind, original) {
  const cards = page.locator('#replay-list .replay-card');
  assert.equal(await cards.count(), inventory.expected_game_count, 'Every retained game must belong to the inspected runs');
  const card = cards.first();
  if (!await card.evaluate(el => el.classList.contains('open'))) await card.locator('.replay-card-hdr').click();
  const downloadPromise = page.waitForEvent('download');
  await card.getByRole('button', { name: 'Download JSON', exact: true }).click();
  const download = await downloadPromise;
  const downloadPath = path.join(directory, `${id}.download.json`);
  await download.saveAs(downloadPath);
  const exported = JSON.parse(fs.readFileSync(downloadPath, 'utf8'));
  const log = exported;
  const visual = await page.evaluate(captureVisibleReplay);
  const coaching = await card.locator('.replay-coach-summary').allTextContents();
  assert(!coaching.some(text => /execution rather than|clearer line on the turning turn/.test(text)), 'Unsupported causal replay coaching returned');
  write(`${id}.coaching.json`, { summaries: coaching });
  write(`${id}.log.json`, log);
  write(`${id}.visual.json`, visual);
  inventory.cases.push({ id, kind, seed: log.seed });
  write('capture-inventory.json', inventory);
  await card.locator('.replay-card-hdr').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(directory, `${id}-start.png`) });
  await card.locator('.replay-stadium').last().scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(directory, `${id}-last.png`) });
  const fieldIndex = (log.turnLog || []).findIndex(row => {
    const field = row.post && row.post.field;
    const speed = row.post && row.post.speed_control;
    return (field && (field.weather || field.terrain || field.trick_room > 0)) ||
      (speed && Object.values(speed).some(side => side && (side.tailwind_turns > 0 || Object.values(side.screens || {}).some(turns => turns > 0))));
  });
  if (fieldIndex >= 0) {
    await card.locator('.replay-turn-row').nth(fieldIndex).locator('.replay-turn-main').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(directory, `${id}-field.png`) });
  }
  const report = compareVisibleReplay(log, visual);
  write(`${id}.comparison.json`, report);
  if (original) {
    assertReplayContinuity(original, exported);
  }
  assert.equal(report.issues.length, 0, JSON.stringify(report.issues));
  return log;
}

async function run(id) {
  const selection = await page.locator('#player-select, #opponent-select, #sim-regulation, #sim-count').evaluateAll(els => Object.fromEntries(els.map(el => [el.id, el.value])));
  await page.locator('#run-sim-btn').click();
  await page.locator('#results-section').waitFor({ state: 'visible', timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector('#run-sim-btn').disabled);
  const result = await page.locator('#results-sub').innerText();
  const totals = await page.locator('#stat-wins, #stat-losses, #stat-draws').allTextContents();
  assert.equal(totals.reduce((sum, text) => sum + Number(text), 0), 1, 'Bo1 one-series run must show exactly one game');
  inventory.expected_game_count++;
  inventory.runs.push({ id, selection, result, visible_totals: totals });
  write('capture-inventory.json', inventory);
  await page.locator('#result-view-replays-btn').click();
  const log = await capture(id, 'simulation');
  assertRequestedReplay(log, selection);
  return log;
}

async function inspectReplayLayouts() {
  const originalTheme = await page.locator('html').getAttribute('data-theme');
  const layouts = [];
  for (const theme of ['light', 'dark']) {
    await page.locator('html').evaluate((el, value) => el.setAttribute('data-theme', value), theme);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      const card = page.locator('#replay-list .replay-card').first();
      await card.locator('.replay-stadium').last().scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(directory, `replay-${theme}-${width}.png`) });
      const measurements = await card.evaluate(root => {
        const rgb = value => (value.match(/[\d.]+/g) || []).map(Number);
        const luminance = color => color.slice(0, 3).map(c => {
          const channel = c / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
        const text = [...root.querySelectorAll('.replay-turn-main,.replay-roster-meta,.replay-stadium-title,.replay-stadium-side-title,.replay-play-row b')];
        return text.filter(el => el.getClientRects().length).map(el => {
          const ancestors = [];
          for (let node = el; node; node = node.parentElement) ancestors.unshift(node);
          let background = [255, 255, 255];
          const unsupported = [];
          for (const node of ancestors) {
            const style = getComputedStyle(node);
            if (style.backgroundImage !== 'none') unsupported.push('background-image');
            if (Number(style.opacity) !== 1) unsupported.push('opacity');
            const color = rgb(style.backgroundColor);
            const alpha = color.length === 4 ? color[3] : 1;
            background = background.map((c, i) => color[i] * alpha + c * (1 - alpha));
          }
          const foreground = rgb(getComputedStyle(el).color);
          const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
          return { selector: el.className, text: el.textContent.trim().slice(0, 100), contrast: (values[0] + 0.05) / (values[1] + 0.05), unsupported };
        });
      });
      // Gradient ancestors make this a diagnostic estimate, not an accessibility certification.
      const lowContrast = measurements.filter(item => item.contrast < 4.5);
      const overflow = await card.locator('.replay-stadium-mon').evaluateAll(els => els.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent.trim().slice(0, 100)));
      layouts.push({ theme, width, text_samples: measurements.length, low_contrast: lowContrast, overflowing_pokemon: overflow });
      write('layout-checks.json', layouts);
      assert(measurements.length > 0, 'Replay contrast check must inspect text');
      assert.equal(lowContrast.length, 0, `${theme}/${width}: ${JSON.stringify(lowContrast.slice(0, 5))}`);
      assert.equal(overflow.length, 0, `${theme}/${width}: overflowing Pokemon details: ${JSON.stringify(overflow)}`);
    }
  }
  await page.locator('html').evaluate((el, value) => value === null ? el.removeAttribute('data-theme') : el.setAttribute('data-theme', value), originalTheme);
}

async function prepareEditedTeam() {
  const fixture = await page.evaluate(() => {
    _upsertTeamToDB = () => {};
    const team = JSON.parse(JSON.stringify(TEAMS.mega_dragonite));
    team.name = 'Member identity browser fixture';
    team.members.forEach((member, index) => {
      member.member_id = 'browser-member-' + index;
      member.metadata = { registration: index };
    });
    return team;
  });
  await page.locator('#bulk-import-file').setInputFiles({ name: 'identity-team.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, teams: { fixture } })) });
  await page.waitForFunction(name => Object.values(TEAMS).some(team => team.name === name), fixture.name);
  const key = await page.evaluate(name => Object.keys(TEAMS).find(key => TEAMS[key].name === name), fixture.name);
  await page.getByRole('tab', { name: 'Teams', exact: true }).click();
  await page.locator('[data-filter="custom"]').click();
  await page.locator('.edit-card-btn').evaluateAll((buttons, key) => buttons.find(button => button.dataset.team === key).click(), key);
  const reversed = await page.evaluate(key => exportTeamToPaste({ ...TEAMS[key], members: TEAMS[key].members.slice().reverse() }), key);
  await page.locator('#showdown-paste').fill(reversed);
  await page.locator('#do-import-btn').click();
  await page.waitForFunction(() => document.getElementById('import-status').textContent.includes('Loaded'));
  const saved = await page.evaluate(key => JSON.parse(JSON.stringify(TEAMS[key])), key);
  assert.deepEqual(saved.members.map(member => member.member_id), fixture.members.map(member => member.member_id).reverse());
  assert.deepEqual(saved.members.map(member => member.metadata), fixture.members.map(member => member.metadata).reverse());
  write('edited-team-identity.json', { key, before: fixture, after: saved });
  await page.locator('#close-import').click();
  await page.reload({ waitUntil: 'networkidle' });
  const restored = await page.evaluate(key => TEAMS[key].members.map(member => ({ id: member.member_id, metadata: member.metadata })), key);
  assert.deepEqual(restored, saved.members.map(member => ({ id: member.member_id, metadata: member.metadata })));
  write('edited-team-reload.json', { key, restored });
  return { key, members: saved.members };
}

try {
  await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  if (auditMemberEdit) await page.waitForLoadState('networkidle');
  const edited = auditMemberEdit ? await prepareEditedTeam() : null;
  const playerKey = edited ? edited.key : 'mega_dragonite';
  await page.locator('#tab-btn-simulator').click();
  diagnostics.build = await page.locator('#build-version').innerText();
  assert.equal(await page.locator('#replay-list .replay-card').count(), 0, 'Fresh page must not manufacture replay evidence');
  await page.locator('#sim-regulation').selectOption('champions_custom_practice');
  await page.locator('#player-select').selectOption(playerKey);
  await page.locator('#opponent-select').selectOption('mega_altaria');
  await page.locator('#bo-picker [data-bo="1"]').click();
  await page.locator('#sim-count').selectOption('1');
  const first = await run('baseline');
  if (edited) {
    assert.equal(first.participants.player.length, 4);
    for (const participant of first.participants.player) {
      const member = edited.members.find(member => member.member_id === participant.member_id);
      assert(member, 'Exported battle participant lost its saved member ID');
      assert.equal(participant.item, member.item || '');
    }
  }
  await page.locator('#tab-btn-simulator').click();
  await page.locator('#swap-teams-btn').click();
  assert.equal(await page.locator('#player-select').inputValue(), 'mega_altaria');
  assert.equal(await page.locator('#opponent-select').inputValue(), playerKey);
  await page.locator('#tab-btn-replays').click();
  await capture('after-swap-continuity', 'continuity', first);
  await page.locator('#tab-btn-simulator').click();
  await run('swapped');
  await inspectReplayLayouts();
  const report = ingestDirectory(directory);
  write('comparison-report.json', report);
  assert.equal(diagnostics.page_errors.length, 0, 'Browser page errors occurred');
  console.log(JSON.stringify({ directory, games: report.expected_game_count, pairs: report.pairs, turns: report.turns, mismatch_pairs: report.mismatch_pairs, page_errors: diagnostics.page_errors }));
} catch (error) {
  write('failure.json', { message: error.message, stack: error.stack });
  await page.screenshot({ path: path.join(directory, 'failure.png') }).catch(() => {});
  console.error(JSON.stringify({ directory, error: error.message }));
  process.exitCode = 1;
} finally {
  write('diagnostics.json', diagnostics);
  await browser.close();
}
