'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const auditMigrationPath = path.join(ROOT, 'db', 'migrations', '2026_06_06_showdown_sync_audit_tables.sql');
const migrationPath = path.join(ROOT, 'db', 'migrations', '2026_06_07_showdown_entities_approved_views.sql');
const speciesMoveViewPath = path.join(ROOT, 'db', 'migrations', '2026_06_23_approved_species_move_legality_view.sql');
const generatorPath = path.join(ROOT, 'tools', 'generate-approved-data-from-db.mjs');
const generatorAliasPath = path.join(ROOT, 'tools', 'generate_showdown_data.mjs');

let pass = 0;
let fail = 0;

function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass += 1;
  } catch (err) {
    console.log('  FAIL', name, '-', err.message);
    fail += 1;
  }
}

function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'not equal') + ' expected=' + JSON.stringify(expected) + ' got=' + JSON.stringify(actual));
}

function fixtureRows() {
  return {
    entities: [
      {
        entity_id: 'move-bravebird',
        entity_kind: 'move',
        entity_key: 'bravebird',
        display_name: 'Brave Bird',
        source_hash: 'h-bravebird',
        approved: true,
        data: {
          id: 'bravebird',
          name: 'Brave Bird',
          type: 'Flying',
          category: 'Physical',
          basePower: 120,
          accuracy: 100,
          priority: 0,
          target: 'any',
          flags: { contact: 1, protect: 1 },
          recoil: [33, 100],
          shortDesc: 'Has 33% recoil.',
          desc: 'Has 33% recoil.'
        }
      },
      {
        entity_id: 'move-hydropump',
        entity_kind: 'move',
        entity_key: 'hydropump',
        display_name: 'Hydro Pump',
        source_hash: 'h-hydropump',
        approved: false,
        data: {
          id: 'hydropump',
          name: 'Hydro Pump',
          type: 'Water',
          category: 'Special',
          basePower: 110,
          accuracy: 80,
          priority: 0,
          target: 'normal'
        }
      },
      {
        entity_id: 'species-charizard',
        entity_kind: 'species',
        entity_key: 'charizard',
        display_name: 'Charizard',
        source_hash: 'h-charizard',
        approved: true,
        data: {
          id: 'charizard',
          displayName: 'Charizard',
          baseSpecies: 'Charizard',
          stats: { hp: 78, atk: 84, def: 78, spa: 109, spd: 85, spe: 100 },
          types: ['Fire', 'Flying'],
          weightkg: 90.5,
          moves: { bravebird: '9M' }
        }
      }
    ],
    overrides: [
      {
        override_id: 'override-bravebird-priority',
        entity_kind: 'move',
        entity_key: 'bravebird',
        field_path: 'priority',
        override_value: 1,
        reason: 'Fixture Champions override',
        status: 'active'
      },
      {
        override_id: 'override-rejected-base-power',
        entity_kind: 'move',
        entity_key: 'bravebird',
        field_path: 'basePower',
        override_value: 10,
        reason: 'Rejected fixture override',
        status: 'rejected'
      },
      {
        override_id: 'override-missing-row',
        entity_kind: 'move',
        entity_key: 'missingmove',
        field_path: 'priority',
        override_value: 2,
        reason: 'Missing row fixture',
        status: 'active'
      }
    ]
  };
}

function generateFixtureRuntime(scriptPath) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'champions-approved-data-'));
  const rows = fixtureRows();
  const entitiesPath = path.join(dir, 'entities.json');
  const overridesPath = path.join(dir, 'overrides.json');
  const outPath = path.join(dir, 'approved-runtime.js');
  fs.writeFileSync(entitiesPath, JSON.stringify(rows.entities, null, 2));
  fs.writeFileSync(overridesPath, JSON.stringify(rows.overrides, null, 2));
  const result = childProcess.spawnSync(process.execPath, [
    scriptPath || generatorPath,
    '--entities', entitiesPath,
    '--overrides', overridesPath,
    '--out', outPath,
    '--generated-at', '2026-06-07T00:00:00.000Z',
    '--source-version', 'fixture-sync'
  ], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error('generator failed: ' + (result.stderr || result.stdout));
  }
  delete require.cache[outPath];
  return { dir, outPath, runtime: require(outPath) };
}

console.log('\n=== approved Showdown data generator tests ===\n');

T('0. sync audit migration exposes read-only status tables', () => {
  const sql = fs.readFileSync(auditMigrationPath, 'utf8');
  [
    'CREATE TABLE IF NOT EXISTS showdown_sync_runs',
    'CREATE TABLE IF NOT EXISTS showdown_source_files',
    'REVOKE INSERT, UPDATE, DELETE ON showdown_sync_runs FROM anon, authenticated',
    'REVOKE INSERT, UPDATE, DELETE ON showdown_source_files FROM anon, authenticated',
    'GRANT SELECT ON showdown_sync_runs TO anon, authenticated',
    'GRANT SELECT ON showdown_source_files TO anon, authenticated',
    'idx_showdown_sync_runs_finished'
  ].forEach((needle) => truthy(sql.includes(needle), 'missing SQL: ' + needle));
  truthy(!/FOR\s+(INSERT|UPDATE|DELETE)\s+TO\s+anon/i.test(sql), 'anon write policy should not exist in audit migration');
});

T('1. migration creates approved entity, diff, override, and view objects', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  [
    'CREATE TABLE IF NOT EXISTS showdown_entities',
    'CREATE TABLE IF NOT EXISTS showdown_entity_diffs',
    'CREATE TABLE IF NOT EXISTS champions_overrides',
    'CREATE OR REPLACE VIEW approved_showdown_entities',
    'CREATE OR REPLACE VIEW approved_champions_data',
    'WITH (security_invoker = true)'
  ].forEach((needle) => truthy(sql.includes(needle), 'missing SQL: ' + needle));
});

