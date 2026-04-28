// supabase_adapter.js — Champions Sim v1 (M3: init / source-of-truth)
// Thin Supabase layer. Falls back to local silently if credentials missing or disabled.
// Load AFTER data.js, engine.js, ui.js — and AFTER supabase-js CDN script.
//
// Credentials injected via window.__SUPABASE_URL__ and window.__SUPABASE_KEY__
// Set these in index.html <script> block — do NOT hardcode here.
//   Original cred wiring: 2026-04-27 by TheYfactora12 (commit 001b37b)
//   Security hardening:   2026-04-27 by TheYfactora12 (commit effad08) —
//                         removed hardcoded fallbacks; inject at runtime only.
//   M3 refactor:          2026-04-27 — adds __DISABLE_SUPABASE__ test override,
//                                      loadRulesets(), explicit init contract.
//                                      Ownership of TEAMS-merge moved to ui.js.

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  // Credentials must be injected at runtime — no hardcoded fallbacks.
  // In index.html, add before this script loads:
  //   <script>
  //     window.__SUPABASE_URL__ = 'https://ymlahqnshgiarpbgxehp.supabase.co';
  //     window.__SUPABASE_KEY__ = '<your-anon-key>';
  //   </script>
  //
  // Tests / sandboxes can also set window.__DISABLE_SUPABASE__ = true to force
  // the adapter into local-only mode regardless of injected creds (defense-in-
  // depth: even if a future change re-introduces hardcoded creds, this flag
  // still wins).
  const DISABLED = !!(typeof window !== 'undefined' && window.__DISABLE_SUPABASE__);

  const SUPABASE_URL = DISABLED
    ? null
    : (typeof window !== 'undefined' ? window.__SUPABASE_URL__ : undefined);
  const SUPABASE_KEY = DISABLED
    ? null
    : (typeof window !== 'undefined' ? window.__SUPABASE_KEY__ : undefined);
  const ENABLED = !!(SUPABASE_URL && SUPABASE_KEY) && !DISABLED;

  // Canonical ruleset_id — must match seed_teams_v2.sql (M2)
  const DEFAULT_RULESET_ID = 'champions_reg_m_doubles_bo3';

  if (!ENABLED) {
    console.info('[SupabaseAdapter] No credentials — running in local-only mode.');
  }

  // ── Supabase client ───────────────────────────────────────────────────────
  let _client = null;
  function getClient() {
    if (_client) return _client;
    if (!ENABLED) return null;
    if (typeof window.supabase === 'undefined') {
      console.warn('[SupabaseAdapter] supabase-js not loaded. Check CDN <script> in index.html.');
      return null;
    }
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return _client;
  }

  // ── UUID helper ───────────────────────────────────────────────────────────
  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ── loadTeamsFromDB ───────────────────────────────────────────────────────
  // Returns {[team_id]: {team_id, name, label, description, source, metadata, members[]}}
  // or null if disabled / errored. NEVER throws.
  async function loadTeamsFromDB() {
    const sb = getClient();
    if (!sb) return null;
    try {
      const { data: teams, error: tErr } = await sb
        .from('teams')
        .select('*');
      if (tErr) throw tErr;

      const { data: members, error: mErr } = await sb
        .from('team_members')
        .select('*')
        .order('slot', { ascending: true });
      if (mErr) throw mErr;

      const memberMap = {};
      for (const m of (members || [])) {
        if (!memberMap[m.team_id]) memberMap[m.team_id] = [];
        memberMap[m.team_id].push({
          name:     m.species,
          item:     m.item      || '',
          ability:  m.ability   || '',
          nature:   m.nature    || '',
          level:    m.level     || 50,
          evs:      m.evs       || {},
          moves:    m.moves     || [],
          teraType: m.tera_type || '',
          role:     m.role_tag  || ''
        });
      }

      const result = {};
      for (const t of (teams || [])) {
        result[t.team_id] = {
          team_id:     t.team_id,
          name:        t.name,
          label:       t.label,
          description: t.description,
          source:      t.source,
          metadata:    t.metadata || {},
          members:     memberMap[t.team_id] || []
        };
      }
      console.info(`[SupabaseAdapter] Loaded ${Object.keys(result).length} teams from DB.`);
      return result;
    } catch (err) {
      console.warn('[SupabaseAdapter] loadTeamsFromDB failed — using local data.', err && err.message);
      return null;
    }
  }

  // ── loadRulesets ──────────────────────────────────────────────────────────
  // Returns array of ruleset rows (or [] if disabled / errored). NEVER throws.
  async function loadRulesets() {
    const sb = getClient();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from('rulesets')
        .select('*');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[SupabaseAdapter] loadRulesets failed.', err && err.message);
      return [];
    }
  }

  // ── saveAnalysis ──────────────────────────────────────────────────────────
  async function saveAnalysis(payload) {
    const sb = getClient();
    if (!sb) return null;

    const analysis_id = uuid();
    const row = {
      analysis_id,
      engine_version:    payload.engine_version   || 'v1',
      ruleset_id:        payload.ruleset_id        || DEFAULT_RULESET_ID,
      player_team_id:    payload.player_team_id,
      opp_team_id:       payload.opp_team_id,
      prior_id:          payload.prior_id          || null,
      policy_model:      payload.policy_model      || 'random',
      sample_size:       payload.sample_size       || 0,
      bo:                payload.bo                || 1,
      win_rate:          payload.win_rate          || 0,
      wins:              payload.wins              || 0,
      losses:            payload.losses            || 0,
      draws:             payload.draws             || 0,
      avg_turns:         payload.avg_turns         || 0,
      avg_tr_turns:      payload.avg_tr_turns      || 0,
      ci_low:            payload.ci_low            || null,
      ci_high:           payload.ci_high           || null,
      hidden_info_model: payload.hidden_info_model  || null,
      analysis_json:     payload.analysis_json     || {}
    };

    try {
      const { error: aErr } = await sb.from('analyses').insert(row);
      if (aErr) throw aErr;

      if (payload.win_conditions && payload.win_conditions.length) {
        const wcRows = payload.win_conditions.map(wc => ({
          analysis_id,
          label: wc.label,
          count: wc.count
        }));
        const { error: wcErr } = await sb.from('analysis_win_conditions').insert(wcRows);
        if (wcErr) console.warn('[SupabaseAdapter] win_conditions insert error:', wcErr.message);
      }

      if (payload.logs && payload.logs.length) {
        const logRows = payload.logs.slice(0, 50).map((l, i) => ({
          analysis_id,
          log_index:     i,
          result:        l.result        || 'unknown',
          turns:         l.turns         || 0,
          tr_turns:      l.tr_turns      || 0,
          win_condition: l.win_condition || null,
          log:           l.log           || {}
        }));
        const { error: lErr } = await sb.from('analysis_logs').insert(logRows);
        if (lErr) console.warn('[SupabaseAdapter] logs insert error:', lErr.message);
      }

      console.info(`[SupabaseAdapter] Saved analysis ${analysis_id}`);
      return analysis_id;
    } catch (err) {
      console.warn('[SupabaseAdapter] saveAnalysis failed — result not persisted.', err && err.message);
      return null;
    }
  }

  // ── loadRecentAnalyses ────────────────────────────────────────────────────
  async function loadRecentAnalyses(limit) {
    limit = limit || 20;
    const sb = getClient();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from('analyses')
        .select('analysis_id, created_at, player_team_id, opp_team_id, bo, win_rate, wins, losses, sample_size')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[SupabaseAdapter] loadRecentAnalyses failed.', err && err.message);
      return [];
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.SupabaseAdapter = {
    enabled:            ENABLED,
    DEFAULT_RULESET_ID: DEFAULT_RULESET_ID,
    loadTeamsFromDB,
    loadRulesets,
    saveAnalysis,
    loadRecentAnalyses
  };

  // M3 NOTE: Auto-merge of DB teams into TEAMS has moved to ui.js's
  // DOMContentLoaded handler so that rebuildTeamSelects() is awaited
  // (no flash of static teams). See ui.js — search for
  // "M3 — DB init: source-of-truth merge".

})();
