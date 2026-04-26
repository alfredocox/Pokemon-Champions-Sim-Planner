// storage_adapter.js — Unified localStorage adapter for Champions Sim
// Issue #79: Option B — champions:* key schema, migration, CRUD, clearAll.
//
// Usage (browser + Node.js harness):
//   Storage.set('teams:custom', [...])   // stores under 'champions:teams:custom'
//   Storage.get('teams:custom')          // returns parsed object or null
//   Storage.del('teams:custom')          // removes the key
//   Storage.list()                       // returns all logical keys (no prefix)
//   Storage.list('teams')               // returns logical keys starting with 'teams:'
//   Storage.clearAll()                  // removes all champions:* keys only
//   Storage.migrate()                   // one-time migration of old key schema
//
// Export contract (for Node.js test harness):
//   if (typeof module !== 'undefined') module.exports = { Storage };

'use strict';

(function (root) {

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  /** Resolve the global localStorage (browser or injected mock in tests). */
  function _ls() {
    return (typeof localStorage !== 'undefined')
      ? localStorage
      : (typeof global !== 'undefined' && global.localStorage ? global.localStorage : null);
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  var Storage = {

    /** Every key stored by this adapter is prefixed with this string. */
    PREFIX: 'champions:',

    /**
     * get(logicalKey) → parsed value or null
     * Reads 'champions:<logicalKey>' from localStorage and JSON-parses it.
     * Returns null on missing key or corrupt JSON.
     */
    get: function (logicalKey) {
      var ls = _ls();
      if (!ls) return null;
      try {
        var raw = ls.getItem(this.PREFIX + logicalKey);
        if (raw === null) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },

    /**
     * set(logicalKey, value) → true on success, false on QuotaExceededError
     * Stores JSON-serialised value under 'champions:<logicalKey>'.
     */
    set: function (logicalKey, value) {
      var ls = _ls();
      if (!ls) return false;
      try {
        ls.setItem(this.PREFIX + logicalKey, JSON.stringify(value));
        return true;
      } catch (e) {
        // Catches QuotaExceededError and any other setItem failure.
        return false;
      }
    },

    /**
     * del(logicalKey) → void
     * Removes 'champions:<logicalKey>' from localStorage. Safe to call on
     * missing keys.
     */
    del: function (logicalKey) {
      var ls = _ls();
      if (!ls) return;
      try {
        ls.removeItem(this.PREFIX + logicalKey);
      } catch (e) {
        // swallow — del must never throw
      }
    },

    /**
     * list(scope?) → string[]
     * Returns all logical keys (prefix stripped) owned by this adapter.
     * Optional `scope` narrows to keys whose logical key starts with
     * '<scope>:' (e.g. list('teams') → ['teams:custom', 'teams:tournament']).
     */
    list: function (scope) {
      var ls = _ls();
      if (!ls) return [];
      var result = [];
      var prefix = this.PREFIX;
      var scopePrefix = scope ? (scope + ':') : null;
      try {
        for (var i = 0; i < ls.length; i++) {
          var rawKey = ls.key(i);
          if (!rawKey || rawKey.indexOf(prefix) !== 0) continue;
          var logical = rawKey.slice(prefix.length);
          if (scopePrefix && logical.indexOf(scopePrefix) !== 0) continue;
          result.push(logical);
        }
      } catch (e) {
        // swallow iteration errors (e.g. storage modified mid-iteration)
      }
      return result;
    },

    /**
     * clearAll() → void
     * Removes every 'champions:*' key from localStorage.
     * Does NOT touch keys belonging to other apps / domains.
     */
    clearAll: function () {
      var keys = this.list();
      for (var i = 0; i < keys.length; i++) {
        this.del(keys[i]);
      }
    },

    /**
     * migrate() → void
     * One-time migration from the legacy key schema to the champions:* schema.
     * Safe to call multiple times (idempotent).
     *
     * Mapping:
     *   champions_sim_custom_teams_v1        → champions:teams:custom
     *   poke-sim:bring:v1                    → champions:bring:default
     *   champions_strategy_report_v1         → champions:strategy:report
     *   champions_sim_preloaded_overrides    → champions:overrides:preloaded
     */
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
        var m = MIGRATIONS[i];
        var raw = ls.getItem(m.oldKey);
        if (raw === null) continue;           // old key not present — skip
        if (this.get(m.newLogical) !== null) { // new key already exists — don't overwrite
          ls.removeItem(m.oldKey);             // still clean up the old key
          continue;
        }
        var parsed;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
        this.set(m.newLogical, parsed);       // write to new schema
        ls.removeItem(m.oldKey);              // delete old key
      }
    },
  };

  // -------------------------------------------------------------------------
  // Export
  // -------------------------------------------------------------------------
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Storage: Storage };
  } else {
    root.Storage = Storage;
  }

}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this));
