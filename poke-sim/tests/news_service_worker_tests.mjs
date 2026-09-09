import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
async function probe(file, { offline = false, status = 200, cached = true } = {}) {
  const handlers = {};
  const writes = [];
  const requests = [];
  const pending = [];
  const ctx = {
    URL, Response, console,
    self: { addEventListener: (name, fn) => { handlers[name] = fn; }, location: { origin: 'https://app.test' } },
    importScripts() {},
    caches: { match: async () => cached ? new Response('cached') : undefined,
      open: async () => { await new Promise(resolve => setTimeout(resolve, 10)); return { put: async (request, response) => writes.push(await response.text()) }; } },
    fetch: async (request, options) => { requests.push({ request, options }); if (offline) throw new Error('offline'); return new Response('fresh', { status }); }
  };
  vm.runInNewContext(code, ctx);
  let response;
  handlers.fetch({ request: { url: `https://app.test/${file}`, mode: 'cors', destination: 'script', method: 'GET' },
    respondWith: value => { response = value; }, waitUntil: promise => pending.push(promise) });
  assert.ok(response, `${file} must register respondWith without throwing`);
  const result = await response;
  const text = await result.text();
  await Promise.all(pending);
  return { text, status: result.status, requests, writes };
}
let result = await probe('generated/news_feed.js');
assert.equal(result.text, 'fresh'); assert.equal(result.requests[0].options.cache, 'no-store'); assert.deepEqual(result.writes, ['fresh']);
result = await probe('generated/news_feed.js', { offline: true }); assert.equal(result.text, 'cached');
result = await probe('generated/news_feed.js', { status: 503 }); assert.equal(result.text, 'cached'); assert.equal(result.writes.length, 0);
result = await probe('generated/news_feed.js', { offline: true, cached: false }); assert.equal(result.status, 503);
for (const file of ['engine.js', 'style.css']) {
  result = await probe(file); assert.equal(result.text, 'cached'); assert.equal(result.requests.length, 0);
  result = await probe(file, { cached: false }); assert.equal(result.text, 'fresh');
}
console.log('News service worker: 8 fetch scenarios passed, including unchanged engine/CSS cache behavior.');
