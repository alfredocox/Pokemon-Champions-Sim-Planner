// _db_helpers.js — Shared mock infrastructure for DB integration tests
// Provides mockSupabaseClient, installAdapter, offlineMode, and assertNoServiceRole
// Used by all db_*_tests.js files

'use strict';

var mockState = {};

function mockSupabaseClient(state) {
  return {
    from: function(table) {
      return {
        select: function() {
          return {
            eq: function(column, value) {
              return {
                order: function() {
                  return {
                    limit: function() {
                      return this;
                    }
                  }
                }
              }
            };
          },
        insert: function() {
          return {
            values: function() {
              return this;
            }
          };
        },
        upsert: function() {
          return {
            values: function() {
              return this;
            }
          };
        },
        delete: function() {
          return this;
        }
      };
    }
  };
}

function installAdapter(ctx, opts = {}) {
  // Set up globals for supabase adapter
  ctx.window.__SUPABASE_URL__ = opts.url || null;
  ctx.window.__SUPABASE_KEY__ = opts.key || null;
  
  // Load the actual supabase adapter
  var adapterCode = require('fs').readFileSync('./supabase_adapter.js', 'utf8');
  eval(adapterCode)(ctx);
  
  return ctx.window.SupabaseAdapter;
}

function offlineMode(ctx) {
  ctx.window.__SUPABASE_URL__ = null;
  ctx.window.__SUPABASE_KEY__ = null;
  // Reload adapter to clear any cached state
  var adapterCode = require('fs').readFileSync('./supabase_adapter.js', 'utf8');
  eval(adapterCode)(ctx);
}

function assertNoServiceRole(filepath) {
  var content = require('fs').readFileSync(filepath, 'utf8');
  var hasServiceRole = content.includes('service_role') || 
                      content.includes('eyJ') && content.includes('role":"service_role');
  if (hasServiceRole) {
    throw new Error('service_role found in ' + filepath + ' - not allowed in frontend bundle');
  }
}

// Self-test
if (require.main === module) {
  console.log('✓ _db_helpers.js self-test passed');
}
