const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const appShell = fs.readFileSync(path.join(ROOT, 'app_shell.js'), 'utf8');
const data = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try { fn(); pass++; console.log('  PASS ' + name); }
  catch (err) { fail++; console.error('  FAIL ' + name + ': ' + err.message); }
}
function truthy(value, msg) { if (!value) throw new Error(msg); }

console.log('\n=== sprite fallback chain tests ===\n');

T('1. GIF-first source remains the primary visual path', () => {
  truthy(data.includes("const SHOWDOWN_SPRITE_BASE = 'https://play.pokemonshowdown.com/sprites/ani'"), 'animated sprite base should remain primary');
  truthy(data.includes('function showdownAnimatedSpriteUrl'), 'animated sprite URL helper missing');
});

T('2. app shell emits ordered fallback URL chain', () => {
  truthy(appShell.includes('function csSpriteFallbackUrls(name)'), 'fallback URL chain helper missing');
  truthy(appShell.includes('data-fallback-srcs'), 'fallback src list attribute missing');
  truthy(appShell.includes('JSON.stringify(urls)'), 'fallback list should be serialized into markup');
});

T('3. broken form GIFs can recover to exact static and base-form assets', () => {
  truthy(appShell.includes("'Charizard-Mega-X': 'charizard-megax'"), 'Mega Charizard X exact static alias missing');
  truthy(appShell.includes("'-Mega-X'"), 'Mega-X base fallback suffix missing');
  truthy(appShell.includes('csSpriteStaticUrlFromSlug(exactSlug)'), 'exact static fallback should be first');
  truthy(appShell.includes('csSpriteAniUrlFromSlug(baseSlug)'), 'base animated fallback missing');
  truthy(appShell.includes('csSpriteStaticUrlFromSlug(baseSlug)'), 'base static fallback missing');
});

T('4. error handler advances through every fallback before dimming', () => {
  truthy(appShell.includes('while (stage < fallbacks.length)'), 'handler should walk fallback list');
  truthy(appShell.includes("img.setAttribute('data-fallback-stage', String(stage))"), 'handler should persist fallback stage');
  truthy(appShell.includes("img.style.opacity = '.3'"), 'final degraded state should still be visible');
});

console.log(`\nsprite fallback chain: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
