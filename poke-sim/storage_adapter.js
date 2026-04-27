// storage_adapter.js — Dual-Layer Storage Adapter for Champions Sim 2026
// v2.0 — Supabase (cloud primary) + localStorage (offline fallback)
//
// Project: ymlahqnshgiarpbgxehp.supabase.co
//
// ARCHITECTURE:
//   CloudStorage — async Supabase REST calls (teams, match_results, pilot_notes)
//   Storage      — sync localStorage CRUD (champions:* key schema, unchanged)
//   DB           — unified facade exported to window.DB
//
// USAGE in engine.js / ui.js:
//   await DB.CloudStorage.saveTeam(key, membersArray)
//   await DB.CloudStorage.loadTeams()            // → { key: [...members] }
//   await DB.CloudStorage.saveMatchResult(obj)
//   await DB.CloudStorage.loadMatchResults()     // → array
//   await DB.CloudStorage.savePilotNote(oppKey, noteText)
//   await DB.CloudStorage.loadPilotNotes()       // → { oppKey: noteText }
//   DB.Storage.set('key', value)                 // sync localStorage fallback
//   DB.Storage.get('key')                        // sync localStorage fallback
//
// INIT:
//   Call DB.init() once at app startup (non-blocking, awaitable).
//   It pulls cloud teams and merges them into TEAMS if window.TEAMS exists.

'use strict';

