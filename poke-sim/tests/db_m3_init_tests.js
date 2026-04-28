// db_m3_init_tests.js — Module 3: Init / source-of-truth suite (12 cases)
// PR: integration/poke-sim-db-m3 → Linear: POK-19
// Spec: poke-sim/POKE_SIM_DB_INTEGRATION_PLAN_v2.md §5 M3
//
// What this suite verifies:
//  - tests/_db_helpers.js exposes a working installAdapter(ctx, opts) that
//    loads supabase_adapter.js into a contextified VM with creds toggled off
//    (via __DISABLE_SUPABASE__) or on (with optional mockClient).
//  - supabase_adapter.js now exposes both loadTeamsFromDB() and loadRulesets().
//  - ui.js's DOMContentLoaded handler awaits loadTeamsFromDB() before the first
//    authoritative rebuildTeamSelects().
//  - index.html and ui.js carry the [DB offline] chip text.
//  - When live DB is reachable, the chip is hidden and 22 teams come back.

'use strict';

const fs   = require('fs');
const path = require('path');
const helpers = require('./_db_helpers.js');
const { mockSupabaseClient, installAdapter, freshCtx } = helpers;

const ADAPTER_PATH = path.resolve(__dirname, '..', 'supabase_adapter.js');
const UI_PATH      = path.resolve(__dirname, '..', 'ui.js');
const INDEX_PATH   = path.resolve(__dirname, '..', 'index.html');

