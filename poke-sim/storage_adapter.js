// storage_adapter.js — Unified localStorage adapter for Champions Sim
// Issue #79: Option B — champions:* key schema, migration, CRUD, clearAll.

'use strict';

(function (root) {

  function _ls() {
    return (typeof localStorage !== 'undefined')
      ? localStorage
      : (typeof global !== 'undefined' && global.localStorage ? global.localStorage : null);
  }

  var Storage = {

    PREFIX: 'champions:',

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

    set: function (logicalKey, value) {
      var ls = _ls();
      if (!ls) return false;
      try {
        ls.setItem(this.PREFIX + logicalKey, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    },

    del: function (logicalKey) {
      var ls = _ls();
      if (!ls) return;
      try {
        ls.removeItem(this.PREFIX + logicalKey);
      } catch (e) {}
    },

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
      } catch (e) {}
      return result;
    },

    clearAll: function () {
      var keys = this.list();
      for (var i = 0; i < keys.length; i++) {
        this.del(keys[i]);
      }
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
        var m = MIGRATIONS[i];
        var raw = ls.getItem(m.oldKey);
        if (raw === null) continue;
        if (this.get(m.newLogical) !== null) {
          ls.removeItem(m.oldKey);
          continue;
        }
        var parsed;
        try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
        this.set(m.newLogical, parsed);
        ls.removeItem(m.oldKey);
      }
    },
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Storage: Storage };
  } else {
    root.Storage = Storage;
  }

}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this));
