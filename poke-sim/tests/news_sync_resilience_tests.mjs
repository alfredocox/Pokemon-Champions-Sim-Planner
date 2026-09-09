import assert from 'node:assert/strict';
import { chooseFeedUpdate, readGeneratedFeed } from '../tools/sync-news-feed.mjs';

const existing = {
  schema_version: 'champions-news-feed-v1',
  source_count: 1,
  generated_at: '2026-08-01T00:00:00.000Z',
  items: [{ title: 'Verified Champion event', url: 'https://example.test/event' }]
};

const outage = chooseFeedUpdate(existing, {
  schema_version: 'champions-news-feed-v1',
  source_count: 1,
  items: [],
  errors: [{ source_id: 'source', error: 'HTTP 503' }]
});
assert.equal(outage.shouldWrite, true);
assert.equal(outage.failed, true);
assert.equal(outage.payload.generated_at, existing.generated_at);
assert.deepEqual(outage.payload.items, []);
assert.match(outage.warning, /last-known-good/);

const valid = chooseFeedUpdate(existing, {
  schema_version: 'champions-news-feed-v1',
  items: [{ title: 'New event' }],
  errors: []
});
assert.equal(valid.shouldWrite, true);
assert.equal(valid.payload.items[0].title, 'New event');

const firstEmptySync = chooseFeedUpdate({}, {
  schema_version: 'champions-news-feed-v1',
  items: [],
  errors: [{ source_id: 'source', error: 'HTTP 503' }]
});
assert.equal(firstEmptySync.shouldWrite, true);

const parsed = readGeneratedFeed(`(function(root) { root.CHAMPIONS_NEWS_FEED = ${JSON.stringify(existing)}; })(window);`);
assert.equal(parsed.items[0].title, existing.items[0].title);

console.log('news sync resilience: 4 pass, 0 fail');
