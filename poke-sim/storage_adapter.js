// storage_adapter.js — Champions Sim Dual-Layer Storage Adapter v3
// ─────────────────────────────────────────────────────────────────
// Architecture:
//   PRIMARY  → Supabase REST  (cloud, persistent, cross-device)
//   FALLBACK → localStorage   (offline cache, champions:* key schema)
//
// Backwards-compatible with v1 synchronous API.
// New async cloud API added without breaking existing callers.
//
// ── CONFIGURATION ─────────────────────────────────────────────────
// Call Storage.configure() once, as early as possible in index.html:
//
//   Storage.configure({
//     supabaseUrl: 'https://ymlahqnshgiarpbgxehp.supabase.co',
//     supabaseKey: 'eyJ...',  // anon public key ONLY — never service_role
//     userId:      'guest',   // swap for auth UID when you add login
//   });
//
// ── SYNC API (localStorage, unchanged from v1) ────────────────────
//   Storage.getSync(key)        → value | null
//   Storage.setSync(key, value) → true | false  (+fires cloud upsert)
//   Storage.del(key)            → void           (+fires cloud delete)
//   Storage.list(scope?)        → string[]
//   Storage.clearAll()          → void
//   Storage.migrate()           → void (one-time old-key migration)
//
// ── ASYNC CLOUD API ───────────────────────────────────────────────
//   await Storage.get(key)          → value | null  (cloud→LS fallback)
//   await Storage.set(key, value)   → boolean        (write-through)
//   await Storage.cloudList(scope?) → string[]
//   await Storage.sync()            → { pushed, failed } (LS→cloud lift)
//   await Storage.hydrate()         → { pulled }         (cloud→LS pull)
//   Storage.status()                → diagnostic object
//
// ── SUPABASE TABLE (sim_state, from schema_v1.sql) ────────────────
//   sim_state(
//     id          uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
//     user_id     text  NOT NULL DEFAULT 'guest',
//     key         text  NOT NULL,
//     value       jsonb,
//     updated_at  timestamptz DEFAULT now(),
//     UNIQUE(user_id, key)
//   )
//
// Export: if (typeof module !== 'undefined') module.exports = { Storage };

'use strict';

