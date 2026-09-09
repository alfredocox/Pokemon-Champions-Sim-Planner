// Run with Playwright available through NODE_PATH; targets a local candidate only.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto('http://127.0.0.1:8770/pokemon-champion-2026.html?retro-qa=1');
      await page.getByRole('tab', { name: 'Home', exact: true }).click();
      const scene = page.locator('.retro-screen');
      await scene.waitFor({ state: 'visible' });
      await scene.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll('.retro-fighter')].every(i => i.complete && i.naturalWidth > 0));
      const box = await scene.boundingBox();
      assert(box.width > 150 && box.x >= 0 && box.x + box.width <= width);
      const motion = () => page.locator('.retro-gengar').evaluate(e => getComputedStyle(e).transform);
      const first = await motion();
      await page.waitForTimeout(2100);
      assert.notEqual(await motion(), first);
      await page.locator('#retro-intro-pause').check();
      assert.equal(await page.locator('.retro-gengar').evaluate(e => getComputedStyle(e).animationPlayState), 'paused');
      await page.waitForTimeout(250);
      const paused = await motion();
      await page.waitForTimeout(400);
      assert.equal(await motion(), paused);
      await scene.screenshot({ path: `../../tmp/retro-intro-${width}.png` });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await page.locator('.retro-gengar').evaluate(e => getComputedStyle(e).animationName), 'none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      console.log(`PASS ${width}px: sprites loaded, scene fits, animation moves, pause freezes, reduced motion disables`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
