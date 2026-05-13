// _db_helpers.js — Shared mock infrastructure for DB integration tests
// Provides mockSupabaseClient, installAdapter, offlineMode, assertNoServiceRole, freshCtx
// Used by all db_*_tests.js files

'use strict';

var path = require('path');
var fs   = require('fs');
var vm   = require('vm');

var ADAPTER_PATH = path.resolve(__dirname, '..', 'supabase_adapter.js');

// ─── Mock supabase-js client ────────────────────────────────────────────────
// Dual-mode: callable as a factory (legacy M1/M2/M3 tests pass seed state)
// AND has static .getState() / .setErrorMode() / .reset() methods (M4+ tests).
//
// State captured per-table:
//   analyses, analysis_logs, analysis_win_conditions, warnings
//   teams, team_members, etc. — pre-seeded rows are returned by SELECT
//   inserts append to whatever table was passed to .from(table).insert(rows)
//
// Error modes ('4xx', 'rls_denied') flip insert results to { data: null, error: <err> }
// so the adapter's catch handler runs.
var mockState = {};
var mockErrorMode = null;

function _resetMockState(seed) {
  mockState = seed || {};
  // Ensure M4 tables exist for assertion convenience
  if (!mockState.analyses)                mockState.analyses = [];
  if (!mockState.analysis_logs)           mockState.analysis_logs = [];
  if (!mockState.analysis_win_conditions) mockState.analysis_win_conditions = [];
  if (!mockState.warnings)                mockState.warnings = [];
  // M5 tables
  if (!mockState.teams)                   mockState.teams = [];
  if (!mockState.team_members)            mockState.team_members = [];
  // M8 tables
  if (!mockState.prior_snapshots)         mockState.prior_snapshots = [];
  // Convenience top-level mirrors for T-save-11
  mockState.wins = 0; mockState.losses = 0; mockState.draws = 0;
}
_resetMockState();

function _errorFor(mode) {
  if (mode === '4xx')         return { code: '400', message: 'Bad Request' };
  if (mode === 'rls_denied')  return { code: '42501', message: 'Import blocked by RLS policy' };
  return null;
}

function _chain(table, state) {
  var rows = (state && state[table]) || [];
  var pendingInsert = null;
  var pendingDelete = false;
  var eqFilters = [];
  var lteFilters = [];
  var pendingSelect = false;
  var orderCol = null;
  var orderAsc = true;
  var limitN = null;

  function _resolveResult() {
    if (mockErrorMode) {
      var err = _errorFor(mockErrorMode);
      // Mirror RLS warnings into mockState for T-save-18
      if (mockErrorMode === 'rls_denied') {
        state.warnings = state.warnings || [];
        state.warnings.push({ message: 'Import blocked by RLS policy', table: table });
      }
      return { data: null, error: err };
    }
    if (pendingDelete) {
      // M5: delete rows matching eq filters
      state[table] = state[table] || [];
      if (eqFilters.length > 0) {
        eqFilters.forEach(function(f) {
          state[table] = state[table].filter(function(row) { return row[f.col] !== f.val; });
        });
      } else {
        state[table] = [];
      }
      return { data: [], error: null };
    }
    if (pendingInsert) {
      // Append insert rows to the table
      state[table] = state[table] || [];
      var inserted = Array.isArray(pendingInsert) ? pendingInsert : [pendingInsert];
      inserted.forEach(function (row) { state[table].push(row); });
      // Mirror analyses sums for T-save-11
      if (table === 'analyses' && inserted.length) {
        var last = inserted[inserted.length - 1];
        if (typeof last.wins   === 'number') state.wins   = last.wins;
        if (typeof last.losses === 'number') state.losses = last.losses;
        if (typeof last.draws  === 'number') state.draws  = last.draws;
      }
      return { data: inserted, error: null };
    }
    // Apply eq and lte filters for SELECT queries
    var filtered = rows.slice();
    if (pendingSelect && (eqFilters.length > 0 || lteFilters.length > 0)) {
      eqFilters.forEach(function(f) {
        filtered = filtered.filter(function(row) { return row[f.col] === f.val; });
      });
      lteFilters.forEach(function(f) {
        filtered = filtered.filter(function(row) { return row[f.col] <= f.val; });
      });
      // Apply ordering
      if (orderCol) {
        filtered.sort(function(a, b) {
          if (a[orderCol] < b[orderCol]) return orderAsc ? -1 : 1;
          if (a[orderCol] > b[orderCol]) return orderAsc ? 1 : -1;
          return 0;
        });
      }
      // Apply limit
      if (limitN !== null) {
        filtered = filtered.slice(0, limitN);
      }
      return { data: filtered, error: null };
    }
    return { data: rows, error: null };
  }

  var self = {
    select: function () { pendingSelect = true; return self; },
    insert: function (rows) { pendingInsert = rows; return self; },
    upsert: function (rows) { pendingInsert = rows; return self; },
    update: function () { return self; },
    delete: function () { pendingDelete = true; return self; },
    eq:     function (col, val) { eqFilters.push({ col: col, val: val }); return self; },
    lte:    function (col, val) { lteFilters.push({ col: col, val: val }); return self; },
    in:     function () { return self; },
    order:  function (col, opts) { orderCol = col; orderAsc = opts && opts.ascending !== undefined ? opts.ascending : true; return self; },
    limit:  function (n) { limitN = n; return self; },
    single: function () { var r = _resolveResult(); return Promise.resolve({ data: (r.data && r.data[0]) || null, error: r.error }); },
    then:   function (resolve) { 
      var result = _resolveResult();
      return Promise.resolve({ data: result.data, error: result.error });
    }
  };
  return self;
}

