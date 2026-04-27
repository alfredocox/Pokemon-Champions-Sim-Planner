// storage_adapter.js — Dual-layer storage: Supabase (primary) + localStorage (fallback)
// Project: Champions Sim 2026 | Issue #79
//
// Architecture:
//   1. All writes go to BOTH Supabase AND localStorage simultaneously.
//   2. Reads prefer Supabase; fall back to localStorage on any error.
//   3. The existing synchronous Storage API is preserved for backward compat.
//   4. SupabaseStorage exposes async versions: getAsync / setAsync / delAsync / listAsync.
//   5. On page load, call SupabaseStorage.init() once. It hydrates localStorage
//      from Supabase so the synchronous API works immediately.
//
// Supabase config:
//   Project ref : ymlahqnshgiarpbgxehp
//   Anon key    : (embedded below — anon/public, safe for client bundles)
//   Table       : kv_store  { id, user_session, key TEXT, value JSONB, updated_at }
//
// Synchronous API (unchanged — backward compatible):
//   Storage.set(logicalKey, value)   → true | false
//   Storage.get(logicalKey)          → parsed value | null
//   Storage.del(logicalKey)          → void
//   Storage.list(scope?)             → string[]
//   Storage.clearAll()               → void
//   Storage.migrate()                → void  (one-time legacy key migration)
//
// Async API (new — preferred for network ops):
//   await SupabaseStorage.init()               → hydrates localStorage from DB
//   await SupabaseStorage.setAsync(key, value) → { data, error }
//   await SupabaseStorage.getAsync(key)        → value | null
//   await SupabaseStorage.delAsync(key)        → { data, error }
//   await SupabaseStorage.listAsync(scope?)    → string[]
//   await SupabaseStorage.syncToCloud()        → pushes all local keys to Supabase
//   await SupabaseStorage.syncFromCloud()      → pulls all cloud keys into localStorage
//   SupabaseStorage.isAvailable()             → boolean
//
// Export contract (Node.js test harness):
//   if (typeof module !== 'undefined') module.exports = { Storage, SupabaseStorage };

'use strict';