T('2. migration allows anon reads only through approved/active RLS paths', () => {
  const sql = fs.readFileSync(migrationPath, 'utf8');
  truthy(sql.includes('USING (approved = true)'), 'approved entity RLS missing');
  truthy(sql.includes("USING (status = 'active')"), 'active override RLS missing');
  truthy(!/FOR\s+(INSERT|UPDATE|DELETE)\s+TO\s+anon/i.test(sql), 'anon write policy should not exist');
  truthy(sql.includes('REVOKE INSERT, UPDATE, DELETE ON showdown_entities FROM anon, authenticated'), 'entity write revoke missing');
  truthy(sql.includes('REVOKE INSERT, UPDATE, DELETE ON champions_overrides FROM anon, authenticated'), 'override write revoke missing');
  truthy(sql.includes('GRANT SELECT ON approved_showdown_entities TO anon, authenticated'), 'approved view grant missing');
  truthy(sql.includes('GRANT SELECT ON approved_champions_data TO anon, authenticated'), 'override view grant missing');
  truthy(sql.includes('idx_showdown_entities_approved_latest'), 'approved latest index missing');
  truthy(!/GRANT\s+SELECT\s+ON\s+showdown_entity_diffs\s+TO\s+anon/i.test(sql), 'diff rows should not be publicly granted');
});

T('3. species move legality view joins exact species/form learnsets to approved move metadata', () => {
  const sql = fs.readFileSync(speciesMoveViewPath, 'utf8');
  [
    'CREATE OR REPLACE VIEW approved_species_move_legality',
    'FROM approved_showdown_entities',
    "WHERE entity_kind = 'species'",
    "WHERE entity_kind = 'move'",
    'jsonb_each_text',
    'base_power',
    'move_type',
    'learn_method_codes',
    'GRANT SELECT ON approved_species_move_legality TO anon, authenticated'
  ].forEach((needle) => truthy(sql.includes(needle), 'missing SQL: ' + needle));
  truthy(!/CREATE\s+TABLE/i.test(sql), 'legality lookup should be a view over approved truth, not a duplicate table');
});

T('4. generator emits approved runtime data and excludes unapproved rows', () => {
  const generated = generateFixtureRuntime();
  const runtime = generated.runtime;
  truthy(runtime.moves.bravebird, 'Brave Bird missing');
  truthy(!runtime.moves.hydropump, 'unapproved Hydro Pump should not be emitted');
  eq(runtime.moves.bravebird.base_power, 120, 'Brave Bird base_power');
  eq(runtime.moves.bravebird.basePower, 120, 'Brave Bird basePower');
  eq(runtime.moves.bravebird.priority, 1, 'active Champions override should apply');
  eq(runtime.moves.bravebird.flags, 'contact|protect', 'flags should be deterministic');
  eq(runtime.moves.bravebird.recoil[0], 33, 'recoil numerator');
  eq(runtime.moves.bravebird.shortDesc, 'Has 33% recoil.', 'shortDesc should survive approved generation');
  eq(runtime.moves.bravebird.short_desc, 'Has 33% recoil.', 'short_desc should survive approved generation');
  eq(runtime.moves.bravebird.desc, 'Has 33% recoil.', 'desc should survive approved generation');
  truthy(runtime.species.Charizard, 'Charizard species missing');
  eq(runtime.species.Charizard.weightkg, 90.5, 'Charizard weight should survive approved generation');
  eq(runtime.meta.appliedOverrideCount, 1, 'applied override count');
  eq(runtime.meta.activeOverrideCount, 2, 'active override count includes missing-row warning');
  truthy(runtime.meta.warnings.some((line) => line.includes('missingmove')), 'missing override warning absent');
});

T('5. Phase 4 compatibility generator path emits the same runtime contract', () => {
  truthy(fs.existsSync(generatorAliasPath), 'tools/generate_showdown_data.mjs missing');
  const generated = generateFixtureRuntime(generatorAliasPath);
  const runtime = generated.runtime;
  eq(runtime.dataSource, 'approved-db', 'compat generator should keep approved-db data source');
  truthy(runtime.moves.bravebird, 'compat generator Brave Bird missing');
  truthy(runtime.species.Charizard, 'compat generator Charizard missing');
  eq(runtime.moves.bravebird.priority, 1, 'compat generator should apply Champions override');
});

T('6. generated DB-style rows are compatible with the battle engine helpers', () => {
  const generated = generateFixtureRuntime();
  const ctx = {
    console,
    require,
    module: {},
    exports: {},
    Math,
    Object,
    Array,
    Set,
    JSON,
    String,
    Number,
    Boolean,
    RegExp,
    parseInt,
    parseFloat
  };
  vm.createContext(ctx);
  function load(file) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
  }
  load('data.js');
  load('engine.js');
  vm.runInContext(fs.readFileSync(generated.outPath, 'utf8'), ctx, { filename: generated.outPath });
  vm.runInContext('this._moveBasePower = _moveBasePower; this._moveAccuracy = _moveAccuracy; this._moveHasFlag = _moveHasFlag; this.getPriority = getPriority;', ctx);
  eq(ctx._moveBasePower('Brave Bird'), 120, 'engine should read DB-style basePower');
  eq(ctx._moveAccuracy('Brave Bird', 0.01), 1, 'engine should read Showdown accuracy first');
  eq(ctx.getPriority('Brave Bird', { ability: '' }), 1, 'engine should read overridden priority');
  truthy(ctx._moveHasFlag('Brave Bird', 'contact'), 'engine should read generated contact flags');
});

console.log('\napproved Showdown data generator:', pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
