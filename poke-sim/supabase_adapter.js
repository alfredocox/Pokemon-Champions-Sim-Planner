// supabase_adapter.js - Champions Sim DB adapter
// Thin Supabase layer. Every public method fails soft so the offline PWA
// remains usable when credentials, network, or RLS are unavailable.
//
// Credentials must be injected before this file loads:
//   window.__SUPABASE_URL__ = 'https://ymlahqnshgiarpbgxehp.supabase.co';
//   window.__SUPABASE_KEY__ = 'YOUR_ANON_PUBLIC_KEY';
// Optional test override:
//   window.__DISABLE_SUPABASE__ = true;

(function () {
  'use strict';

  const DISABLED = !!(typeof window !== 'undefined' && window.__DISABLE_SUPABASE__);
  const SUPABASE_URL = DISABLED
    ? null
    : (typeof window !== 'undefined' ? window.__SUPABASE_URL__ : undefined);
  const SUPABASE_KEY = DISABLED
    ? null
    : (typeof window !== 'undefined' ? window.__SUPABASE_KEY__ : undefined);
  const ENABLED = !!(SUPABASE_URL && SUPABASE_KEY) && !DISABLED;
  const DEFAULT_RULESET_ID = 'champions_reg_m_doubles_bo3';

  if (!ENABLED) {
    console.info('[SupabaseAdapter] No credentials - running in local-only mode.');
  }

  let _client = null;
  function getClient() {
    if (_client) return _client;
    if (!ENABLED) return null;
    if (typeof window.supabase === 'undefined') {
      console.warn('[SupabaseAdapter] supabase-js not loaded.');
      return null;
    }
    _client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return _client;
  }

  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Returns {[team_id]: {team_id, name, label, description, source, members[]}}
  // or null if disabled or errored. Never throws.
  async function loadTeamsFromDB() {
    const sb = getClient();
    if (!sb) return null;
    try {
      const { data: teams, error: tErr } = await sb.from('teams').select('*');
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
          name: m.species,
          item: m.item || '',
          ability: m.ability || '',
          nature: m.nature || '',
          level: m.level || 50,
          evs: m.evs || {},
          moves: m.moves || [],
          teraType: m.tera_type || '',
          role: m.role_tag || ''
        });
      }

      const result = {};
      for (const t of (teams || [])) {
        result[t.team_id] = {
          team_id: t.team_id,
          name: t.name,
          label: t.label,
          description: t.description,
          source: t.source,
          members: memberMap[t.team_id] || []
        };
      }
      console.info('[SupabaseAdapter] Loaded ' + Object.keys(result).length + ' teams from DB.');
      return result;
    } catch (err) {
      console.warn('[SupabaseAdapter] loadTeamsFromDB failed - using local data.', err && err.message);
      return null;
    }
  }

  async function loadRulesets() {
    const sb = getClient();
    if (!sb) return [];
    try {
      const { data, error } = await sb.from('rulesets').select('*');
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[SupabaseAdapter] loadRulesets failed.', err && err.message);
      return [];
    }
  }

  async function saveAnalysis(payload) {
    const sb = getClient();
    if (!sb) return null;

    const analysis_id = payload.analysis_id || uuid();
    const row = {
      analysis_id,
      engine_version: payload.engine_version || 'v1',
      ruleset_id: payload.ruleset_id || DEFAULT_RULESET_ID,
      player_team_id: payload.player_team_id,
      opp_team_id: payload.opp_team_id,
      prior_id: payload.prior_id || null,
      policy_model: payload.policy_model || 'random',
      sample_size: payload.sample_size || 0,
      bo: payload.bo || 1,
      win_rate: payload.win_rate || 0,
      wins: payload.wins || 0,
      losses: payload.losses || 0,
      draws: payload.draws || 0,
      avg_turns: payload.avg_turns || 0,
      avg_tr_turns: payload.avg_tr_turns || 0,
      ci_low: payload.ci_low || null,
      ci_high: payload.ci_high || null,
      hidden_info_model: payload.hidden_info_model || null,
      analysis_json: payload.analysis_json || {}
    };

    try {
      const { error: aErr } = await sb.from('analyses').insert(row);
      if (aErr) throw aErr;

      const winConditions = Array.isArray(payload.win_conditions) ? payload.win_conditions : [];
      if (winConditions.length) {
        const wcRows = winConditions.map(wc => ({
          analysis_id,
          label: wc.label,
          count: wc.count
        }));
        const { error: wcErr } = await sb.from('analysis_win_conditions').insert(wcRows);
        if (wcErr) console.warn('[SupabaseAdapter] win_conditions insert error:', wcErr.message);
      }

      const logs = Array.isArray(payload.logs) ? payload.logs.slice(0, 50) : [];
      if (logs.length) {
        const logRows = logs.map((l, i) => ({
          analysis_id,
          log_index: i,
          result: l.result || 'unknown',
          turns: l.turns || 0,
          tr_turns: l.tr_turns || 0,
          win_condition: l.win_condition || null,
          log: l.log || {}
        }));
        const { error: lErr } = await sb.from('analysis_logs').insert(logRows);
        if (lErr) console.warn('[SupabaseAdapter] logs insert error:', lErr.message);
      }

      console.info('[SupabaseAdapter] Saved analysis ' + analysis_id);
      return analysis_id;
    } catch (err) {
      console.warn('[SupabaseAdapter] saveAnalysis failed - result not persisted.', err && err.message);
      return null;
    }
  }

  async function loadRecentAnalyses(limit) {
    const sb = getClient();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from('analyses')
        .select('analysis_id, created_at, player_team_id, opp_team_id, bo, win_rate, wins, losses, sample_size')
        .order('created_at', { ascending: false })
        .limit(limit || 20);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[SupabaseAdapter] loadRecentAnalyses failed.', err && err.message);
      return [];
    }
  }

  async function getMatchupHistory(playerKey, oppKey, limit) {
    const sb = getClient();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from('analyses')
        .select('*')
        .eq('player_team_id', playerKey)
        .eq('opp_team_id', oppKey)
        .order('created_at', { ascending: false })
        .limit(limit || 20);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('[SupabaseAdapter] getMatchupHistory failed.', err && err.message);
      return [];
    }
  }

  window.SupabaseAdapter = {
    enabled: ENABLED,
    DEFAULT_RULESET_ID,
    loadTeamsFromDB,
    loadRulesets,
    saveAnalysis,
    loadRecentAnalyses,
    getMatchupHistory
  };
})();
