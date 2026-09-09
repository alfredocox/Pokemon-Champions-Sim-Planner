// Guard the homepage/news/source-trust layer.
// These tests protect the evidence-bound source policy from quiet regressions.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const newsSources = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'news_sources.json'), 'utf8'));

const ctx = { window: {}, self: null, globalThis: {} };
ctx.self = ctx.window;
ctx.globalThis = ctx.window;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'generated', 'news_feed.js'), 'utf8'), ctx, { filename: 'generated/news_feed.js' });
vm.runInContext(fs.readFileSync(path.join(ROOT, 'generated', 'source_registry.js'), 'utf8'), ctx, { filename: 'generated/source_registry.js' });

const feed = ctx.window.CHAMPIONS_NEWS_FEED || {};
const registry = ctx.window.CHAMPIONS_SOURCE_REGISTRY || {};

let pass = 0;
let fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function truthy(value, message) {
  if (!value) throw new Error(message || 'expected truthy');
}
function eq(actual, expected, message) {
  if (actual !== expected) throw new Error((message || 'not equal') + ` expected=${expected} got=${actual}`);
}

console.log('\n=== news/source trust guard tests ===\n');

T('1. generated homepage news blocks non-Champion Scarlet/Violet/Tera Raid terms', () => {
  truthy(Array.isArray(feed.items), 'feed items missing');
  const blocked = /\b(Scarlet|Violet|Tera Raid|Unrivaled)\b/i;
  for (const item of feed.items) {
    const text = [item.title, item.detail, item.url, item.category].join(' ');
    truthy(!blocked.test(text), 'blocked non-Champion news leaked into feed: ' + text);
  }
});

T('1b. generated homepage news does not use known-broken Champion image paths', () => {
  const blockedImages = /battle-stadium\.jpg|game-screenshot-2\.png/i;
  for (const item of feed.items || []) {
    truthy(item.image, 'feed item image missing: ' + item.title);
    truthy(!blockedImages.test(String(item.image)), 'known-broken news image leaked into feed: ' + item.image);
  }
});

T('1c. generated homepage news prefers source-backed article thumbnails over local fallback', () => {
  const items = feed.items || [];
  truthy(items.length > 0, 'feed items missing');
  const enriched = items.filter(item => item.image_source === 'wordpress_featured_media' || item.image_source === 'article_metadata' || item.image_source === 'rss_media');
  truthy(enriched.length >= 1, 'expected at least one source-backed article thumbnail');
  for (const item of enriched) {
    truthy(/^https?:\/\//i.test(String(item.image || '')), 'source-backed thumbnail should be remote article media: ' + item.image);
    truthy(!/assets\/news-card\.svg/i.test(String(item.image || '')), 'source-backed thumbnail should not be local fallback');
  }
});

T('2. enabled RSS sources must carry Champion include filters and non-Champion excludes', () => {
  const enabledRss = (newsSources.sources || []).filter(source => source.enabled && (source.type === 'rss' || source.type === 'atom'));
  truthy(enabledRss.length >= 1, 'expected at least one enabled RSS/Atom source');
  for (const source of enabledRss) {
    const include = (source.include_keywords || []).join(' ');
    const exclude = (source.exclude_keywords || []).join(' ');
    truthy(/Champion|Champions|VGC|Regulation|Monthly Challenge|Champions Arena/i.test(include), 'enabled source lacks Champion include filters: ' + source.id);
    truthy(/Scarlet/.test(exclude) && /Violet/.test(exclude) && /Tera Raid/.test(exclude), 'enabled source lacks non-Champion excludes: ' + source.id);
  }
});

T('3. official ingestion has an explicit adapter and exact source hosts', () => {
  const source = newsSources.sources.find(source => source.id === 'champions-official');
  eq(source.type, 'champions_index');
  eq(source.enabled, true);
  eq(source.url, 'https://champions.pokemon.com/en-us/news/');
  truthy(source.fetch_hosts.includes('champions.pokemon.com'));
  for (const item of feed.items) eq(item.rules_authority, false, 'news is never rules approval');
});

T('4. source registry preserves Showdown as reference only, not Champion truth', () => {
  const showdown = (registry.tiers || []).find(tier => tier.id === 'showdown_reference');
  truthy(showdown, 'showdown_reference tier missing');
  eq(showdown.trust, 'baseline_reference_not_champion_truth', 'Showdown trust label drifted');
  const notFor = (showdown.not_for || []).join(' ');
  truthy(/Champion legality/i.test(notFor), 'Showdown not_for must block Champion legality truth claims');
  truthy(/Champion-only mechanics/i.test(notFor), 'Showdown not_for must block Champion-only mechanics claims');
});

T('5. competitive secondary sources remain meta/news only', () => {
  const competitive = (registry.tiers || []).find(tier => tier.id === 'competitive_secondary');
  truthy(competitive, 'competitive_secondary tier missing');
  eq(competitive.trust, 'meta_signal_only', 'competitive source trust label drifted');
  const notFor = (competitive.not_for || []).join(' ');
  truthy(/mechanics truth/i.test(notFor), 'competitive sources must not become mechanics truth');
  truthy(/official legality truth/i.test(notFor), 'competitive sources must not become legality truth');
});

T('6. unknown Champion truth remains needs_verification by policy', () => {
  truthy(/needs_verification/i.test(JSON.stringify(registry)), 'registry must keep needs_verification language');
  truthy(/Official and in-game sources define Champion truth/i.test(registry.policy || ''), 'registry policy must preserve Champion truth hierarchy');
});

console.log(`\nnews/source trust guard: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
