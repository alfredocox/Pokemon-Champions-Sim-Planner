// _db_helpers.js — Shared mock infrastructure for DB integration tests
// Provides mockSupabaseClient, installAdapter, offlineMode, and assertNoServiceRole
// Used by all db_*_tests.js files

'use strict';

var mockState = {};

function _chain() {
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
    single: function () { return Promise.resolve({ data: null, error: null }); },
    then:   function (resolve) { return resolve({ data: [], error: null }); }
  };
  return self;
}

function mockSupabaseClient(state) {
  mockState = state || {};
  return {
    from: function (table) {
      return _chain();
    },
    auth: {
      getSession: function () { return Promise.resolve({ data: { session: null }, error: null }); }
    }
  };
}

function installAdapter(ctx, opts) {
  opts = opts || {};
  // Set up globals for supabase adapter
  ctx.window.__SUPABASE_URL__ = opts.url || null;
  ctx.window.__SUPABASE_KEY__ = opts.key || null;

  // Load the actual supabase adapter into the provided VM context
  var path = require('path');
  var fs = require('fs');
  var adapterPath = path.resolve(__dirname, '..', 'supabase_adapter.js');
  var adapterCode = fs.readFileSync(adapterPath, 'utf8');
  var vm = require('vm');
  vm.runInContext(adapterCode, ctx);

  return ctx.window.SupabaseAdapter;
}

function offlineMode(ctx) {
  ctx.window.__SUPABASE_URL__ = null;
  ctx.window.__SUPABASE_KEY__ = null;
  // Reload adapter to clear any cached state
  var path = require('path');
  var fs = require('fs');
  var adapterPath = path.resolve(__dirname, '..', 'supabase_adapter.js');
  var adapterCode = fs.readFileSync(adapterPath, 'utf8');
  var vm = require('vm');
  vm.runInContext(adapterCode, ctx);
}

function assertNoServiceRole(filepath) {
  var fs = require('fs');
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
  installAdapter: installAdapter,
  offlineMode: offlineMode,
  assertNoServiceRole: assertNoServiceRole
};

// Self-test
if (require.main === module) {
  // sanity: the chain must be callable without throwing
  var c = mockSupabaseClient({});
  c.from('teams').select().eq('id', 1).order('name').limit(10);
  console.log('✓ _db_helpers.js self-test passed');
}