(function (root) {

  // =========================================================================
  // SUPABASE CONFIG
  // =========================================================================
  var SUPABASE_URL  = 'https://ymlahqnshgiarpbgxehp.supabase.co';
  var SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbGFocW5zaGdpYXJwYmd4ZWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ4MDksImV4cCI6MjA5MjgxMDgwOX0.umWnzknxpIAIudKFd5csxyDw_rukAL9qcxsVPXeifHo';

  // =========================================================================
  // INTERNAL: REST HELPER
  // =========================================================================

  /**
   * _rest(method, table, body?, query?)
   * Thin wrapper around fetch() for Supabase REST API.
   * Returns parsed JSON or null on failure.
   */
  function _rest(method, table, body, query) {
    var url = SUPABASE_URL + '/rest/v1/' + table;
    if (query) url += '?' + query;
    var opts = {
      method: method,
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': 'Bearer ' + SUPABASE_ANON,
        'Content-Type': 'application/json',
        'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
      }
    };
    if (body) opts.body = JSON.stringify(body);
    return fetch(url, opts)
      .then(function (r) {
        if (r.status === 204 || r.status === 200 || r.status === 201) {
          var ct = r.headers.get('content-type') || '';
          if (ct.indexOf('application/json') !== -1) return r.json();
          return null;
        }
        return r.json().then(function (e) {
          console.warn('[Champions DB] REST error', table, method, e);
          return null;
        });
      })
      .catch(function (err) {
        console.warn('[Champions DB] fetch failed', table, method, err.message);
        return null;
      });
  }

  // =========================================================================
  // CLOUD STORAGE — Supabase tables
  // =========================================================================

  var CloudStorage = {

    /**
     * saveTeam(teamKey, membersArray)
     * Upserts a team into the `teams` table.
     * Schema: { team_key TEXT PK, members JSONB, updated_at TIMESTAMPTZ }
     */
    saveTeam: function (teamKey, members) {
      return _rest('POST', 'teams', {
        team_key:   teamKey,
        members:    members,
        updated_at: new Date().toISOString()
      }, 'on_conflict=team_key');
    },

    /**
     * loadTeams()
     * Returns all teams as { team_key: members } map, or {} on failure.
     */
    loadTeams: function () {
      return _rest('GET', 'teams', null, 'select=team_key,members&order=updated_at.desc')
        .then(function (rows) {
          if (!rows || !Array.isArray(rows)) return {};
          var map = {};
          rows.forEach(function (r) { map[r.team_key] = r.members; });
          return map;
        });
    },

    /**
     * deleteTeam(teamKey)
     * Removes a team row from the `teams` table.
     */
    deleteTeam: function (teamKey) {
      return _rest('DELETE', 'teams', null, 'team_key=eq.' + encodeURIComponent(teamKey));
    },

    /**
     * saveMatchResult(obj)
     * Inserts a Bo series result row.
     * Schema: { player_key TEXT, opp_key TEXT, bo INT, wins INT, losses INT,
     *           win_rate FLOAT, format TEXT, created_at TIMESTAMPTZ }
     */
    saveMatchResult: function (obj) {
      return _rest('POST', 'match_results', {
        player_key: obj.playerKey  || 'player',
        opp_key:    obj.oppKey     || 'unknown',
        bo:         obj.bo         || 1,
        wins:       obj.wins       || 0,
        losses:     obj.losses     || 0,
        win_rate:   obj.winRate    || 0,
        format:     obj.format     || 'doubles',
        created_at: new Date().toISOString()
      });
    },

    /**
     * loadMatchResults(limit?)
     * Returns recent match result rows (default last 100).
     */
    loadMatchResults: function (limit) {
      var q = 'select=*&order=created_at.desc&limit=' + (limit || 100);
      return _rest('GET', 'match_results', null, q)
        .then(function (rows) { return rows || []; });
    },

    /**
     * savePilotNote(oppKey, noteText)
     * Upserts a pilot note for the given opponent key.
     * Schema: { opp_key TEXT PK, note TEXT, updated_at TIMESTAMPTZ }
     */
    savePilotNote: function (oppKey, noteText) {
      return _rest('POST', 'pilot_notes', {
        opp_key:    oppKey,
        note:       noteText,
        updated_at: new Date().toISOString()
      }, 'on_conflict=opp_key');
    },

    /**
     * loadPilotNotes()
     * Returns all pilot notes as { opp_key: note } map, or {} on failure.
     */
    loadPilotNotes: function () {
      return _rest('GET', 'pilot_notes', null, 'select=opp_key,note')
        .then(function (rows) {
          if (!rows || !Array.isArray(rows)) return {};
          var map = {};
          rows.forEach(function (r) { map[r.opp_key] = r.note; });
          return map;
        });
    },

    /**
     * healthCheck()
     * Returns true if Supabase is reachable, false otherwise.
     * Uses a minimal HEAD-equivalent (limit=1 GET on teams).
     */
    healthCheck: function () {
      return _rest('GET', 'teams', null, 'select=team_key&limit=1')
        .then(function (r) { return r !== null; })
        .catch(function () { return false; });
    }
  };

  // =========================================================================
  // LOCAL STORAGE — sync fallback (unchanged API from v1)
  // =========================================================================

  function _ls() {
    return (typeof localStorage !== 'undefined')
      ? localStorage
      : (typeof global !== 'undefined' && global.localStorage ? global.localStorage : null);
  }

  var Storage = {
    PREFIX: 'champions:',

    get: function (logicalKey) {
      var ls = _ls(); if (!ls) return null;
      try { var raw = ls.getItem(this.PREFIX + logicalKey); return raw === null ? null : JSON.parse(raw); }
      catch (e) { return null; }
    },

    set: function (logicalKey, value) {
      var ls = _ls(); if (!ls) return false;
      try { ls.setItem(this.PREFIX + logicalKey, JSON.stringify(value)); return true; }
      catch (e) { return false; }
    },

    del: function (logicalKey) {
      var ls = _ls(); if (!ls) return;
      try { ls.removeItem(this.PREFIX + logicalKey); } catch (e) {}
    },

    list: function (scope) {
      var ls = _ls(); if (!ls) return [];
      var result = [], prefix = this.PREFIX, scopePrefix = scope ? (scope + ':') : null;
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
      for (var i = 0; i < keys.length; i++) this.del(keys[i]);
    },

    migrate: function () {
      var ls = _ls(); if (!ls) return;
      var MIGRATIONS = [
        { oldKey: 'champions_sim_custom_teams_v1',     newLogical: 'teams:custom'        },
        { oldKey: 'poke-sim:bring:v1',                 newLogical: 'bring:default'       },
        { oldKey: 'champions_strategy_report_v1',      newLogical: 'strategy:report'     },
        { oldKey: 'champions_sim_preloaded_overrides', newLogical: 'overrides:preloaded' },
      ];
      for (var i = 0; i < MIGRATIONS.length; i++) {
        var m = MIGRATIONS[i], raw = ls.getItem(m.oldKey);
        if (raw === null) continue;
        if (this.get(m.newLogical) !== null) { ls.removeItem(m.oldKey); continue; }
        var parsed; try { parsed = JSON.parse(raw); } catch (e) { parsed = raw; }
        this.set(m.newLogical, parsed);
        ls.removeItem(m.oldKey);
      }
    }
  };

  // =========================================================================
  // DB FACADE — unified init + export
  // =========================================================================

  var DB = {
    Storage:      Storage,
    CloudStorage: CloudStorage,
    _cloudOnline: false,

    /**
     * init()
     * Call once at app startup (non-blocking).
     * 1. Runs localStorage migration.
     * 2. Health-checks Supabase.
     * 3. If online, pulls cloud teams and merges into window.TEAMS.
     * 4. Sets DB._cloudOnline flag.
     */
    init: function () {
      Storage.migrate();
      return CloudStorage.healthCheck().then(function (online) {
        DB._cloudOnline = online;
        if (!online) {
          console.info('[Champions DB] Supabase offline — using localStorage fallback');
          return;
        }
        console.info('[Champions DB] Supabase connected ✓');
        return CloudStorage.loadTeams().then(function (cloudTeams) {
          var keys = Object.keys(cloudTeams);
          if (!keys.length) return;
          if (typeof root.TEAMS !== 'undefined') {
            keys.forEach(function (k) {
              // Only merge teams NOT already in the hardcoded set
              // (cloud teams are user-imported teams, not the 13 tournament teams)
              if (!root.TEAMS[k]) {
                root.TEAMS[k] = { name: k, members: cloudTeams[k] };
              } else {
                // Update members if cloud version is newer
                root.TEAMS[k].members = cloudTeams[k];
              }
            });
            console.info('[Champions DB] Merged ' + keys.length + ' cloud team(s) into TEAMS');
          }
        });
      });
    }
  };

  // =========================================================================
  // EXPORT
  // =========================================================================
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Storage: Storage, CloudStorage: CloudStorage, DB: DB };
  } else {
    root.Storage      = Storage;
    root.CloudStorage = CloudStorage;
    root.DB           = DB;
  }

}(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this));