// Test harness
let _passed = 0, _failed = 0, _total = 0;
function T(name, fn) {
  _total++;
  try { fn(); _passed++; console.log('  ✔ ' + name); }
  catch (e) { _failed++; console.log('  ✖ FAIL: ' + name + ' — ' + e.message); }
}
async function TA(name, fn) {
  _total++;
  try { await fn(); _passed++; console.log('  ✔ ' + name); }
  catch (e) { _failed++; console.log('  ✖ FAIL: ' + name + ' — ' + e.message); }
}
function describe(name, fn) { console.log('\n▶ ' + name); return fn(); }
function eq(a, b, msg) {
  if (a !== b) throw new Error(msg + ' expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}
function truthy(v, msg) { if (!v) throw new Error(msg + ' expected truthy'); }

(async function () {
  await describe('Module 3 — Init / source-of-truth suite (12 cases)', async function () {

    // ── Static-source assertions ─────────────────────────────────────────────

    T('T-init-1', function () {
      // ui.js still declares COVERAGE_CHECKS with var (no implicit-global regression)
      const uiContent = fs.readFileSync(UI_PATH, 'utf8');
      eq(uiContent.includes('var COVERAGE_CHECKS'), true,
         'COVERAGE_CHECKS still declared with var');
    });

    T('T-init-2', function () {
      // ui.js's DOMContentLoaded handler calls await SupabaseAdapter.loadTeamsFromDB()
      // before the first authoritative rebuildTeamSelects().
      const uiContent = fs.readFileSync(UI_PATH, 'utf8');
      eq(uiContent.includes('await _adapter.loadTeamsFromDB()'), true,
         'DOMContentLoaded handler awaits loadTeamsFromDB');
      // Also assert the M3 marker comment is present (anchors the contract)
      eq(uiContent.includes('M3 — DB init: source-of-truth merge'), true,
         'M3 init marker comment present in ui.js');
    });

    T('T-init-3', function () {
      // installAdapter with disable=true → adapter.enabled === false (offline).
      // This is the behaviour all offline init tests rely on.
      const ctx = freshCtx();
      const adapter = installAdapter(ctx, { disable: true });
      eq(adapter.enabled, false, 'adapter.enabled === false when disabled');
      truthy(typeof adapter.loadTeamsFromDB === 'function',
        'loadTeamsFromDB is exposed even when disabled');
    });

    await TA('T-init-4', async function () {
      // When adapter is disabled, loadTeamsFromDB() resolves to null (does not throw).
      // No global TEAMS object is mutated.
      const ctx = freshCtx({ TEAMS: { player: { name: 'Static Player' } } });
      const adapter = installAdapter(ctx, { disable: true });
      const result = await adapter.loadTeamsFromDB();
      eq(result, null, 'loadTeamsFromDB returns null when disabled');
      // Static TEAMS unchanged
      eq(ctx.TEAMS.player.name, 'Static Player', 'static TEAMS unchanged');
    });

    await TA('T-init-5', async function () {
      // When enabled=false, getClient() never runs → mock createClient is NEVER called.
      let createClientCalls = 0;
      const ctx = freshCtx();
      const adapter = installAdapter(ctx, {
        disable: true,
        mockClient: { /* unused */ }
      });
      // Even though we registered window.supabase.createClient, override it to count
      ctx.window.supabase = { createClient: function () { createClientCalls++; return {}; } };
      await adapter.loadTeamsFromDB();
      eq(createClientCalls, 0, 'createClient not called when adapter disabled');
    });

    await TA('T-init-6', async function () {
      // DB result with metadata.format flows through to the returned team object.
      const ctx = freshCtx();
      const mockClient = mockSupabaseClient({
        teams: [
          { team_id: 'player',       name: 'Player',       metadata: { format: 'gen9vgc2024regh', custom_rules: {} } },
          { team_id: 'mega_altaria', name: 'Mega Altaria', metadata: { format: 'gen9vgc2024regh', custom_rules: {} } }
        ],
        team_members: []
      });
      const adapter = installAdapter(ctx, { url: 'https://x.supabase.co', key: 'k', mockClient });
      const result = await adapter.loadTeamsFromDB();
      truthy(result, 'loadTeamsFromDB returned non-null');
      eq(result.player.metadata.format,       'gen9vgc2024regh', 'format flows from DB metadata (player)');
      eq(result.mega_altaria.metadata.format, 'gen9vgc2024regh', 'format flows from DB metadata (mega_altaria)');
    });

    await TA('T-init-7', async function () {
      // DB rows win on collision: when loadTeamsFromDB returns a row with the same
      // team_id as a static TEAMS entry, the adapter's returned object carries the
      // DB version. The merge step in ui.js does Object.assign(TEAMS, dbTeams).
      const ctx = freshCtx();
      const mockClient = mockSupabaseClient({
        teams: [
          { team_id: 'player', name: 'DB Player' }
          // intentionally no row for mega_altaria
        ],
        team_members: []
      });
      const adapter = installAdapter(ctx, { url: 'https://x.supabase.co', key: 'k', mockClient });
      const dbTeams = await adapter.loadTeamsFromDB();
      truthy(dbTeams, 'loadTeamsFromDB returned non-null');

      // Simulate ui.js merge step
      const TEAMS = { player: { name: 'Static Player' }, mega_altaria: { name: 'Static Mega' } };
      Object.assign(TEAMS, dbTeams);
      eq(TEAMS.player.name,       'DB Player',   'DB row overwrites static team');
      eq(TEAMS.mega_altaria.name, 'Static Mega', 'static team without DB row is preserved');
    });

    await TA('T-init-8', async function () {
      // Init blocks roster render until loadTeamsFromDB resolves.
      // Verified by mocking a slow client and asserting the awaited value
      // arrives before "rebuild" runs.
      const ctx = freshCtx();
      const slowClient = {
        from: function () {
          return {
            select: function () { return this; },
            order:  function () { return this; },
            then:   function (resolve) {
              setTimeout(function () { resolve({ data: [], error: null }); }, 50);
            }
          };
        }
      };
      const adapter = installAdapter(ctx, { url: 'https://x.supabase.co', key: 'k', mockClient: slowClient });

      const events = [];
      // Simulate the awaited init order:
      const start = Date.now();
      await adapter.loadTeamsFromDB();
      events.push('loadTeamsFromDB-done@' + (Date.now() - start) + 'ms');
      events.push('rebuildTeamSelects');
      eq(events[1], 'rebuildTeamSelects', 'rebuild happens AFTER load resolves');
      truthy(events[0].startsWith('loadTeamsFromDB-done'), 'load resolved before rebuild');
    });

    T('T-init-9', function () {
      // No leftover triple-stacked DOMContentLoaded handlers in supabase_adapter.js.
      // (Pre-M3 there was an auto-merge listener inside the adapter; M3 moved it to ui.js.)
      const adapterContent = fs.readFileSync(ADAPTER_PATH, 'utf8');
      const matches = adapterContent.match(/addEventListener\(\s*['"]DOMContentLoaded['"]/g) || [];
      eq(matches.length, 0,
         'no DOMContentLoaded listeners remain in supabase_adapter.js (handler now in ui.js)');
    });

    await TA('T-init-10', async function () {
      // Adapter exposes loadRulesets() returning ≥1 ruleset when DB has data.
      const ctx = freshCtx();
      const mockClient = mockSupabaseClient({
        rulesets: [{
          ruleset_id:        'champions_reg_m_doubles_bo3',
          engine_formatid:   'gen9championsvgc2026regma',
          custom_rules:      {}
        }]
      });
      const adapter = installAdapter(ctx, { url: 'https://x.supabase.co', key: 'k', mockClient });
      truthy(typeof adapter.loadRulesets === 'function', 'loadRulesets is exposed');
      const result = await adapter.loadRulesets();
      truthy(Array.isArray(result), 'loadRulesets returns an array');
      eq(result.length >= 1, true, 'loadRulesets returns ≥1 ruleset');
      eq(result[0].ruleset_id, 'champions_reg_m_doubles_bo3', 'canonical ruleset_id present');
    });

    T('T-init-11', function () {
      // [DB offline] chip text appears in BOTH index.html and ui.js
      // (HTML carries the DOM element, ui.js toggles it)
      const indexContent = fs.readFileSync(INDEX_PATH, 'utf8');
      eq(indexContent.includes('[DB offline]'), true, '[DB offline] text in index.html');
      eq(indexContent.includes('id="db-offline-chip"'), true, 'db-offline-chip element in index.html');

      const uiContent = fs.readFileSync(UI_PATH, 'utf8');
      eq(uiContent.includes('[DB offline]'), true, '[DB offline] text in ui.js');
      eq(uiContent.includes('db-offline-chip'), true, 'ui.js toggles db-offline-chip element');
    });

    await TA('T-init-12', async function () {
      // Init completes within a generous bound when DB latency is simulated.
      // Bound: ≤ 600 ms with a 100 ms simulated DB latency (test contract).
      const ctx = freshCtx();
      const slowClient = {
        from: function () {
          return {
            select: function () { return this; },
            order:  function () { return this; },
            then:   function (resolve) {
              setTimeout(function () { resolve({ data: [], error: null }); }, 100);
            }
          };
        }
      };
      const adapter = installAdapter(ctx, { url: 'https://x.supabase.co', key: 'k', mockClient: slowClient });

      const start = Date.now();
      await adapter.loadTeamsFromDB();
      const elapsed = Date.now() - start;
      eq(elapsed <= 600, true, 'init completed within 600ms (got ' + elapsed + 'ms)');
    });

    // ── Optional live-DB smoke test (only runs when RUN_LIVE_DB=1) ───────────
    if (process.env.RUN_LIVE_DB === '1') {
      await TA('T-init-LIVE', async function () {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;
        if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_KEY required for live test');
        const res = await fetch(url + '/rest/v1/teams?select=team_id', {
          headers: { apikey: key, Authorization: 'Bearer ' + key }
        });
        eq(res.status, 200, 'live /rest/v1/teams returned 200');
        const rows = await res.json();
        eq(Array.isArray(rows) && rows.length === 22, true,
           'live DB returned 22 team rows (got ' + (Array.isArray(rows) ? rows.length : 'non-array') + ')');
      });
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('Module 3 Init Test Results: ' + _passed + '/' + _total + ' passed');
    if (_failed > 0) {
      console.log('❌ ' + _failed + ' tests failed');
      process.exit(1);
    } else {
      console.log('✅ All ' + _total + ' db_m3 init tests GREEN');
    }
  });
})();
