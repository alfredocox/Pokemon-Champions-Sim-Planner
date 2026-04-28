// supabase_adapter.js — Champions Sim v1
// Thin Supabase layer. Falls back to local silently if credentials missing.
// Load AFTER data.js, engine.js, ui.js — and AFTER supabase-js CDN script.
//
// Credentials injected directly — project: ymlahqnshgiarpbgxehp (Champions Sim Planner)
// Updated: 2026-04-27 by TheYfactora12

(function () {
  'use strict';

  // ── Config ────────────────────────────────────────────────────────────────
  const SUPABASE_URL = window.__SUPABASE_URL__ || 'https://ymlahqnshgiarpbgxehp.supabase.co';
  const SUPABASE_KEY = window.__SUPABASE_KEY__ || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InltbGFocW5zaGdpYXJwYmd4ZWhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzQ4MDksImV4cCI6MjA5MjgxMDgwOX0.umWnzknxpIAIudKFd5csxyDw_rukAL9qcxsVPXeifHo';
  const ENABLED = !!(SUPABASE_URL && SUPABASE_KEY);

  // Canonical ruleset_id — must match seed_teams_v1.sql
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
      for (const m of members) {
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
      for (const t of teams) {
        result[t.team_id] = {
          name:        t.name,
          label:       t.label,
          description: t.description,
          source:      t.source,
          members:     memberMap[t.team_id] || []
        };
      }
      console.info(`[SupabaseAdapter] Loaded ${teams.length} teams from DB.`);
      return result;
    } catch (err) {
      console.warn('[SupabaseAdapter] loadTeamsFromDB failed — using local data.', err.message);
      return null;
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
      console.warn('[SupabaseAdapter] saveAnalysis failed — result not persisted.', err.message);
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
      console.warn('[SupabaseAdapter] loadRecentAnalyses failed.', err.message);
      return [];
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.SupabaseAdapter = {
    enabled:            ENABLED,
    loadTeamsFromDB,
    saveAnalysis,
    loadRecentAnalyses
  };

  // ── Auto-merge DB teams into TEAMS on load ────────────────────────────────
  if (ENABLED) {
    window.addEventListener('DOMContentLoaded', async () => {
      const dbTeams = await loadTeamsFromDB();
      if (dbTeams && typeof TEAMS !== 'undefined') {
        Object.assign(TEAMS, dbTeams);
        console.info('[SupabaseAdapter] TEAMS patched with DB data.');
        if (typeof rebuildTeamSelects === 'function') rebuildTeamSelects();
      }
    });
  }
})();