(function (root) {

  // =========================================================================
  // SUPABASE CONFIG
  // =========================================================================

  var SUPABASE_URL  = 'https://ymlahqnshgiarpbgxehp.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbGFocW5zaGdpYXJwYmd4ZWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ4MDksImV4cCI6MjA5MjgxMDgwOX0.umWnzknxpIAIudKFd5csxyDw_rukAL9qcxsVPXeifHo';
  var KV_TABLE      = 'kv_store';

  // Session tag — anonymous per-device identity (no auth required).
  // Random UUID generated in memory per page load (no localStorage needed).
  var _sessionId = (function () {
    var id = null;
    return function () {
      if (!id) {
        id = 'anon-' + Math.random().toString(36).slice(2, 10) +
             '-' + Math.random().toString(36).slice(2, 10);
      }
      return id;
    };
  }());

  // =========================================================================
  // INTERNAL HELPERS
  // =========================================================================

  function _ls() {
    return (typeof localStorage !== 'undefined')
      ? localStorage
      : (typeof global !== 'undefined' && global.localStorage ? global.localStorage : null);
  }

  /**
   * _sbFetch(method, path, body?) → Promise<{data, error}>
   * Thin wrapper around fetch() targeting the Supabase PostgREST API.
   */
  function _sbFetch(method, path, body) {
    var url     = SUPABASE_URL + '/rest/v1/' + path;
    var headers = {
      'apikey':        SUPABASE_ANON,
      'Authorization': 'Bearer ' + SUPABASE_ANON,
      'Content-Type':  'application/json',
      'Prefer':        'return=representation,resolution=merge-duplicates',
    };
    var opts = { method: method, headers: headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    return fetch(url, opts)
      .then(function (res) {
        if (res.status === 204) return { data: [], error: null };
        return res.json().then(function (json) {
          if (!res.ok) return { data: null, error: new Error(JSON.stringify(json)) };
          return { data: json, error: null };
        });
      })
      .catch(function (err) {
        return { data: null, error: err };
      });
  }

  // =========================================================================
  // SUPABASE STORAGE — Async API
  // =========================================================================

  var SupabaseStorage = {

    _ready:     false,
    _reachable: false,

    /** Returns true if Supabase was reachable during init(). */
    isAvailable: function () { return this._reachable; },

    /**
     * init() → Promise<void>
     * Call ONCE on page load (e.g. after DOMContentLoaded).
     * Pulls cloud data into localStorage so the sync API works immediately.
     * Idempotent after first successful call.
     */
    init: function () {
      var self = this;
      if (self._ready) return Promise.resolve();

      return self.syncFromCloud()
        .then(function () {
          self._ready     = true;
          self._reachable = true;
          console.info('[SupabaseStorage] init OK — cloud sync complete.');
        })
        .catch(function (err) {
          self._reachable = false;
          console.warn('[SupabaseStorage] init failed — running localStorage-only.', err);
        });
    },

    /**
     * setAsync(key, value) → Promise<{data, error}>
     * Write-through: localStorage written immediately, then Supabase upserted.
     */
    setAsync: function (key, value) {
      Storage.set(key, value); // synchronous write-through

      var row = {
        user_session: _sessionId(),
        key:          'champions:' + key,
        value:        value,
        updated_at:   new Date().toISOString(),
      };

      return _sbFetch('POST', KV_TABLE + '?on_conflict=user_session,key', row)
        .catch(function (err) {
          console.warn('[SupabaseStorage] setAsync cloud write failed:', key, err);
          return { data: null, error: err };
        });
    },

    /**
     * getAsync(key) → Promise<value | null>
     * Tries Supabase first; falls back to localStorage.
     */
    getAsync: function (key) {
      var fullKey = 'champions:' + key;
      var session = _sessionId();
      var qs      = '?user_session=eq.' + encodeURIComponent(session) +
                    '&key=eq.' + encodeURIComponent(fullKey) + '&limit=1';

      return _sbFetch('GET', KV_TABLE + qs)
        .then(function (result) {
          if (result.error || !result.data || result.data.length === 0) {
            return Storage.get(key); // cloud miss → localStorage fallback
          }
          return result.data[0].value;
        })
        .catch(function () { return Storage.get(key); });
    },

    /**
     * delAsync(key) → Promise<{data, error}>
     * Deletes from localStorage AND Supabase.
     */
    delAsync: function (key) {
      Storage.del(key);

      var fullKey = 'champions:' + key;
      var session = _sessionId();
      var qs      = '?user_session=eq.' + encodeURIComponent(session) +
                    '&key=eq.' + encodeURIComponent(fullKey);

      return _sbFetch('DELETE', KV_TABLE + qs)
        .catch(function (err) {
          console.warn('[SupabaseStorage] delAsync cloud delete failed:', key, err);
          return { data: null, error: err };
        });
    },

    /**
     * listAsync(scope?) → Promise<string[]>
     * Returns logical keys (prefix stripped) from Supabase.
     * Falls back to Storage.list() on error.
     */
    listAsync: function (scope) {
      var session = _sessionId();
      var qs      = '?user_session=eq.' + encodeURIComponent(session) +
                    '&select=key&order=key.asc';

      return _sbFetch('GET', KV_TABLE + qs)
        .then(function (result) {
          if (result.error || !result.data) return Storage.list(scope);

          var PREFIX   = 'champions:';
          var scopePfx = scope ? ('champions:' + scope + ':') : null;

          return result.data
            .map(function (row) { return row.key; })
            .filter(function (k) {
              if (k.indexOf(PREFIX) !== 0) return false;
              if (scopePfx && k.indexOf(scopePfx) !== 0) return false;
              return true;
            })
            .map(function (k) { return k.slice(PREFIX.length); });
        })
        .catch(function () { return Storage.list(scope); });
    },

    /**
     * syncToCloud() → Promise<void>
     * Batch-upserts every champions:* localStorage key into Supabase.
     * Use for first-time migration of existing local save data.
     */
    syncToCloud: function () {
      var keys = Storage.list();
      if (keys.length === 0) return Promise.resolve();

      var session = _sessionId();
      var now     = new Date().toISOString();

      var rows = keys.map(function (k) {
        return {
          user_session: session,
          key:          'champions:' + k,
          value:        Storage.get(k),
          updated_at:   now,
        };
      });

      return _sbFetch('POST', KV_TABLE + '?on_conflict=user_session,key', rows)
        .then(function (result) {
          if (result.error) {
            console.warn('[SupabaseStorage] syncToCloud error:', result.error);
          } else {
            console.info('[SupabaseStorage] syncToCloud OK —', keys.length, 'keys pushed.');
          }
        })
        .catch(function (err) {
          console.warn('[SupabaseStorage] syncToCloud failed:', err);
        });
    },

    /**
     * syncFromCloud() → Promise<void>
     * Pulls all cloud rows for this session into localStorage.
     * Called automatically by init().
     */
    syncFromCloud: function () {
      var session = _sessionId();
      var qs      = '?user_session=eq.' + encodeURIComponent(session) +
                    '&select=key,value&order=key.asc';

      return _sbFetch('GET', KV_TABLE + qs)
        .then(function (result) {
          if (result.error || !result.data) return;
          var PREFIX = 'champions:';
          result.data.forEach(function (row) {
            if (!row.key || row.key.indexOf(PREFIX) !== 0) return;
            Storage.set(row.key.slice(PREFIX.length), row.value);
          });
          console.info('[SupabaseStorage] syncFromCloud OK —',
            result.data.length, 'keys hydrated.');
        });
    },

    /**
     * clearAllAsync() → Promise<void>
     * Wipes localStorage AND all cloud rows for this session.
     */
    clearAllAsync: function () {
      Storage.clearAll();
      var session = _sessionId();
      return _sbFetch('DELETE', KV_TABLE + '?user_session=eq.' + encodeURIComponent(session))
        .catch(function (err) {
          console.warn('[SupabaseStorage] clearAllAsync cloud delete failed:', err);
        });
    },

  };

  // =========================================================================
  // SYNCHRONOUS STORAGE — localStorage API (unchanged, backward compatible)
  // =========================================================================

  var Storage = {

    PREFIX: 'champions:',

    get: function (logicalKey) {
      var ls = _ls();
      if (!ls) return null;
      try {
        var raw = ls.getItem(this.PREFIX + logicalKey);
        return raw === null ? null : JSON.parse(raw);
      } catch (e) { return null; }
    },

    set: function (logicalKey, value) {
      var ls = _ls();
      if (!ls) return false;
      try {
        ls.setItem(this.PREFIX + logicalKey, JSON.stringify(value));
        return true;
      } catch (e) { return false; }
    },

    del: function (logicalKey) {
      var ls = _ls();
      if (!ls) return;
      try { ls.removeItem(this.PREFIX + logicalKey); } catch (e) {}
    },

    list: function (scope) {
      var ls = _ls();
      if (!ls) return [];
      var result      = [];
      var prefix      = this.PREFIX;
      var scopePrefix = scope ? (scope + ':') : null;
      try {
        for (var i = 0; i < ls.length; i++) {
          var rawKey = ls.key(i);
          if (!rawKey || rawKey.indexOf(prefix) !== 0) continue;
          var logical = rawKey.slice(prefix.length);
          if (scopePrefix && logical.indexOf(scopePrefix) !== 0) continue;
          result.push(logical);
        }
      } catch (e) {}
      return result;
    },

    clearAll: function () {
      var keys = this.list();
      for (var i = 0; i < keys.length; i++) { this.del(keys[i]); }
    },

    migrate: function () {
      var ls = _ls();
      if (!ls) return;
      var MIGRATIONS = [
        { oldKey: 'champions_sim_custom_teams_v1',     newLogical: 'teams:custom'        },
        { oldKey: 'poke-sim:bring:v1',                 newLogical: 'bring:default'       },
        { oldKey: 'champions_strategy_report_v1',      newLogical: 'strategy:report'     },
        { oldKey: 'champions_sim_preloaded_overrides', newLogical: 'overrides:preloaded' },
      ];
      for (var i = 0; i < MIGRATIONS.length; i++) {
        var m   = MIGRATIONS[i];
        var raw = ls.getItem(m.oldKey);
        if (raw === null) continue;
        if (this.get(m.newLogical) !== null) { ls.removeItem(m.oldKey); continue; }
        var parsed;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
        this.set(m.newLogical, parsed);
        ls.removeItem(m.oldKey);
      }
    },

  };

  // =========================================================================
  // EXPORT
  // =========================================================================
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Storage: Storage, SupabaseStorage: SupabaseStorage };
  } else {
    root.Storage         = Storage;
    root.SupabaseStorage = SupabaseStorage;
  }

}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this));