function mockSupabaseClient(state) {
  if (state !== undefined) _resetMockState(state);
  return {
    from: function (table) { return _chain(table, mockState); },
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: null }, error: null }); }
    }
  };
}

// Static accessors for M4+ tests
mockSupabaseClient.getState     = function () { return mockState; };
mockSupabaseClient.setErrorMode = function (mode) { mockErrorMode = mode || null; };
mockSupabaseClient.reset        = function (seed) { mockErrorMode = null; _resetMockState(seed); };

// Add saveTeam method for M5 tests
mockSupabaseClient.saveTeam = function (payload) {
  if (!payload || !payload.team_id || !payload.name) {
    return Promise.resolve(null);
  }
  
  // Add team to mock state
  if (!mockState.teams) mockState.teams = [];
  if (!mockState.team_members) mockState.team_members = [];
  
  // Upsert team
  var existingTeamIndex = mockState.teams.findIndex(function(t) { return t.team_id === payload.team_id; });
  var teamRow = {
    team_id: payload.team_id,
    name: payload.name,
    label: payload.label || 'CUSTOM',
    mode: payload.mode || 'opponent',
    ruleset_id: payload.ruleset_id || 'champions_reg_m_doubles_bo3',
    source: payload.source || 'unknown',
    description: payload.description || '',
    metadata: payload.metadata || { source: payload.source || 'unknown' }
  };
  
  if (existingTeamIndex >= 0) {
    mockState.teams[existingTeamIndex] = teamRow;
  } else {
    mockState.teams.push(teamRow);
  }
  
  // Remove existing members and add new ones
  mockState.team_members = mockState.team_members.filter(function(m) { return m.team_id !== payload.team_id; });
  
  if (payload.members && payload.members.length) {
    payload.members.forEach(function(member, i) {
      var memberRow = {
        team_id: payload.team_id,
        name: member.name || member.species || 'Unknown',
        species: member.species || member.name || 'Unknown',
        ability: member.ability || null,
        item: member.item || null,
        nature: member.nature || null,
        evs: member.evs || null,
        ivs: member.ivs || null,
        moves: member.moves || [],
        level: member.level || 50,
        tera_type: member.tera_type || member.teraType || null
      };
      mockState.team_members.push(memberRow);
    });
  }
  
  return Promise.resolve(payload.team_id);
};
// Returns a stateful client without re-seeding (lets tests that already
// pre-seeded via mockSupabaseClient(seed) call this for installAdapter).
mockSupabaseClient.client       = function () {
  return {
    from: function (table) { return _chain(table, mockState); },
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: null }, error: null }); }
    }
  };
};

// ─── Fresh contextified VM context ──────────────────────────────────────────
// supabase_adapter.js is an IIFE that reads window.__SUPABASE_URL__ at IIFE-eval
// time. Tests need a clean context per call to toggle enabled state.
function freshCtx(extras) {
  var fakeWindow = {
    console:           console,
    addEventListener:  function () {},
    removeEventListener: function () {},
    dispatchEvent:     function () { return true; }
  };
  
  // Inject Supabase credentials from environment variables if available
  if (typeof process !== 'undefined' && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    fakeWindow.__SUPABASE_URL__ = process.env.SUPABASE_URL;
    fakeWindow.__SUPABASE_KEY__ = process.env.SUPABASE_ANON_KEY;
    console.log('✓ Environment variables injected, URL length:', process.env.SUPABASE_URL.length, 'Key length:', process.env.SUPABASE_ANON_KEY.length);
    console.log('✓ Window object has URL:', !!fakeWindow.__SUPABASE_URL__, 'Key:', !!fakeWindow.__SUPABASE_KEY__);
  } else {
    console.log('⚠️ No environment variables found, process.env:', JSON.stringify(Object.keys(process.env || {}).filter(k => k.includes('SUPABASE')), null, 2));
  }
  var sandbox = {
    console:        console,
    window:         fakeWindow,
    document: {
      getElementById:    function () { return null; },
      addEventListener:  function () {},
      removeEventListener: function () {}
    },
    crypto: { randomUUID: function () { 
    // Generate proper UUID for testing
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  } },
    setTimeout:    setTimeout,
    setInterval:   setInterval,
    clearTimeout:  clearTimeout,
    clearInterval: clearInterval
  };
  if (extras && typeof extras === 'object') {
    for (var k in extras) sandbox[k] = extras[k];
  }
  return vm.createContext(sandbox);
}

