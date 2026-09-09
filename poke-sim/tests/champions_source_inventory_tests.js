const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'champions_source_inventory.json'), 'utf8'));
const script = fs.readFileSync(path.join(ROOT, 'tools', 'audit-champions-sources.mjs'), 'utf8');
const workflow = fs.readFileSync(path.join(ROOT, '..', '.github', 'workflows', 'champions-source-inventory.yml'), 'utf8');
let pass = 0;
let fail = 0;

function test(name, fn) {
  try {
    fn();
    pass++;
    console.log('  PASS ' + name);
  } catch (error) {
    fail++;
    console.error('  FAIL ' + name + ': ' + error.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log('\n=== Champion source inventory tests ===\n');

test('1. manifest separates public, manual, baseline, and field inventories', () => {
  assert(manifest.schema_version === 'champions-source-inventory-v1', 'wrong schema');
  assert(manifest.public_sources.length >= 10, 'official public source inventory is too small');
  assert(manifest.manual_captures.length >= 7, 'manual client capture inventory is too small');
  assert(manifest.baseline_manifests.length >= 1, 'Showdown baseline missing');
  assert(manifest.field_inventory.length >= 7, 'field inventory is incomplete');
});

test('2. every public source has provenance and claim scope', () => {
  const ids = new Set();
  manifest.public_sources.forEach((source) => {
    assert(source.source_id && !ids.has(source.source_id), 'missing or duplicate source_id');
    ids.add(source.source_id);
    assert(source.owner, source.source_id + ' missing owner');
    assert(source.tier === 0, source.source_id + ' is not official tier 0');
    assert(/^https:\/\//.test(source.url), source.source_id + ' must use HTTPS');
    assert(Array.isArray(source.claim_scopes) && source.claim_scopes.length, source.source_id + ' missing claim scopes');
  });
});

test('3. inventory covers every battle-data family requested for review', () => {
  const entities = new Set(manifest.field_inventory.map((row) => row.entity));
  ['species_form', 'move', 'ability', 'item', 'learnset', 'battle_rules', 'mechanics'].forEach((entity) => {
    assert(entities.has(entity), 'missing entity inventory: ' + entity);
  });
});

test('4. Champion-specific fields require official client or official page authority', () => {
  manifest.field_inventory.forEach((row) => {
    assert(row.baseline === 'pokemon_showdown_manifest', row.entity + ' missing Showdown baseline');
    assert(Array.isArray(row.champion_authority) && row.champion_authority.length, row.entity + ' missing Champion authority');
    assert(row.promotion_rule, row.entity + ' missing promotion rule');
  });
});

test('5. collector records hashes without persisting full source bodies', () => {
  assert(script.includes("createHash('sha256')"), 'SHA-256 hashing missing');
  assert(script.includes('byte_size'), 'byte size missing');
  assert(script.includes('checked_at_utc'), 'UTC check timestamp missing');
  assert(!script.includes('raw_body'), 'collector must not persist full page bodies');
  assert(script.includes('manual_capture_required'), 'manual proof status missing');
});

test('6. scheduled inventory is read-only and uploads review artifacts', () => {
  assert(workflow.includes('schedule:'), 'weekly schedule missing');
  assert(workflow.includes('workflow_dispatch:'), 'manual dispatch missing');
  assert(workflow.includes('contents: read'), 'workflow must stay read-only');
  assert(workflow.includes('npm run champions:sources'), 'collector command missing');
  assert(workflow.includes('actions/upload-artifact@v4'), 'audit artifact upload missing');
  assert(!/SUPABASE_|service.role|contents:\s*write/i.test(workflow), 'workflow must not have DB or repository write authority');
});

console.log('\nChampion source inventory: ' + pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