(function (root) {

  // =========================================================================
  // PRIVATE STATE
  // =========================================================================

  var _url    = '';        // set via configure()
  var _key    = '';        // anon public key — set via configure()
  var _userId = 'guest';   // set via configure()
  var _table  = 'sim_state';
  var _prefix = 'champions:';
  var _autoSync    = true;
  var _autoHydrate = true;
  var _debug  = false;

  // =========================================================================
  // INTERNAL UTILITIES
  // =========================================================================

  function _log() {
    if (!_debug) return;
    var a = Array.prototype.slice.call(arguments);
    a.unshift('[Storage]');
    console.log.apply(console, a);
  }

  function _isConfigured() {
    return !!(_url && _key && _url.indexOf('supabase.co') !== -1);
  }

  function _isOnline() {
    return typeof navigator === 'undefined' || navigator.onLine !== false;
  }

  function _endpoint() {
    return _url + '/rest/v1/' + _table;
  }

  function _headers(extra) {
    var h = {
      'Content-Type':  'application/json',
      'apikey':        _key,
      'Authorization': 'Bearer ' + _key,
      'Prefer':        'return=minimal',
    };
    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) h[k] = extra[k];
      }
    }
    return h;
  }

  // Safe fetch wrapper — never throws, logs errors.
  function _fetch(url, opts) {
    return fetch(url, opts).catch(function (e) {
      _log('fetch error', e);
      return { ok: false, status: 0, json: function() { return Promise.resolve([]); } };
    });
  }

  // =========================================================================
  // LOCAL STORAGE PRIMITIVES
  // =========================================================================

  function _ls() {
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
      if (typeof global !== 'undefined' && global.localStorage) return global.localStorage;
    } catch (e) {}
    return null;
  }

  function _lsGet(logicalKey) {
    var ls = _ls();
    if (!ls) return null;
    try {
      var raw = ls.getItem(_prefix + logicalKey);
      return raw === null ? null : JSON.parse(raw);
    } catch (e) { return null; }
  }

  function _lsSet(logicalKey, value) {
    var ls = _ls();
    if (!ls) return false;
    try { ls.setItem(_prefix + logicalKey, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  }

  function _lsDel(logicalKey) {
    var ls = _ls();
    if (!ls) return;
    try { ls.removeItem(_prefix + logicalKey); } catch (e) {}
  }

  function _lsList(scope) {
    var ls = _ls();
    if (!ls) return [];
    var result = [];
    var scopePrefix = scope ? (scope + ':') : null;
    try {
      for (var i = 0; i < ls.length; i++) {
        var rk = ls.key(i);
        if (!rk || rk.indexOf(_prefix) !== 0) continue;
        var logical = rk.slice(_prefix.length);
        if (scopePrefix && logical.indexOf(scopePrefix) !== 0) continue;
        result.push(logical);
      }
    } catch (e) {}
    return result;
  }

  // =========================================================================
  // SUPABASE CLOUD PRIMITIVES
  // =========================================================================

  function _cloudGet(logicalKey) {
    if (!_isConfigured()) return Promise.resolve(null);
    var url = _endpoint()
      + '?user_id=eq.' + encodeURIComponent(_userId)
      + '&key=eq.'     + encodeURIComponent(logicalKey)
      + '&select=value&limit=1';
    return _fetch(url, { headers: _headers() })
      .then(function (res) { return res.ok ? res.json() : Promise.resolve([]); })
      .then(function (rows) {
        if (!Array.isArray(rows) || !rows.length) return null;
        var v = rows[0].value;
        return (v !== undefined && v !== null) ? v : null;
      })
      .catch(function () { return null; });
  }

  function _cloudSet(logicalKey, value) {
    if (!_isConfigured()) return Promise.resolve(false);
    var body = JSON.stringify({
      user_id:    _userId,
      key:        logicalKey,
      value:      value,
      updated_at: new Date().toISOString(),
    });
    return _fetch(_endpoint(), {
      method:  'POST',
      headers: _headers({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
      body:    body,
    }).then(function (res) {
      var ok = res.ok || res.status === 201 || res.status === 204;
      _log('cloudSet', logicalKey, ok ? 'OK' : 'FAIL(' + res.status + ')');
      return ok;
    }).catch(function () { return false; });
  }

  function _cloudDel(logicalKey) {
    if (!_isConfigured()) return Promise.resolve();
    var url = _endpoint()
      + '?user_id=eq.' + encodeURIComponent(_userId)
      + '&key=eq.'     + encodeURIComponent(logicalKey);
    return _fetch(url, { method: 'DELETE', headers: _headers() })
      .then(function (res) { _log('cloudDel', logicalKey, res.status); })
      .catch(function () {});
  }

  function _cloudList(scope) {
    if (!_isConfigured()) return Promise.resolve([]);
    var url = _endpoint()
      + '?user_id=eq.' + encodeURIComponent(_userId)
      + '&select=key&order=key';
    if (scope) url += '&key=like.' + encodeURIComponent(scope + ':%');
    return _fetch(url, { headers: _headers() })
      .then(function (res) { return res.ok ? res.json() : Promise.resolve([]); })
      .then(function (rows) {
        return Array.isArray(rows) ? rows.map(function (r) { return r.key; }) : [];
      })
      .catch(function () { return []; });
  }

  // =========================================================================
  // PUBLIC API
  // =========================================================================

  var Storage = {

    /** Legacy prefix (v1 compat) */
    PREFIX: _prefix,

    // ─── Configuration ───────────────────────────────────────────────────────

    configure: function (opts) {
      if (!opts) return this;
      if (opts.supabaseUrl)  _url          = opts.supabaseUrl;
      if (opts.supabaseKey)  _key          = opts.supabaseKey;
      if (opts.userId)       _userId       = opts.userId;
      if (opts.table)        _table        = opts.table;
      if (opts.autoSync     !== undefined) _autoSync     = !!opts.autoSync;
      if (opts.autoHydrate  !== undefined) _autoHydrate  = !!opts.autoHydrate;
      if (opts.debug        !== undefined) _debug        = !!opts.debug;

      if (_autoHydrate && _isConfigured() && _isOnline()) {
        this.hydrate().then(function (r) { _log('autoHydrate pulled', r.pulled); });
      }
      return this;
    },

    // ─── Sync API (v1-compatible, localStorage) ───────────────────────────────

    /**
     * getSync(key) → value | null
     * Reads from localStorage only. Use for legacy ui.js code that cannot await.
     */
    getSync: function (logicalKey) {
      return _lsGet(logicalKey);
    },

    /**
     * setSync(key, value) → boolean
     * Writes to localStorage immediately. Also fires a cloud upsert (no await).
     */
    setSync: function (logicalKey, value) {
      var ok = _lsSet(logicalKey, value);
      if (_autoSync && _isConfigured() && _isOnline()) {
        _cloudSet(logicalKey, value).catch(function () {});
      }
      return ok;
    },

    /**
     * del(key) → void
     * Removes from localStorage and fires cloud delete.
     */
    del: function (logicalKey) {
      _lsDel(logicalKey);
      if (_isConfigured() && _isOnline()) {
        _cloudDel(logicalKey).catch(function () {});
      }
    },

    /**
     * list(scope?) → string[]   [SYNC — localStorage only]
     * Returns logical keys matching optional scope prefix.
     */
    list: function (scope) {
      return _lsList(scope);
    },

    /**
     * clearAll() → void
     * Removes all champions:* keys from localStorage only.
     * Does not touch Supabase (intentional — prevents accidental data loss).
     * To clear Supabase rows, call Storage.cloudClearUser() explicitly.
     */
    clearAll: function () {
      var keys = _lsList();
      for (var i = 0; i < keys.length; i++) { _lsDel(keys[i]); }
    },

    /**
     * migrate() → void
     * One-time idempotent migration from legacy key schema.
     */
    migrate: function () {
      var MIGRATIONS = [
        { oldKey: 'champions_sim_custom_teams_v1',     newLogical: 'teams:custom'        },
        { oldKey: 'poke-sim:bring:v1',                 newLogical: 'bring:default'       },
        { oldKey: 'champions_strategy_report_v1',      newLogical: 'strategy:report'     },
        { oldKey: 'champions_sim_preloaded_overrides', newLogical: 'overrides:preloaded' },
      ];
      var ls = _ls();
      if (!ls) return;
      for (var i = 0; i < MIGRATIONS.length; i++) {
        var m = MIGRATIONS[i];
        var raw = null;
        try { raw = ls.getItem(m.oldKey); } catch (e) {}
        if (raw === null) continue;
        if (_lsGet(m.newLogical) !== null) { try { ls.removeItem(m.oldKey); } catch(e){} continue; }
        var parsed;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
        _lsSet(m.newLogical, parsed);
        try { ls.removeItem(m.oldKey); } catch (e) {}
      }
    },

    // ─── Async Cloud API ──────────────────────────────────────────────────────

    /**
     * get(key) → Promise<value|null>
     * Cloud-first; falls back to localStorage on miss or error.
     */
    get: function (logicalKey) {
      return _cloudGet(logicalKey).then(function (val) {
        if (val !== null) return val;
        return _lsGet(logicalKey);
      });
    },

    /**
     * set(key, value) → Promise<boolean>
     * Write-through: localStorage immediately, then cloud.
     */
    set: function (logicalKey, value) {
      _lsSet(logicalKey, value);
      return _cloudSet(logicalKey, value);
    },

    /**
     * cloudList(scope?) → Promise<string[]>
     * Lists keys from Supabase; falls back to localStorage list.
     */
    cloudList: function (scope) {
      return _cloudList(scope).then(function (keys) {
        return keys.length > 0 ? keys : _lsList(scope);
      });
    },

    /**
     * sync() → Promise<{pushed, failed}>
     * Pushes all local keys up to Supabase.
     * Use when coming back online or for first-time seeding.
     */
    sync: function () {
      if (!_isConfigured()) return Promise.resolve({ pushed: 0, failed: 0 });
      var keys = _lsList();
      var pushed = 0, failed = 0;
      var chain = Promise.resolve();
      keys.forEach(function (k) {
        chain = chain.then(function () {
          var v = _lsGet(k);
          if (v === null) return;
          return _cloudSet(k, v).then(function (ok) {
            if (ok) pushed++; else failed++;
          });
        });
      });
      return chain.then(function () {
        _log('sync done — pushed:', pushed, 'failed:', failed);
        return { pushed: pushed, failed: failed };
      });
    },

    /**
     * hydrate() → Promise<{pulled}>
     * Pulls all cloud rows for this user into localStorage.
     * Cloud wins on conflict.
     */
    hydrate: function () {
      if (!_isConfigured()) return Promise.resolve({ pulled: 0 });
      var url = _endpoint()
        + '?user_id=eq.' + encodeURIComponent(_userId)
        + '&select=key,value';
      return _fetch(url, { headers: _headers() })
        .then(function (res) {
          return res.ok ? res.json() : Promise.resolve([]);
        })
        .then(function (rows) {
          if (!Array.isArray(rows) || !rows.length) return { pulled: 0 };
          rows.forEach(function (row) {
            try { _lsSet(row.key, row.value); } catch (e) {}
          });
          _log('hydrate pulled', rows.length, 'rows');
          return { pulled: rows.length };
        })
        .catch(function (e) { _log('hydrate error', e); return { pulled: 0 }; });
    },

    /**
     * cloudClearUser() → Promise<void>
     * Deletes ALL Supabase rows for the current userId. Irreversible.
     */
    cloudClearUser: function () {
      if (!_isConfigured()) return Promise.resolve();
      var url = _endpoint() + '?user_id=eq.' + encodeURIComponent(_userId);
      return _fetch(url, { method: 'DELETE', headers: _headers() })
        .then(function () { _log('cloudClearUser done'); })
        .catch(function (e) { _log('cloudClearUser error', e); });
    },

    // ─── Diagnostics ──────────────────────────────────────────────────────────

    status: function () {
      return {
        configured:    _isConfigured(),
        online:        _isOnline(),
        userId:        _userId,
        supabaseUrl:   _url,
        table:         _table,
        autoSync:      _autoSync,
        autoHydrate:   _autoHydrate,
        localKeyCount: _lsList().length,
        localKeys:     _lsList(),
      };
    },
  };

  // =========================================================================
  // EXPORT
  // =========================================================================
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Storage: Storage };
  } else {
    root.Storage = Storage;
  }

}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this));