// ─── installAdapter — load supabase_adapter.js into a context ───────────────
// Accepts EITHER a vm.Context (preferred) or a plain object (we'll wrap it).
// Options: { url, key, disable, mockClient }
//   url      → injected as window.__SUPABASE_URL__
//   key      → injected as window.__SUPABASE_KEY__
//   disable  → injected as window.__DISABLE_SUPABASE__ (forces enabled=false)
//   mockClient → injected as window.supabase = { createClient: () => mockClient }
function installAdapter(ctx, opts) {
  opts = opts || {};

  // If a plain object was passed, contextify it.
  // vm.isContext was added in Node 0.12; safe to use.
  if (!vm.isContext(ctx)) {
    // Ensure required shape
    if (!ctx.window) {
      ctx.window = {
        addEventListener: function () {},
        removeEventListener: function () {},
        dispatchEvent: function () { return true; }
      };
    }
    if (!ctx.document) {
      ctx.document = {
        getElementById: function () { return null; },
        addEventListener: function () {},
        removeEventListener: function () {}
      };
    }
    if (!ctx.console) ctx.console = console;
    if (!ctx.crypto)  ctx.crypto  = { randomUUID: function () { return '00000000-0000-4000-8000-000000000000'; } };
    if (!ctx.setTimeout)    ctx.setTimeout    = setTimeout;
    if (!ctx.setInterval)   ctx.setInterval   = setInterval;
    if (!ctx.clearTimeout)  ctx.clearTimeout  = clearTimeout;
    if (!ctx.clearInterval) ctx.clearInterval = clearInterval;
    vm.createContext(ctx);
  }

  // Check if we should use live DB or mock
  var hasLiveCreds = ctx.window.__SUPABASE_URL__ && ctx.window.__SUPABASE_KEY__;
  var liveRequested = typeof process !== 'undefined' && process.env.RUN_LIVE_DB === '1';
  var useLiveDB = liveRequested && hasLiveCreds && !opts.forceMock && !opts.disable;

  // Load supabase-js library for live DB testing
  if (useLiveDB && !ctx.window.supabase) {
    try {
      // Try to load supabase-js from node_modules
      var { createClient } = require('@supabase/supabase-js');
      var ws = require('ws');
      
      // Override createClient to configure WebSocket transport for Node.js
      ctx.window.supabase = { 
        createClient: function(url, key, options) {
          return createClient(url, key, {
            ...options,
            realtime: {
              ...options?.realtime,
              transport: ws
            }
          });
        }
      };
      console.log('✓ Loaded supabase-js with WebSocket transport');
    } catch (e) {
      console.log('⚠️ supabase-js not available, falling back to mock:', e.message);
      useLiveDB = false;
    }
  }

  // Inject creds / disable flag onto window before evaluating the adapter IIFE.
  var bareCall = (opts.url === undefined && opts.key === undefined && !opts.disable && !opts.mockClient);
  if (bareCall) {
    if (useLiveDB) {
      console.log('🔗 Using LIVE Supabase database');
      // Don't set supabase client - let adapter create real one
    } else {
      mockSupabaseClient.reset();
      if (ctx.window.__SUPABASE_URL__ && ctx.window.__SUPABASE_KEY__) {
        console.log('✓ Using injected test credentials with mock client');
      } else {
        ctx.window.__SUPABASE_URL__ = 'https://mock.supabase.test';
        ctx.window.__SUPABASE_KEY__ = 'mock-anon-key';
        console.log('⚠️ No environment variables found, using mock');
      }
      ctx.window.supabase = { createClient: function () { return mockSupabaseClient.client(); } };
    }
    ctx.window.__DISABLE_SUPABASE__ = false;
  } else {
    ctx.window.__SUPABASE_URL__ = (opts.url === undefined)     ? ctx.window.__SUPABASE_URL__ : opts.url;
    ctx.window.__SUPABASE_KEY__ = (opts.key === undefined)     ? ctx.window.__SUPABASE_KEY__ : opts.key;
    ctx.window.__DISABLE_SUPABASE__ = !!opts.disable;
    if (opts.mockClient) {
      ctx.window.supabase = {
        createClient: function () { return opts.mockClient; }
      };
    } else if (!useLiveDB) {
      // Use mock client unless live DB is enabled
      ctx.window.supabase = { createClient: function () { return mockSupabaseClient.client(); } };
    }
  }

  var adapterCode = fs.readFileSync(ADAPTER_PATH, 'utf8');
  vm.runInContext(adapterCode, ctx);

  // Wire saveTeam method into the mock adapter (only for mock mode)
  if (ctx.window.SupabaseAdapter && !useLiveDB) {
    ctx.window.SupabaseAdapter.saveTeam = mockSupabaseClient.saveTeam;
  }

  return ctx.window.SupabaseAdapter;
}

