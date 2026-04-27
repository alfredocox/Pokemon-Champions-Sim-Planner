// storage_adapter.js — Supabase-backed adapter for Champions Sim
// Replaces localStorage with Supabase `champions_kv` table.
//
// Public API (unchanged from v1):
//   Storage.get(logicalKey)        → Promise<value|null>
//   Storage.set(logicalKey, value) → Promise<boolean>
//   Storage.del(logicalKey)        → Promise<void>
//   Storage.list(scope?)           → Promise<string[]>
//   Storage.clearAll()             → Promise<void>
//   Storage.migrate()              → Promise<void>
//
// Supabase table expected (see db/schema_v1.sql):
//   champions_kv(id uuid, key text UNIQUE, value jsonb, updated_at timestamptz)
//
// All methods return Promises. Callers that previously used synchronous
// return values should await or .then() the result.
//
// Graceful degradation: if Supabase is unreachable, falls back silently
// (get→null, set→false, del/list→empty).

'use strict';

(function (root) {

  // ── Supabase config ────────────────────────────────────────────────────────
  var SUPABASE_URL  = 'https://ymlahqnshgiarpbgxehp.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbGFocW5zaGdpYXJwYmd4ZWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ4MDksImV4cCI6MjA5MjgxMDgwOX0.umWnzknxpIAIudKFd5csxyDw_rukAL9qcxsVPXeifHo';
  var TABLE         = 'champions_kv';
  var PREFIX        = 'champions:';

  // ── Low-level REST helper ──────────────────────────────────────────────────

  function _headers() {
    return {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_ANON,
      'Authorization': 'Bearer ' + SUPABASE_ANON,
      'Prefer':        'return=minimal',
    };
  }

  /**
   * _rest(method, path, body?) → Promise<{ok, status, data}>
   * Thin fetch wrapper around the Supabase REST endpoint.
   */
  function _rest(method, path, body) {
    var url = SUPABASE_URL + '/rest/v1/' + path;
    var opts = { method: method, headers: _headers() };
    if (body !== undefined) opts.body = JSON.stringify(body);
    return fetch(url, opts)
      .then(function (res) {
        if (res.status === 204 || res.status === 201) {
          return { ok: true, status: res.status, data: null };
        }
        return res.json().then(function (data) {
          return { ok: res.ok, status: res.status, data: data };
        });
      })
      .catch(function (err) {
        console.warn('[Storage] network error:', err);
        return { ok: false, status: 0, data: null };
      });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  var Storage = {

    PREFIX: PREFIX,

    /**
     * get(logicalKey) → Promise<value|null>
     * Reads champions:<logicalKey> from Supabase. Returns null on miss/error.
     */
    get: function (logicalKey) {
      var fullKey = PREFIX + logicalKey;
      var path = TABLE + '?key=eq.' + encodeURIComponent(fullKey) + '&select=value&limit=1';
      return _rest('GET', path).then(function (res) {
        if (!res.ok || !Array.isArray(res.data) || res.data.length === 0) return null;
        return res.data[0].value;   // Supabase returns jsonb as already-parsed JS object
      });
    },

    /**
     * set(logicalKey, value) → Promise<boolean>
     * Upserts champions:<logicalKey> = value. Returns true on success.
     */
    set: function (logicalKey, value) {
      var fullKey = PREFIX + logicalKey;
      var url = SUPABASE_URL + '/rest/v1/' + TABLE;
      var headers = _headers();
      headers['Prefer'] = 'resolution=merge-duplicates,return=minimal';
      var body = JSON.stringify({ key: fullKey, value: value });
      return fetch(url, { method: 'POST', headers: headers, body: body })
        .then(function (res) { return res.ok || res.status === 201 || res.status === 204; })
        .catch(function (err) {
          console.warn('[Storage] set error:', err);
          return false;
        });
    },

    /**
     * del(logicalKey) → Promise<void>
     * Deletes champions:<logicalKey> from Supabase. Silent on missing key.
     */
    del: function (logicalKey) {
      var fullKey = PREFIX + logicalKey;
      var path = TABLE + '?key=eq.' + encodeURIComponent(fullKey);
      return _rest('DELETE', path).then(function () { /* void */ });
    },

    /**
     * list(scope?) → Promise<string[]>
     * Returns all logical keys (prefix stripped). Optional scope filter.
     * e.g. list('teams') → ['teams:custom', 'teams:tournament']
     */
    list: function (scope) {
      var filter = 'key=like.' + encodeURIComponent(PREFIX + (scope ? scope + ':' : '') + '*');
      var path = TABLE + '?' + filter + '&select=key&order=key';
      return _rest('GET', path).then(function (res) {
        if (!res.ok || !Array.isArray(res.data)) return [];
        return res.data.map(function (row) {
          return row.key.slice(PREFIX.length);
        });
      });
    },

    /**
     * clearAll() → Promise<void>
     * Deletes every champions:* row from Supabase.
     */
    clearAll: function () {
      var path = TABLE + '?key=like.' + encodeURIComponent(PREFIX + '*');
      return _rest('DELETE', path).then(function () { /* void */ });
    },

    /**
     * migrate() → Promise<void>
     * One-time migration: copies legacy localStorage keys into Supabase,
     * then removes them from localStorage. Idempotent.
     */
    migrate: function () {
      var self = this;
      var ls;
      try { ls = typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { ls = null; }
      if (!ls) return Promise.resolve();

      var MIGRATIONS = [
        { oldKey: 'champions_sim_custom_teams_v1',     newLogical: 'teams:custom'        },
        { oldKey: 'poke-sim:bring:v1',                 newLogical: 'bring:default'       },
        { oldKey: 'champions_strategy_report_v1',      newLogical: 'strategy:report'     },
        { oldKey: 'champions_sim_preloaded_overrides', newLogical: 'overrides:preloaded' },
      ];

      var tasks = MIGRATIONS.map(function (m) {
        var raw = null;
        try { raw = ls.getItem(m.oldKey); } catch (e) { /* sandbox-blocked */ }
        if (raw === null) return Promise.resolve();

        var parsed;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }

        return self.get(m.newLogical).then(function (existing) {
          try { ls.removeItem(m.oldKey); } catch (e) { /* swallow */ }
          if (existing !== null) return;
          return self.set(m.newLogical, parsed);
        });
      });

      return Promise.all(tasks).then(function () { /* void */ });
    },

    // ── Deprecated sync shims (backward-compat warnings) ──────────────────────
    getSync: function () {
      console.warn('[Storage] getSync() deprecated — use await Storage.get()');
      return null;
    },
    setSync: function () {
      console.warn('[Storage] setSync() deprecated — use await Storage.set()');
      return false;
    },
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Storage: Storage };
  } else {
    root.Storage = Storage;
  }

}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this));
