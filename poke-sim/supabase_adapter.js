/**
 * supabase_adapter.js — Champions Sim v1
 *
 * Thin async layer over the existing Storage object.
 * - Reads teams/rulesets from Supabase on init (remote-first)
 * - Falls back to localStorage if offline or Supabase unavailable
 * - Writes analyses + win_conditions + logs to Supabase after every sim
 *
 * Usage:
 *   Load supabase-js CDN first, then this file.
 *   window.__SUPABASE_URL__ and window.__SUPABASE_ANON_KEY__ must be set
 *   before this script runs (inject via a <script> tag above this one).
 */

(function () {
  'use strict';

  const SUPABASE_URL = window.__SUPABASE_URL__ || '';
  const SUPABASE_KEY = window.__SUPABASE_ANON_KEY__ || '';

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('[SupabaseAdapter] Missing URL or anon key — running in localStorage-only mode.');
    return;
  }

  // ── Client ────────────────────────────────────────────────────────────────
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function uuid() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
  }

  // ── Remote reads (called once on page load) ───────────────────────────────

  /**
   * loadTeamsFromDB()
   * Pulls teams + team_members from Supabase and merges into window.TEAMS.
   * Existing TEAMS keys are preserved; remote rows win on conflict.
   */
  async function loadTeamsFromDB() {
    try {
      const { data: teams, error: tErr } = await sb.from('teams').select('*');
      if (tErr) throw tErr;

      const { data: members, error: mErr } = await sb.from('team_members').select('*').order('slot');
      if (mErr) throw mErr;

      if (!teams || teams.length === 0) return;

      teams.forEach(team => {
        const teamMembers = members
          .filter(m => m.team_id === team.team_id)
          .map(m => ({
            species:  m.species,
            item:     m.item     || '',
            ability:  m.ability  || '',
            nature:   m.nature   || '',
            level:    m.level    || 50,
            evs:      m.evs      || {},
            moves:    m.moves    || [],
            teraType: m.tera_type || '',
            roleTag:  m.role_tag  || '',
          }));

        window.TEAMS[team.team_id] = {
          name:        team.name,
          label:       team.label,
          mode:        team.mode,
          source:      team.source,
          description: team.description,
          members:     teamMembers,
        };
      });

      console.info(`[SupabaseAdapter] Loaded ${teams.length} teams from DB.`);

      // Rebuild UI selects if the function exists
      if (typeof window.rebuildTeamSelects === 'function') {
        window.rebuildTeamSelects();
      }
    } catch (err) {
      console.warn('[SupabaseAdapter] loadTeamsFromDB failed, using local data.', err);
    }
  }

  // ── Remote writes (called after each simulation run) ──────────────────────

  /**
   * saveAnalysis(payload)
   *
   * payload shape (mirrors the analyses table + child tables):
   * {
   *   engineVersion:    string,
   *   rulesetId:        string,
   *   playerTeamId:     string,
   *   oppTeamId:        string,
   *   policyModel:      string,
   *   sampleSize:       number,
   *   bo:               number,
   *   winRate:          number,       // 0.0–1.0
   *   wins:             number,
   *   losses:           number,
   *   draws:            number,
   *   avgTurns:         number,
   *   avgTrTurns:       number,
   *   ciLow?:           number,
   *   ciHigh?:          number,
   *   hiddenInfoModel?: string,
   *   analysisJson:     object,       // full result blob
   *   winConditions?:   { label: string; count: number }[],
   *   logs?:            { result: string; turns: number; trTurns: number; winCondition?: string; log: object }[],
   * }
   *
   * Returns the inserted analysis_id (UUID) or null on failure.
   */
  async function saveAnalysis(payload) {
    const analysisId = uuid();

    try {
      // 1. Insert parent row
      const { error: aErr } = await sb.from('analyses').insert({
        analysis_id:       analysisId,
        engine_version:    payload.engineVersion    || 'unknown',
        ruleset_id:        payload.rulesetId        || 'vgc2025regm',
        player_team_id:    payload.playerTeamId,
        opp_team_id:       payload.oppTeamId,
        policy_model:      payload.policyModel      || 'random',
        sample_size:       payload.sampleSize       || 1,
        bo:                payload.bo               || 1,
        win_rate:          payload.winRate          || 0,
        wins:              payload.wins             || 0,
        losses:            payload.losses           || 0,
        draws:             payload.draws            || 0,
        avg_turns:         payload.avgTurns         || 0,
        avg_tr_turns:      payload.avgTrTurns       || 0,
        ci_low:            payload.ciLow            ?? null,
        ci_high:           payload.ciHigh           ?? null,
        hidden_info_model: payload.hiddenInfoModel  || null,
        analysis_json:     payload.analysisJson     || {},
      });
      if (aErr) throw aErr;

      // 2. Insert win conditions (if any)
      if (payload.winConditions && payload.winConditions.length > 0) {
        const wcRows = payload.winConditions.map(wc => ({
          analysis_id: analysisId,
          label:       wc.label,
          count:       wc.count,
        }));
        const { error: wcErr } = await sb.from('analysis_win_conditions').insert(wcRows);
        if (wcErr) console.warn('[SupabaseAdapter] win_conditions insert partial failure:', wcErr);
      }

      // 3. Insert logs (if any, capped at 50 to stay under payload limits)
      if (payload.logs && payload.logs.length > 0) {
        const logRows = payload.logs.slice(0, 50).map((l, i) => ({
          analysis_id:   analysisId,
          log_index:     i,
          result:        l.result,
          turns:         l.turns,
          tr_turns:      l.trTurns || 0,
          win_condition: l.winCondition || null,
          log:           l.log || {},
        }));
        const { error: lErr } = await sb.from('analysis_logs').insert(logRows);
        if (lErr) console.warn('[SupabaseAdapter] logs insert partial failure:', lErr);
      }

      console.info(`[SupabaseAdapter] Analysis saved: ${analysisId}`);
      return analysisId;
    } catch (err) {
      console.warn('[SupabaseAdapter] saveAnalysis failed:', err);
      return null;
    }
  }

  // ── Expose on window ──────────────────────────────────────────────────────
  window.SupabaseAdapter = { loadTeamsFromDB, saveAnalysis };

  // ── Auto-load on DOMContentLoaded ─────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadTeamsFromDB);
  } else {
    loadTeamsFromDB();
  }
})();
