import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const url = new URL(process.argv[2] || 'http://127.0.0.1:8770/pokemon-champion-2026.html?team-review=v160&fresh=1');
assert(['127.0.0.1', 'localhost'].includes(url.hostname), 'Local candidate only');
const directory = fs.mkdtempSync(path.resolve('artifacts/team-review-'));
const browser = await chromium.launch({ headless: true });
const result = { url: url.href, cases: [] };
try {
  for (const [width, touch] of [[1440, false], [620, false], [390, false], [320, false], [390, true]]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, hasTouch: touch, isMobile: touch });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort());
    await page.goto(url.href, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Teams', exact: true }).click();
    const cards = page.locator('#teams-grid .team-full-card');
    assert(await cards.count() > 0);
    assert.equal(await page.locator('#replay-list .replay-card').count(), 0, 'Reviewing teams must not simulate');
    const badges = await cards.locator('.tfcard-badges').allTextContents();
    assert(badges.every(text => !/(?:^|\s)(?:LEGAL|ILLEGAL)(?:\s|$)/.test(text)), 'Bare legality claim returned');
    const rows = await cards.locator('.bring-pool-row').evaluateAll(nodes => nodes.map(node => {
      const info = node.querySelector('.poke-full-info').getBoundingClientRect();
      const button = node.querySelector('.team-mon-detail-btn').getBoundingClientRect();
      const row = node.getBoundingClientRect();
      return { infoWidth: info.width, infoRight: info.right, rowRight: row.right, infoBottom: info.bottom, buttonTop: button.top, buttonRight: button.right };
    }));
    for (const row of rows) {
      assert(row.infoWidth >= 120, `Collapsed info at ${width}: ${JSON.stringify(row)}`);
      assert(row.infoRight <= row.rowRight + 1 && row.buttonRight <= row.rowRight + 1, 'Row overflow');
      if (width <= 620) assert(row.buttonTop >= row.infoBottom - 1, 'Details button must wrap below text');
    }
    await cards.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(directory, `${width}-${touch ? 'touch' : 'mouse'}.png`) });
    if (rows.length) {
      await cards.first().locator('.team-mon-detail-btn').first().click();
      assert(await page.locator('.team-detail-modal').isVisible(), 'Details must remain usable');
    }
    assert.deepEqual(errors, []);
    result.cases.push({ width, touch, cards: badges.length, rows: rows.length, minimumInfoWidth: rows.length ? Math.min(...rows.map(row => row.infoWidth)) : null, errors });
    await page.close();
  }
  fs.writeFileSync(path.join(directory, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ directory, ...result }));
} finally {
  await browser.close();
}
