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
    return { data: rows, error: null };
  }

  var self = {
    select: function () { return self; },
    insert: function (rows) { pendingInsert = rows; return self; },
    upsert: function (rows) { pendingInsert = rows; return self; },
    update: function () { return self; },
    delete: function () { return self; },
    eq:     function () { return self; },
    in:     function () { return self; },
    order:  function () { return self; },
    limit:  function () { return self; },
    single: function () { var r = _resolveResult(); return Promise.resolve({ data: (r.data && r.data[0]) || null, error: r.error }); },
    then:   function (resolve) { return resolve(_resolveResult()); }
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
  var sandbox = {
    console:        console,
    window:         fakeWindow,
    document: {
      getElementById:    function () { return null; },
      addEventListener:  function () {},
      removeEventListener: function () {}
    },
    crypto: { randomUUID: function () { return '00000000-0000-4000-8000-000000000000'; } },
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

  // Inject creds / disable flag onto window before evaluating the adapter IIFE.
  // 'url' or 'key' set to null means: do not provide that credential.
  // Default behavior (no opts): wire up creds + the stateful mock client so
  // SupabaseAdapter is enabled and writes flow through mockState.
  var bareCall = (opts.url === undefined && opts.key === undefined && !opts.disable && !opts.mockClient);
  if (bareCall) {
    mockSupabaseClient.reset();
    ctx.window.__SUPABASE_URL__ = 'https://mock.supabase.test';
    ctx.window.__SUPABASE_KEY__ = 'mock-anon-key';
    ctx.window.__DISABLE_SUPABASE__ = false;
    ctx.window.supabase = { createClient: function () { return mockSupabaseClient.client(); } };
  } else {
    ctx.window.__SUPABASE_URL__ = (opts.url === undefined)     ? null : opts.url;
    ctx.window.__SUPABASE_KEY__ = (opts.key === undefined)     ? null : opts.key;
    ctx.window.__DISABLE_SUPABASE__ = !!opts.disable;
    if (opts.mockClient) {
      ctx.window.supabase = {
        createClient: function () { return opts.mockClient; }
      };
    }
  }

  var adapterCode = fs.readFileSync(ADAPTER_PATH, 'utf8');
  vm.runInContext(adapterCode, ctx);

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

module.exports = {
  mockSupabaseClient: mockSupabaseClient,
  installAdapter:     installAdapter,
  offlineMode:        offlineMode,
  assertNoServiceRole: assertNoServiceRole,
  freshCtx:           freshCtx,
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
