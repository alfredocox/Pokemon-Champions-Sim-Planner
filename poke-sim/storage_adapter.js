// storage_adapter.js — Supabase-backed storage adapter for Champions Sim
// Project: ymlahqnshgiarpbgxehp.supabase.co
//
// Architecture:
//   • Primary store  → Supabase REST (anon key, kv_store table)
//   • Fallback store → localStorage (champions:* key schema — unchanged from v1)
//   • Write-through  → every set() writes localStorage AND Supabase
//   • Async API:     Storage.get / .set / .del / .list / .clearAll return Promises
//   • Sync shims:    Storage.getSync / .setSync  use localStorage only
//                    (for legacy ui.js paths that cannot await)
//
// Supabase table (see db/schema_v1.sql):
//   kv_store(id uuid pk DEFAULT gen_random_uuid(),
//            logical_key text UNIQUE NOT NULL,
//            payload jsonb,
//            updated_at timestamptz DEFAULT now())
//
// Usage:
//   await Storage.set('teams:custom', teamObj)   // upserts Supabase + LS cache
//   await Storage.get('teams:custom')            // Supabase first, LS fallback
//   await Storage.del('teams:custom')            // removes from both
//   await Storage.list()                         // all logical keys from Supabase
//   await Storage.list('teams')                  // keys starting with 'teams:'
//   await Storage.clearAll()                     // all rows + all LS champions:*
//   Storage.getSync('teams:custom')              // localStorage only (sync)
//   Storage.setSync('teams:custom', obj)         // LS sync + fire-and-forget Supabase
//   await Storage.migrate()                      // one-time LS → Supabase lift
//   await Storage.ready                          // true when client confirmed live

'use strict';

