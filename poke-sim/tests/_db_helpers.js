// _db_helpers.js — Shared mock infrastructure for DB integration tests
// Provides mockSupabaseClient, installAdapter, offlineMode, assertNoServiceRole, freshCtx
// Used by all db_*_tests.js files

'use strict';

var path = require('path');
var fs   = require('fs');
var vm   = require('vm');

var ADAPTER_PATH = path.resolve(__dirname, '..', 'supabase_adapter.js');

// ─── Mock supabase-js client ────────────────────────────────────────────────
var mockState = {};

function _chain(table, state) {
  // Each operation returns `self` so the test can call select().eq().limit()...
  // The terminal `.then` resolves with whatever state[table] holds.
  var rows = (state && state[table]) || [];
  var self = {
    select: function () { return self; },
    insert: function () { return self; },
    upsert: function () { return self; },
    update: function () { return self; },
    delete: function () { return self; },
    eq:     function () { return self; },
    in:     function () { return self; },
    order:  function () { return self; },
    limit:  function () { return self; },
    single: function () { return Promise.resolve({ data: rows[0] || null, error: null }); },
    then:   function (resolve) { return resolve({ data: rows, error: null }); }
  };
  return self;
}

function mockSupabaseClient(state) {
  mockState = state || {};
  return {
    from: function (table) { return _chain(table, mockState); },
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: null }, error: null }); }
    }
  };
}

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
  ctx.window.__SUPABASE_URL__ = (opts.url === undefined)     ? null : opts.url;
  ctx.window.__SUPABASE_KEY__ = (opts.key === undefined)     ? null : opts.key;
  ctx.window.__DISABLE_SUPABASE__ = !!opts.disable;

  // Install a mocked supabase-js if requested
  if (opts.mockClient) {
    ctx.window.supabase = {
      createClient: function () { return opts.mockClient; }
    };
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
  freshCtx:           freshCtx
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
