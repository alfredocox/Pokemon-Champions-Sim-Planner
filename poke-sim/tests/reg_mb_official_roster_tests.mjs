import assert from 'node:assert/strict';
import fs from 'node:fs';
const capture = JSON.parse(fs.readFileSync(new URL('../source/reg-m-b-official-roster.json', import.meta.url), 'utf8'));
assert.equal(capture.competitive_use, false);
assert.match(capture.source_sha256, /^[a-f0-9]{64}$/);
assert.equal(capture.rows.length, 235);
assert.equal(new Set(capture.rows.map(row => row.official_id)).size, 235);
const byId = new Map(capture.rows.map(row => [row.official_id, row]));
for (const [id, name] of [['0740-000', 'Crabominable'], ['0870-000', 'Falinks'], ['0956-000', 'Espathra'], ['0670-005', 'Floette']]) {
  assert.equal(byId.get(id)?.label, name);
  assert.equal(byId.get(id)?.eligible, true);
}
for (const id of ['0738-000', '0851-000', '0954-000', '0670-000']) assert.equal(byId.has(id), false, id);
for (const id of ['0128-001', '0128-002', '0128-003', '0711-000', '0711-001', '0711-002', '0711-003', '0902-000', '0902-001']) assert(byId.has(id));
console.log('PASS M-B official capture: 235 unique IDs, corrected species presence/absence and distinct form IDs; no runtime promotion');