// ─── offlineMode — re-load the adapter with creds cleared ───────────────────
function offlineMode(ctx) {
  return installAdapter(ctx, { url: null, key: null, disable: true });
}

// ─── assertNoServiceRole — guard against shipping service-role tokens ──────
function assertNoServiceRole(filepath) {
  var content = fs.readFileSync(filepath, 'utf8');
  var hasServiceRole =
    content.includes('service_role') ||
    (content.includes('eyJ') && content.includes('role":"service_role'));
  if (hasServiceRole) {
    throw new Error('service_role found in ' + filepath + ' - not allowed in frontend bundle');
  }
}

// Test cleanup functionality
function cleanupTestData() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    console.log('🧹 Cleaning up test data from live database...');
    
    // Create a temporary Supabase client for cleanup
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
      db: { schema: 'public' },
      auth: { persistSession: false },
      realtime: { transport: require('ws') }
    });
    
    // Clean up test data with test-specific identifiers
    const cleanupPromises = [];
    
    // Clean up test analyses (those with test-specific patterns)
    cleanupPromises.push(
      supabase
        .from('analyses')
        .delete()
        .or('player_team_id.like.test%,opp_team_id.like.test%')
        .then(() => console.log('✓ Cleaned test analyses'))
        .catch(err => console.log('⚠️ Failed to clean analyses:', err.message))
    );
    
    // Clean up test teams
    cleanupPromises.push(
      supabase
        .from('teams')
        .delete()
        .like('team_id', 'test%')
        .then(() => console.log('✓ Cleaned test teams'))
        .catch(err => console.log('⚠️ Failed to clean teams:', err.message))
    );
    
    // Clean up test team members
    cleanupPromises.push(
      supabase
        .from('team_members')
        .delete()
        .in('team_id', ['test_import_fixture_test', 'test_idem_test', 'test_ev_test', 'test_meta_test', 'test_slug_format_123', 'test_offline_test'])
        .then(() => console.log('✓ Cleaned test team members'))
        .catch(err => console.log('⚠️ Failed to clean team members:', err.message))
    );
    
    // Clean up test analysis win conditions and logs (cascade deletes should handle these, but let's be explicit)
    cleanupPromises.push(
      supabase
        .from('analysis_win_conditions')
        .delete()
        .in('analysis_id', [])
        .then(() => ({ success: true, message: 'win_conditions cleanup skipped (no test IDs)' }))
        .catch(error => ({ success: false, error: error.message }))
    );
    
    cleanupPromises.push(
      supabase
        .from('analysis_logs')
        .delete()
        .in('analysis_id', [])
        .then(() => ({ success: true, message: 'analysis_logs cleanup skipped (no test IDs)' }))
        .catch(error => ({ success: false, error: error.message }))
    );
    
    // Wait for all cleanup operations to complete
    Promise.allSettled(cleanupPromises).then(() => {
      console.log('🧹 Test data cleanup completed');
    });
  } else {
    console.log('🧹 No live DB credentials - skipping cleanup');
  }
}

module.exports = {
  mockSupabaseClient: mockSupabaseClient,
  installAdapter:     installAdapter,
  offlineMode:        offlineMode,
  freshCtx:           freshCtx,
  assertNoServiceRole: assertNoServiceRole,
  cleanupTestData:    cleanupTestData,
  // Re-exported convenience for tests that want a stateful per-test reset
  resetMockState:     function (seed) { mockSupabaseClient.reset(seed); }
};

// Self-test
if (require.main === module) {
  var c = mockSupabaseClient({ teams: [{ team_id: 'foo' }] });
  c.from('teams').select().eq('id', 1).order('name').limit(10).then(function (res) {
    if (!res.data || res.data.length !== 1) throw new Error('mock chain self-test failed');
  });

  var ctx = freshCtx();
  var adapter = installAdapter(ctx, { url: null, key: null, disable: true });
  if (!adapter || adapter.enabled !== false) {
    throw new Error('installAdapter self-test failed: expected enabled=false, got ' + (adapter && adapter.enabled));
  }
  console.log('✓ _db_helpers.js self-test passed');
}