(function (root) {

  // ---------------------------------------------------------------------------
  // Config
  // ---------------------------------------------------------------------------

  var SUPABASE_URL  = 'https://ymlahqnshgiarpbgxehp.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbGFocW5zaGdpYXJwYmd4ZWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ4MDksImV4cCI6MjA5MjgxMDgwOX0.umWnzknxpIAIudKFd5csxyDw_rukAL9qcxsVPXeifHo';

  // Generic key→value table.  Schema must have:
  //   logical_key text UNIQUE, payload jsonb, updated_at timestamptz
  // If you used a different table name in schema_v1.sql, change KV_TABLE here.
  var KV_TABLE = 'kv_store';

  var LS_PREFIX = 'champions:';

  // ---------------------------------------------------------------------------
  // Supabase REST helpers  (no SDK — pure fetch)
  // ---------------------------------------------------------------------------

  function _authHeaders(extra) {
    var h = {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_ANON,
      'Authorization': 'Bearer ' + SUPABASE_ANON,
    };
    if (extra) Object.assign(h, extra);
    return h;
  }

  function _sbGet(logicalKey) {
    var url = SUPABASE_URL + '/rest/v1/' + KV_TABLE
            + '?logical_key=eq.' + encodeURIComponent(logicalKey)
            + '&select=payload&limit=1';
    return fetch(url, { method: 'GET', headers: _authHeaders() })
      .then(function (res) { return res.ok ? res.json() : Promise.resolve([]); })
      .then(function (rows) {
        return (Array.isArray(rows) && rows.length > 0) ? rows[0].payload : null;
      })
      .catch(function () { return null; });
  }

  function _sbSet(logicalKey, value) {
    var url = SUPABASE_URL + '/rest/v1/' + KV_TABLE;
    var headers = _authHeaders({
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    });
    var body = JSON.stringify({
      logical_key: logicalKey,
      payload: value,
      updated_at: new Date().toISOString()
    });
    return fetch(url, { method: 'POST', headers: headers, body: body })
      .then(function (res) { return res.ok || res.status === 201 || res.status === 204; })
      .catch(function () { return false; });
  }

  function _sbDel(logicalKey) {
    var url = SUPABASE_URL + '/rest/v1/' + KV_TABLE
            + '?logical_key=eq.' + encodeURIComponent(logicalKey);
    return fetch(url, { method: 'DELETE', headers: _authHeaders({ 'Prefer': 'return=minimal' }) })
      .then(function () {})
      .catch(function () {});
  }

  function _sbList(scope) {
    var pattern = scope ? (scope + ':%') : '%';
    var url = SUPABASE_URL + '/rest/v1/' + KV_TABLE
            + '?logical_key=like.' + encodeURIComponent(pattern)
            + '&select=logical_key&order=logical_key';
    return fetch(url, { method: 'GET', headers: _authHeaders() })
      .then(function (res) { return res.ok ? res.json() : Promise.resolve([]); })
      .then(function (rows) {
        return Array.isArray(rows) ? rows.map(function (r) { return r.logical_key; }) : [];
      })
      .catch(function () { return []; });
  }

  function _sbClearAll() {
    // Delete every row whose logical_key is not the empty string
    var url = SUPABASE_URL + '/rest/v1/' + KV_TABLE
            + '?logical_key=neq.';
    return fetch(url, { method: 'DELETE', headers: _authHeaders({ 'Prefer': 'return=minimal' }) })
      .then(function () {})
      .catch(function () {});
  }

  // Connectivity probe — resolves true if Supabase is reachable
  var _sbOnline = fetch(SUPABASE_URL + '/rest/v1/' + KV_TABLE + '?select=logical_key&limit=1', {
    method: 'GET', headers: _authHeaders()
  }).then(function (res) { return res.ok || res.status === 406; }) // 406 = no rows, still reachable
    .catch(function () { return false; });

  // ---------------------------------------------------------------------------
  // localStorage helpers  (sync, unchanged from v1)
  // ---------------------------------------------------------------------------

  function _ls() {
    try {
      return (typeof localStorage !== 'undefined') ? localStorage
           : (typeof global !== 'undefined' && global.localStorage ? global.localStorage : null);
    } catch (e) { return null; }
  }

  function _lsGet(logicalKey) {
    var ls = _ls();
    if (!ls) return null;
    try {
      var raw = ls.getItem(LS_PREFIX + logicalKey);
      return raw === null ? null : JSON.parse(raw);
    } catch (e) { return null; }
  }

  function _lsSet(logicalKey, value) {
    var ls = _ls();
    if (!ls) return false;
    try { ls.setItem(LS_PREFIX + logicalKey, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function _lsDel(logicalKey) {
    var ls = _ls();
    if (!ls) return;
    try { ls.removeItem(LS_PREFIX + logicalKey); } catch (e) {}
  }

  function _lsList(scope) {
    var ls = _ls();
    if (!ls) return [];
    var result = [];
    var scopePrefix = scope ? (scope + ':') : null;
    try {
      for (var i = 0; i < ls.length; i++) {
        var rawKey = ls.key(i);
        if (!rawKey || rawKey.indexOf(LS_PREFIX) !== 0) continue;
        var logical = rawKey.slice(LS_PREFIX.length);
        if (scopePrefix && logical.indexOf(scopePrefix) !== 0) continue;
        result.push(logical);
      }
    } catch (e) {}
    return result;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  var Storage = {

    /** Resolves true when Supabase is confirmed reachable, false otherwise */
    ready: _sbOnline,

    /** Legacy prefix constant (unchanged from v1) */
    PREFIX: LS_PREFIX,

    /**
     * get(logicalKey) → Promise<value|null>
     * Supabase first; localStorage fallback on error/miss.
     */
    get: function (logicalKey) {
      return _sbGet(logicalKey).then(function (val) {
        if (val !== null) return val;
        return _lsGet(logicalKey); // Supabase miss → try LS cache
      });
    },

    /**
     * set(logicalKey, value) → Promise<boolean>
     * Write-through: localStorage immediately, Supabase async.
     */
    set: function (logicalKey, value) {
      _lsSet(logicalKey, value); // synchronous cache write
      return _sbSet(logicalKey, value);
    },

    /**
     * del(logicalKey) → Promise<void>
     */
    del: function (logicalKey) {
      _lsDel(logicalKey);
      return _sbDel(logicalKey);
    },

    /**
     * list(scope?) → Promise<string[]>
     * Returns logical keys from Supabase; LS fallback.
     */
    list: function (scope) {
      return _sbList(scope).then(function (keys) {
        return keys.length > 0 ? keys : _lsList(scope);
      });
    },

    /**
     * clearAll() → Promise<void>
     */
    clearAll: function () {
      _lsList().forEach(function (k) { _lsDel(k); });
      return _sbClearAll();
    },

    // -------------------------------------------------------------------------
    // Sync shims — localStorage only (for ui.js paths that cannot await)
    // -------------------------------------------------------------------------

    /** Sync read from localStorage cache only */
    getSync: function (logicalKey) {
      return _lsGet(logicalKey);
    },

    /** Sync write to localStorage; also fires async Supabase upsert */
    setSync: function (logicalKey, value) {
      _lsSet(logicalKey, value);
      _sbSet(logicalKey, value).catch(function () {}); // fire-and-forget
      return true;
    },

    // -------------------------------------------------------------------------
    // Migration — one-time localStorage → Supabase lift
    // -------------------------------------------------------------------------

    /**
     * migrate() → Promise<void>
     * Idempotent. Safe to call on every app init.
     */
    migrate: function () {
      var self = this;
      var MIGRATIONS = [
        { oldKey: 'champions_sim_custom_teams_v1',     newLogical: 'teams:custom'        },
        { oldKey: 'poke-sim:bring:v1',                 newLogical: 'bring:default'       },
        { oldKey: 'champions_strategy_report_v1',      newLogical: 'strategy:report'     },
        { oldKey: 'champions_sim_preloaded_overrides', newLogical: 'overrides:preloaded' },
      ];

      var ls = _ls();
      if (!ls) return Promise.resolve();

      var tasks = MIGRATIONS.map(function (m) {
        var raw = null;
        try { raw = ls.getItem(m.oldKey); } catch (e) {}
        if (raw === null) return Promise.resolve();

        var parsed;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }

        return self.get(m.newLogical).then(function (existing) {
          try { ls.removeItem(m.oldKey); } catch (e) {}
          if (existing !== null) return Promise.resolve(); // already migrated
          return self.set(m.newLogical, parsed);
        });
      });

      return Promise.all(tasks).then(function () {});
    },
  };

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Storage: Storage };
  } else {
    root.Storage = Storage;
  }

}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this));
