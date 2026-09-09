'use strict';

const fs = require('fs');
const path = require('path');
const TeamLab = require('../team_lab.js');
const LegalityEvidencePackage = require('../legality_evidence_package.js');

const ROOT = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(ROOT, 'db', 'migrations', '2026_06_29_team_lab_foundation.sql'), 'utf8');
const rankingMigration = fs.readFileSync(path.join(ROOT, 'db', 'migrations', '2026_06_30_team_lab_ranking_quality.sql'), 'utf8');
const adminMigration = fs.readFileSync(path.join(ROOT, 'db', 'migrations', '2026_06_30_team_lab_admin_actions.sql'), 'utf8');
const mappingPromotionMigration = fs.readFileSync(path.join(ROOT, 'db', 'migrations', '2026_06_30_team_lab_mapping_promotion.sql'), 'utf8');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try {
    fn();
    pass += 1;
    console.log('  PASS ' + name);
  } catch (err) {
    fail += 1;
    console.error('  FAIL ' + name + ': ' + err.message);
  }
}
function eq(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message || 'mismatch'}: expected ${expected}, got ${actual}`);
}
function truthy(value, message) {
  if (!value) throw new Error(message || 'expected truthy');
}
function approx(actual, expected, epsilon, message) {
  if (Math.abs(actual - expected) > epsilon) throw new Error(`${message || 'approx mismatch'}: expected ${expected}, got ${actual}`);
}

console.log('\n=== Team Lab foundation tests ===\n');

T('1. migration creates namespaced Team Lab tables instead of colliding with runtime teams', () => {
  ['team_lab_teams', 'team_lab_team_members', 'team_lab_sim_runs', 'team_lab_leaderboard_entries', 'team_lab_matchups'].forEach((table) => {
    truthy(migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`), `${table} table missing`);
    truthy(migration.includes(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`), `${table} RLS missing`);
  });
  truthy(!migration.includes('CREATE TABLE IF NOT EXISTS teams ('), 'migration must not replace runtime teams table');
});

T('2. migration includes requested indexes and hidden-detail RLS policy', () => {
  [
    'idx_team_lab_teams_regulation_format',
    'idx_team_lab_teams_owner',
    'idx_team_lab_teams_visibility',
    'idx_team_lab_leaderboard_scope_rank',
    'idx_team_lab_leaderboard_versions',
    'idx_team_lab_sim_runs_team_a',
    'idx_team_lab_sim_runs_team_b',
    'idx_team_lab_sim_runs_regulation_format',
    'idx_team_lab_matchups_pair'
  ].forEach((idx) => truthy(migration.includes(idx), `${idx} missing`));
  truthy(migration.includes("t.visibility = 'hidden_details' AND team_lab_team_members.is_hidden_publicly = false"), 'hidden-details member policy missing');
});

T('2b. ranking quality migration stores composite evidence metadata', () => {
  [
    'ranking_score numeric',
    'evidence_quality text',
    'matchup_coverage jsonb',
    'opponent_strength_delta numeric',
    'volatility_penalty numeric',
    'source_gaps text[]',
    'idx_team_lab_leaderboard_quality'
  ].forEach((needle) => truthy(rankingMigration.includes(needle), `${needle} missing`));
});

T('2c. admin reset migration stores private audit records', () => {
  [
    'CREATE TABLE IF NOT EXISTS team_lab_admin_actions',
    "action text NOT NULL CHECK (action IN ('team_lab_ranking_reset'))",
    "mode text NOT NULL CHECK (mode IN ('mark_stale', 'delete_dev_seed'))",
    'reason text NOT NULL CHECK (length(trim(reason)) >= 8)',
    'ALTER TABLE team_lab_admin_actions ENABLE ROW LEVEL SECURITY',
    'team_lab_admin_actions_no_public_read',
    'USING (false)'
  ].forEach((needle) => truthy(adminMigration.includes(needle), `${needle} missing`));
});

T('2d. mapping and promotion migration protects team identity and official ranking gates', () => {
  [
    'CREATE TABLE IF NOT EXISTS team_lab_team_key_mappings',
    "source_system text NOT NULL CHECK (source_system IN ('local_qa', 'branch_coverage', 'showdown_import', 'qa_artifact', 'manual_admin'))",
    "mapping_status text NOT NULL DEFAULT 'pending' CHECK (mapping_status IN ('pending', 'verified', 'rejected', 'stale'))",
    'UNIQUE NULLS NOT DISTINCT(source_system, source_team_key, regulation_id, format)',
    'CREATE TABLE IF NOT EXISTS team_lab_promotion_rules',
    'require_verified_team_mapping boolean NOT NULL DEFAULT true',
    'require_approved_benchmark_pool boolean NOT NULL DEFAULT true',
    'CREATE TABLE IF NOT EXISTS team_lab_promotion_audits',
    "decision text NOT NULL CHECK (decision IN ('approved', 'blocked', 'experimental', 'stale'))",
    'team_key_mapping_id uuid NULL REFERENCES team_lab_team_key_mappings(id) ON DELETE SET NULL',
    'promotion_status text NULL CHECK',
    'team_lab_key_mappings_no_public_read',
    'team_lab_promotion_rules_read_active',
    'team_lab_promotion_audits_no_public_read'
  ].forEach((needle) => truthy(mappingPromotionMigration.includes(needle), `${needle} missing`));
});

const baseTeam = {
  id: 'team-a',
  owner_user_id: 'user-1',
  name: 'Dev Proof Team',
  format: 'doubles',
  regulation_id: 'reg-m-b',
  visibility: 'hidden_details',
  source_type: 'dev_seed',
  archetype_tags: ['proof'],
  members: [
    { slot: 1, pokemon_id: 'charizard', form_id: 'charizard-mega-y', item_id: 'charizardite-y', ability_id: 'drought', moves: ['heat-wave', 'protect'], level: 50, evs: { spa: 252 }, ivs: { hp: 31 }, is_hidden_publicly: true }
  ]
};

T('3. validator returns needs_verification when Champion source data is missing', () => {
  const report = TeamLab.validateTeamForRegulation(baseTeam, null);
  eq(report.status, 'needs_verification', 'missing regulation should not verify');
  truthy(report.source_gaps.some((gap) => gap.code === 'REGULATION_SOURCE_MISSING'), 'missing regulation source gap absent');
});

T('4. validator returns verified only with explicit verified source allowlists', () => {
  const regulation = {
    regulation_id: 'reg-m-b',
    ruleset_version: 'rules-1',
    verification_status: 'verified',
    source_pointer: 'in_game_capture_001',
    legal_pokemon_ids: ['charizard'],
    legal_form_ids: ['charizard-mega-y'],
    legal_item_ids: ['charizardite-y'],
    legal_ability_ids: ['drought'],
    legal_move_ids: ['heat-wave', 'protect']
  };
  const report = TeamLab.validateTeamForRegulation(baseTeam, regulation);
  eq(report.status, 'verified', 'verified allowlists should pass');
  eq(report.errors.length, 0, 'verified report should have no errors');
  eq(report.source_gaps.length, 0, 'verified report should have no source gaps');
});

T('5. validator marks known illegal data illegal instead of provisional', () => {
  const regulation = {
    regulation_id: 'reg-m-b',
    ruleset_version: 'rules-1',
    verification_status: 'verified',
    source_pointer: 'in_game_capture_001',
    legal_pokemon_ids: ['charizard'],
    legal_form_ids: ['charizard-mega-y'],
    legal_item_ids: ['charizardite-y'],
    legal_ability_ids: ['drought'],
    legal_move_ids: ['protect']
  };
  const report = TeamLab.validateTeamForRegulation(baseTeam, regulation);
  eq(report.status, 'illegal', 'known illegal move should fail');
  truthy(report.errors.some((err) => err.code === 'MOVE_ILLEGAL'), 'illegal move error missing');
});

T('5b. legality evidence package keeps incomplete source data as needs_verification', () => {
  const pkg = {
    schema_version: 'champions-legality-evidence-package-v1',
    package_id: 'dev-regmb-incomplete',
    regulation_id: 'champions_reg_m_b_2026',
    ruleset_version: 'regmb-dev-source-package-v1',
    format: 'doubles',
    verification_status: 'needs_verification',
    source_captures: [
      {
        id: 'community-note-not-authoritative',
        source_tier: 'community_secondary',
        verification_status: 'unverified',
        pointer: 'dev fixture only'
      }
    ],
    allowlists: {
      legal_pokemon_ids: ['charizard']
    },
    allowlist_completeness: {
      legal_pokemon_ids: false
    }
  };
  const report = LegalityEvidencePackage.validateLegalityEvidencePackage(pkg);
  eq(report.status, 'needs_verification', 'incomplete package must not verify');
  truthy(report.source_gaps.some((gap) => gap.code === 'TRUSTED_SOURCE_CAPTURE_MISSING'), 'trusted source gap missing');
  truthy(report.source_gaps.some((gap) => gap.code === 'ALLOWLIST_INCOMPLETE_LEGAL_POKEMON_IDS'), 'incomplete allowlist gap missing');
  const regulation = LegalityEvidencePackage.regulationFromEvidencePackage(pkg);
  eq(regulation.verification_status, 'needs_verification', 'derived regulation must stay unverified');
  const packageTeam = JSON.parse(JSON.stringify(baseTeam));
  packageTeam.regulation_id = 'champions_reg_m_b_2026';
  const teamReport = TeamLab.validateTeamForRegulation(packageTeam, regulation);
  eq(teamReport.status, 'needs_verification', 'team should remain needs_verification when package is incomplete');
});

T('5c. legality evidence package can prove dev fixtures without inventing Champion data', () => {
  const pkg = {
    schema_version: 'champions-legality-evidence-package-v1',
    package_id: 'dev-regmb-complete',
    regulation_id: 'champions_reg_m_b_2026',
    ruleset_version: 'regmb-dev-source-package-v1',
    format: 'doubles',
    verification_status: 'verified',
    source_captures: [
      {
        id: 'in-game-capture-dev-001',
        source_tier: 'in_game_verified',
        verification_status: 'verified',
        pointer: 'dev fixture standing in for future in-game capture'
      }
    ],
    allowlists: {
      legal_pokemon_ids: ['charizard'],
      legal_form_ids: ['charizard-mega-y'],
      legal_item_ids: ['charizardite-y'],
      legal_ability_ids: ['drought'],
      legal_move_ids: ['heat-wave', 'protect']
    },
    allowlist_completeness: {
      legal_pokemon_ids: true,
      legal_form_ids: true,
      legal_item_ids: true,
      legal_ability_ids: true,
      legal_move_ids: true
    }
  };
  const packageTeam = JSON.parse(JSON.stringify(baseTeam));
  packageTeam.regulation_id = 'champions_reg_m_b_2026';
  const illegalMoveTeam = JSON.parse(JSON.stringify(baseTeam));
  illegalMoveTeam.regulation_id = 'champions_reg_m_b_2026';
  illegalMoveTeam.members[0].moves = ['blast-burn'];
  const unknownTeam = JSON.parse(JSON.stringify(baseTeam));
  unknownTeam.regulation_id = 'champions_reg_m_b_2026';
  unknownTeam.members[0].pokemon_id = 'unknown-champion-row';
  const fixtures = [
    { id: 'known-legal-dev', fixture_type: 'known_legal', expected_status: 'verified', team: packageTeam, source_pointer: 'dev accepted-team placeholder' },
    { id: 'known-illegal-dev', fixture_type: 'known_illegal', expected_status: 'illegal', team: illegalMoveTeam, source_pointer: 'dev rejected-team placeholder' },
    { id: 'stale-dev', fixture_type: 'stale_ruleset', expected_status: 'stale', ruleset_version: 'old-ruleset', team: baseTeam },
    { id: 'needs-source-dev', fixture_type: 'needs_verification', expected_status: 'needs_verification', team: unknownTeam, use_missing_source: true }
  ];
  const packageReport = LegalityEvidencePackage.validateLegalityEvidencePackage(pkg);
  eq(packageReport.status, 'verified', 'complete dev package should validate structurally');
  const fixtureReport = LegalityEvidencePackage.evaluateLegalityFixtures(pkg, fixtures);
  eq(fixtureReport.all_passed, true, 'fixture statuses should match expected results');
  eq(fixtureReport.counts.verified, 1, 'known legal fixture count missing');
  eq(fixtureReport.counts.illegal, 1, 'known illegal fixture count missing');
  eq(fixtureReport.counts.stale, 1, 'stale fixture count missing');
  eq(fixtureReport.counts.needs_verification, 1, 'needs_verification fixture count missing');
  const readiness = LegalityEvidencePackage.promotionReadinessFromEvidencePackage(pkg, fixtures);
  eq(readiness.ready_for_runtime_promotion, true, 'complete package plus all fixture classes should be promotion-ready');
  eq(readiness.status, 'verified', 'promotion readiness should be verified');
});

T('5d. legality evidence package blocks promotion when fixture classes are missing', () => {
  const pkg = {
    schema_version: 'champions-legality-evidence-package-v1',
    package_id: 'dev-regmb-complete-no-negative-fixtures',
    regulation_id: 'champions_reg_m_b_2026',
    ruleset_version: 'regmb-dev-source-package-v1',
    format: 'doubles',
    verification_status: 'verified',
    source_captures: [
      { id: 'in-game-capture-dev-001', source_tier: 'in_game_verified', verification_status: 'verified', pointer: 'dev fixture only' }
    ],
    allowlists: {
      legal_pokemon_ids: ['charizard'],
      legal_form_ids: ['charizard-mega-y'],
      legal_item_ids: ['charizardite-y'],
      legal_ability_ids: ['drought'],
      legal_move_ids: ['heat-wave', 'protect']
    },
    allowlist_completeness: {
      legal_pokemon_ids: true,
      legal_form_ids: true,
      legal_item_ids: true,
      legal_ability_ids: true,
      legal_move_ids: true
    }
  };
  const packageTeam = JSON.parse(JSON.stringify(baseTeam));
  packageTeam.regulation_id = 'champions_reg_m_b_2026';
  const readiness = LegalityEvidencePackage.promotionReadinessFromEvidencePackage(pkg, [
    { id: 'known-legal-dev', fixture_type: 'known_legal', expected_status: 'verified', team: packageTeam }
  ]);
  eq(readiness.ready_for_runtime_promotion, false, 'missing negative/stale/unknown fixtures should block promotion');
  eq(readiness.status, 'needs_verification', 'incomplete fixture set should remain needs_verification');
  truthy(readiness.source_gaps.some((gap) => gap.indexOf('FIXTURE_TYPES_MISSING') === 0), 'missing fixture source gap absent');
});

T('5e. Regulation M-B skeleton package is Champion-only and blocked until source captures arrive', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'source', 'reg-m-b-legality-evidence-package.json'), 'utf8'));
  const fixtureSet = JSON.parse(fs.readFileSync(path.join(ROOT, 'source', 'reg-m-b-legality-fixtures.json'), 'utf8'));
  eq(pkg.schema_version, 'champions-legality-evidence-package-v1', 'package schema');
  eq(pkg.regulation_id, 'champions_reg_m_b_2026', 'package must target Pokemon Champions Reg M-B');
  eq(pkg.format, 'doubles', 'package format');
  eq(pkg.verification_status, 'needs_verification', 'skeleton package must not be verified');
  truthy(/Pokemon Champions|Champion/.test(pkg.status_note), 'package status should name Champion source boundary');
  truthy(!JSON.stringify(pkg).toLowerCase().includes('scarlet'), 'Reg M-B package must not use Scarlet source scope');
  truthy(!JSON.stringify(pkg).toLowerCase().includes('tera'), 'Reg M-B package must not promote Tera source scope');
  const report = LegalityEvidencePackage.validateLegalityEvidencePackage(pkg);
  eq(report.status, 'needs_verification', 'skeleton package must fail closed');
  truthy(report.source_gaps.some((gap) => gap.code === 'SOURCE_CAPTURE_MISSING'), 'source capture gap missing');
  truthy(report.source_gaps.some((gap) => gap.code === 'TRUSTED_SOURCE_CAPTURE_MISSING'), 'trusted source capture gap missing');
  LegalityEvidencePackage.LIST_KEYS.forEach((key) => {
    truthy(report.source_gaps.some((gap) => gap.code === 'ALLOWLIST_MISSING_' + key.toUpperCase()), key + ' missing gap absent');
    truthy(report.source_gaps.some((gap) => gap.code === 'ALLOWLIST_INCOMPLETE_' + key.toUpperCase()), key + ' incomplete gap absent');
  });
  eq(fixtureSet.schema_version, 'champions-legality-fixture-set-v1', 'fixture set schema');
  eq(fixtureSet.regulation_id, pkg.regulation_id, 'fixture regulation should match package');
  const readiness = LegalityEvidencePackage.promotionReadinessFromEvidencePackage(pkg, fixtureSet.fixtures);
  eq(readiness.ready_for_runtime_promotion, false, 'skeleton package must not promote');
  eq(readiness.status, 'needs_verification', 'readiness status should fail closed');
  eq(readiness.fixture_counts.total, 4, 'placeholder fixture count');
  truthy(readiness.source_gaps.includes('SOURCE_CAPTURE_MISSING'), 'readiness should surface source capture gap');
});

T('5f. Regulation M-B Codex scaffold preserves TBD/not_captured proof boundaries', () => {
  const captures = JSON.parse(fs.readFileSync(path.join(ROOT, 'source', 'reg-m-b-capture-records.seed.json'), 'utf8'));
  const teamCases = JSON.parse(fs.readFileSync(path.join(ROOT, 'source', 'reg-m-b-team-validation-cases.seed.json'), 'utf8'));
  const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'source', 'reg-m-b-source-policy.json'), 'utf8'));
  truthy(Array.isArray(captures) && captures.length >= 8, 'capture scaffold missing');
  truthy(Array.isArray(teamCases) && teamCases.length === 2, 'team validation seed cases missing');
  ['primary_official', 'primary_in_game', 'derived_from_primary'].forEach((tier) => {
    truthy(policy.final_report_allowed_sources.includes(tier), tier + ' should be allowed by policy');
  });
  truthy(policy.blocked_as_final_sources.includes('secondary_discovery_only'), 'secondary discovery source must stay blocked as final proof');
  truthy(policy.hard_rules.some((rule) => /never infer missing/i.test(rule)), 'missing no-inference hard rule');
  const p0 = captures.filter((row) => row.capture_id && ['C001', 'C002', 'C003', 'C004', 'C005', 'C007', 'C008', 'C009'].includes(row.capture_id));
  eq(p0.length, 8, 'P0 capture set should have eight required rows');
  truthy(p0.every((row) => row.status === 'not_captured'), 'P0 rows must remain not_captured until real proof is attached');
  truthy(captures.some((row) => row.capture_id === 'C012' && row.status === 'pending_primary_captures'), 'derived transcription row must wait on primary captures');
  truthy(teamCases.every((row) => row.game === 'Pokémon Champions'), 'team cases must target Pokemon Champions');
  truthy(teamCases.every((row) => row.regulation_set === 'Regulation Set M-B'), 'team cases must target Reg M-B');
  truthy(teamCases.every((row) => row.current_state === 'fixture_seed_only_not_verified'), 'team cases must remain seed-only until in-game validation');
  truthy(JSON.stringify(teamCases).includes('TBD'), 'team cases should preserve TBD placeholders');
});

T('5g. Showdown battle folder imports as reference gameplay evidence only', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'source', 'reg-m-b-showdown-reference-battles.json'), 'utf8'));
  eq(manifest.schema_version, 'champions-showdown-reference-battle-manifest-v1', 'showdown manifest schema');
  eq(manifest.source_tier, 'showdown_reference', 'showdown manifest tier');
  eq(manifest.verification_status, 'reference_only', 'showdown manifest status');
  truthy(manifest.counts.total >= 1, 'showdown manifest should include battle rows');
  truthy(manifest.counts.reg_m_b >= 1, 'showdown manifest should include Reg M-B rows');
  truthy(manifest.rows.every((row) => row.source_tier === 'showdown_reference'), 'all rows must stay showdown_reference');
  truthy(manifest.rows.every((row) => row.verification_status === 'reference_only'), 'all rows must stay reference_only');
  truthy(manifest.rows.every((row) => row.blocked_use.includes('official_champion_legality')), 'rows must block official legality use');
  truthy(manifest.rows.every((row) => row.blocked_use.includes('team_lab_official_ranking')), 'rows must block official ranking use');
  truthy(manifest.rows.some((row) => row.allowed_use.includes('coaching_calibration')), 'rows should support coaching calibration');
  const regMbRows = manifest.rows.filter((row) => row.regulation_label === 'Reg M-B');
  truthy(regMbRows.every((row) => row.tier && row.tier.includes('Champions') && row.tier.includes('Reg M-B')), 'Reg M-B rows should preserve Showdown tier labels');
});

T('6. raw win rate and adjusted win rate are sample-size aware', () => {
  eq(TeamLab.rawWinRate(7, 2, 1), 0.75, 'raw win rate should count draws as half win');
  approx(TeamLab.adjustedWinRate(1, 0, 0, 0.5, 30), 0.516129, 0.000001, 'adjusted win rate should shrink low sample toward prior');
  const score = TeamLab.rankingScore({ adjusted_win_rate: 0.6, opponent_strength_delta: 0.02, matchup_coverage_bonus: 0.02, confidence: 'medium', source_gaps: [], volatility_penalty: 0 });
  truthy(score > 0.6, 'ranking score should include more than raw/adjusted win rate');
});

T('7. confidence assignment uses sample size and verification state', () => {
  eq(TeamLab.confidenceForSample(10, 'verified'), 'low', 'low sample should be low');
  eq(TeamLab.confidenceForSample(80, 'verified'), 'medium', 'medium sample should be medium');
  eq(TeamLab.confidenceForSample(250, 'verified'), 'high', 'large sample should be high');
  eq(TeamLab.confidenceForSample(250, 'needs_verification'), 'experimental', 'unverified legality should be experimental');
});

T('8. leaderboard excludes illegal teams and treats needs_verification as experimental', () => {
  const teams = [
    { id: 'a', name: 'Verified A', format: 'doubles', regulation_id: 'reg-m-b', visibility: 'public', legality_status: 'verified', archetype_tags: ['sun'] },
    { id: 'b', name: 'Illegal B', format: 'doubles', regulation_id: 'reg-m-b', visibility: 'public', legality_status: 'illegal', archetype_tags: ['bad'] },
    { id: 'c', name: 'Needs Source C', format: 'doubles', regulation_id: 'reg-m-b', visibility: 'public', legality_status: 'needs_verification', archetype_tags: ['lab'] }
  ];
  const runs = [];
  for (let i = 0; i < 40; i += 1) runs.push({ team_a_id: 'a', team_b_id: 'c', regulation_id: 'reg-m-b', format: 'doubles', engine_version: 'eng-1', ruleset_version: 'rules-1', winner_team_id: i < 24 ? 'a' : 'c', result_reason: 'ko' });
  for (let i = 0; i < 40; i += 1) runs.push({ team_a_id: 'a', team_b_id: 'b', regulation_id: 'reg-m-b', format: 'doubles', engine_version: 'eng-1', ruleset_version: 'rules-1', winner_team_id: 'b', result_reason: 'ko' });
  const entries = TeamLab.buildLeaderboardEntries(teams, runs, { regulation_id: 'reg-m-b', format: 'doubles', engine_version: 'eng-1', ruleset_version: 'rules-1', min_sample_size: 30 });
  truthy(entries.some((entry) => entry.team_id === 'a'), 'verified team missing');
  truthy(!entries.some((entry) => entry.team_id === 'b'), 'illegal team should be excluded');
  const a = entries.find((entry) => entry.team_id === 'a');
  eq(a.leaderboard_scope, 'community_candidate', 'verified non-benchmark team should stay community candidate by default');
  eq(a.evidence_quality, 'community_safe', 'verified non-benchmark team should be community_safe');
  truthy(typeof a.ranking_score === 'number', 'ranking score missing');
  truthy(a.matchup_coverage.unique_opponents >= 1, 'matchup coverage missing opponents');
  const c = entries.find((entry) => entry.team_id === 'c');
  truthy(c, 'needs_verification team should appear as experimental evidence');
  eq(c.confidence, 'experimental', 'needs_verification confidence should be experimental');
  eq(c.leaderboard_scope, 'experimental', 'needs_verification scope should be experimental');
  eq(c.evidence_quality, 'experimental', 'needs_verification evidence quality should be experimental');
});

T('8b. official Top 25 promotion requires benchmark-approved current verified evidence', () => {
  const teams = [
    { id: 'a', name: 'Verified A', format: 'doubles', regulation_id: 'reg-m-b', visibility: 'public', legality_status: 'verified', archetype_tags: ['sun'] },
    { id: 'b', name: 'Verified B', format: 'doubles', regulation_id: 'reg-m-b', visibility: 'public', legality_status: 'verified', archetype_tags: ['rain'] }
  ];
  const runs = [];
  for (let i = 0; i < 80; i += 1) runs.push({ team_a_id: 'a', team_b_id: 'b', regulation_id: 'reg-m-b', format: 'doubles', engine_version: 'eng-1', ruleset_version: 'rules-1', winner_team_id: i < 50 ? 'a' : 'b', result_reason: 'ko' });
  const entries = TeamLab.buildLeaderboardEntries(teams, runs, { regulation_id: 'reg-m-b', format: 'doubles', engine_version: 'eng-1', ruleset_version: 'rules-1', min_sample_size: 30, approved_benchmark_pool: true });
  const a = entries.find((entry) => entry.team_id === 'a');
  eq(a.leaderboard_scope, 'official_sim_top_25', 'approved verified evidence should promote to official scope');
  eq(a.evidence_quality, 'official_ready', 'approved verified evidence should be official_ready');
});

T('9. stale marking and filters keep current rankings distinct from old evidence', () => {
  const rows = [
    { team_id: 'a', regulation_id: 'reg-m-b', format: 'doubles', engine_version: 'eng-1', ruleset_version: 'rules-1', stale: false, confidence: 'high', legality_status: 'verified', visibility: 'public' },
    { team_id: 'b', regulation_id: 'reg-m-b', format: 'doubles', engine_version: 'eng-0', ruleset_version: 'rules-1', stale: false, confidence: 'medium', legality_status: 'verified', visibility: 'public' }
  ];
  const marked = TeamLab.markLeaderboardEntriesStale(rows, 'engine_updated', 'eng-0');
  eq(marked[1].stale, true, 'old engine row should be stale');
  eq(marked[1].stale_reason, 'engine_updated', 'stale reason missing');
  eq(TeamLab.filterLeaderboard(marked, { stale: false }).length, 1, 'current filter should remove stale rows');
  eq(TeamLab.isEntryCurrent(marked[0], { engine_version: 'eng-1', ruleset_version: 'rules-1' }), true, 'current row should be current');
  eq(TeamLab.isEntryCurrent(marked[1], { engine_version: 'eng-1', ruleset_version: 'rules-1' }), false, 'stale row should not be current');
});

T('9b. admin ranking reset requires admin and audit reason before stale marking', () => {
  const rows = [
    { team_id: 'a', regulation_id: 'reg-m-b', format: 'doubles', leaderboard_scope: 'community_candidate', engine_version: 'eng-1', ruleset_version: 'rules-1', stale: false },
    { team_id: 'b', regulation_id: 'reg-m-b', format: 'singles', leaderboard_scope: 'community_candidate', engine_version: 'eng-1', ruleset_version: 'rules-1', stale: false }
  ];
  const blocked = TeamLab.resetLeaderboardRankings(rows, { reason: 'QA reset before fresh sim run', regulation_id: 'reg-m-b', format: 'doubles' }, { is_admin: false });
  eq(blocked.ok, false, 'non-admin reset should be blocked');
  eq(blocked.error, 'ADMIN_REQUIRED', 'non-admin error mismatch');
  const noReason = TeamLab.resetLeaderboardRankings(rows, { reason: 'short', regulation_id: 'reg-m-b', format: 'doubles' }, { is_admin: true, user_id: 'admin-1' });
  eq(noReason.ok, false, 'short reason should be blocked');
  eq(noReason.error, 'REASON_REQUIRED', 'reason error mismatch');
  const reset = TeamLab.resetLeaderboardRankings(rows, { reason: 'QA reset before fresh sim run', regulation_id: 'reg-m-b', format: 'doubles' }, { is_admin: true, user_id: 'admin-1' });
  eq(reset.ok, true, 'admin reset should pass');
  eq(reset.changed_count, 1, 'reset should only affect matching scope');
  eq(reset.entries[0].stale, true, 'matching row should be stale');
  eq(reset.entries[1].stale, false, 'nonmatching row should stay current');
  eq(reset.audit.action, 'team_lab_ranking_reset', 'audit action missing');
  eq(reset.audit.reason, 'QA reset before fresh sim run', 'audit reason missing');
});

T('10. hidden-detail teams do not leak hidden moves/items/EVs to non-owners', () => {
  const publicView = TeamLab.applyTeamVisibility(baseTeam, 'user-2');
  truthy(publicView, 'hidden-detail team summary should be visible');
  truthy(publicView.members[0].hidden_details_redacted, 'hidden member should be redacted');
  eq(Object.prototype.hasOwnProperty.call(publicView.members[0], 'moves'), false, 'hidden moves leaked');
  eq(Object.prototype.hasOwnProperty.call(publicView.members[0], 'item_id'), false, 'hidden item leaked');
  eq(Object.prototype.hasOwnProperty.call(publicView.members[0], 'evs'), false, 'hidden EVs leaked');
  const ownerView = TeamLab.applyTeamVisibility(baseTeam, 'user-1');
  truthy(ownerView.members[0].moves.includes('heat-wave'), 'owner should see moves');
});

T('11. private teams are owner-only in service visibility logic', () => {
  const privateTeam = Object.assign({}, baseTeam, { visibility: 'private' });
  eq(TeamLab.applyTeamVisibility(privateTeam, 'user-2'), null, 'private team leaked to non-owner');
  truthy(TeamLab.applyTeamVisibility(privateTeam, 'user-1'), 'private team hidden from owner');
});

T('12. compare output is explicitly simulator-derived and carries stale/source warnings', () => {
  const result = TeamLab.compareTeamToLeaderboard('a', [
    { team_id: 'b', regulation_id: 'reg-m-b', format: 'doubles', stale: true, stale_reason: 'rules_updated', source_gaps: ['MOVE_SOURCE_GAP'] }
  ], [
    { team_id: 'a', opponent_team_id: 'b', regulation_id: 'reg-m-b', format: 'doubles', win_rate: 0.42, games_played: 20, confidence: 'low' }
  ], { regulation_id: 'reg-m-b', format: 'doubles', top_n: 5 });
  truthy(result.label.includes('Simulator-derived evidence'), 'compare label should prevent ladder-truth overclaim');
  truthy(result.stale_warnings.includes('rules_updated'), 'stale warning missing');
  truthy(result.unresolved_source_gaps.includes('MOVE_SOURCE_GAP'), 'source gap missing');
});

T('13. team key mapping must be verified before official promotion', () => {
  const missing = TeamLab.resolveTeamKeyMapping('player', [], { source_system: 'branch_coverage', regulation_id: 'reg-m-b', format: 'doubles' });
  eq(missing.ok, false, 'missing mapping should not resolve');
  eq(missing.source_gap, 'TEAM_KEY_MAPPING_MISSING', 'missing mapping gap mismatch');
  const pending = TeamLab.resolveTeamKeyMapping('player', [
    { id: 'map-1', source_system: 'branch_coverage', source_team_key: 'player', team_id: 'team-a', regulation_id: 'reg-m-b', format: 'doubles', mapping_status: 'pending' }
  ], { source_system: 'branch_coverage', regulation_id: 'reg-m-b', format: 'doubles' });
  eq(pending.ok, false, 'pending mapping should not verify');
  eq(pending.source_gap, 'TEAM_KEY_MAPPING_PENDING', 'pending mapping gap mismatch');
  const verified = TeamLab.resolveTeamKeyMapping('player', [
    { id: 'map-2', source_system: 'branch_coverage', source_team_key: 'player', team_id: 'team-a', regulation_id: 'reg-m-b', format: 'doubles', mapping_status: 'verified' }
  ], { source_system: 'branch_coverage', regulation_id: 'reg-m-b', format: 'doubles' });
  eq(verified.ok, true, 'verified mapping should resolve');
  eq(verified.team_lab_team_id, 'team-a', 'verified mapping team mismatch');
});

T('13b. artifact resolver maps verified artifact keys to durable Team Lab IDs', () => {
  const artifact = {
    schema_version: 'champions-qa-artifact-v1',
    regulation_id: 'reg-m-b',
    format: 'doubles',
    source_gaps: ['TEAM_ID_MAPPING_NEEDED', 'SEED_MISSING_FROM_ARTIFACT'],
    retained: {
      replay_cards: [
        { player_team_id: 'player', opponent_team_id: 'mega_altaria', seed: 'seed-1' }
      ]
    }
  };
  const resolved = TeamLab.resolveArtifactTeamMappings(artifact, [
    { id: 'map-player', source_system: 'qa_artifact', source_team_key: 'player', team_id: 'team-player', regulation_id: 'reg-m-b', format: 'doubles', mapping_status: 'verified' },
    { id: 'map-opp', source_system: 'qa_artifact', source_team_key: 'mega_altaria', team_id: 'team-opp', regulation_id: 'reg-m-b', format: 'doubles', mapping_status: 'verified' }
  ], { source_system: 'qa_artifact' });
  eq(resolved.ok, true, 'verified artifact should resolve');
  eq(resolved.status, 'verified', 'verified artifact status mismatch');
  eq(resolved.team_id_map.player, 'team-player', 'player role mapping mismatch');
  eq(resolved.team_id_map.mega_altaria, 'team-opp', 'opponent key mapping mismatch');
  truthy(!resolved.source_gaps.includes('TEAM_ID_MAPPING_NEEDED'), 'resolved mapping gap should be cleared');
  truthy(resolved.source_gaps.includes('SEED_MISSING_FROM_ARTIFACT'), 'non-mapping source gap should remain');
});

T('13c. artifact resolver preserves source gaps when team mapping is missing', () => {
  const artifact = {
    regulation_id: 'reg-m-b',
    format: 'doubles',
    source_gaps: ['TEAM_ID_MAPPING_NEEDED', 'RULESET_VERSION_INFERRED'],
    replay_records: [
      { team_a_id: 'artifact:player:player', team_b_id: 'artifact:opponent:unknown_opp' }
    ]
  };
  const resolved = TeamLab.resolveArtifactTeamMappings(artifact, [
    { id: 'map-player', source_system: 'qa_artifact', source_team_key: 'player', team_id: 'team-player', regulation_id: 'reg-m-b', format: 'doubles', mapping_status: 'verified' }
  ], { source_system: 'qa_artifact' });
  eq(resolved.ok, false, 'missing opponent mapping should block resolution');
  eq(resolved.status, 'needs_review', 'missing mapping status mismatch');
  eq(resolved.unresolved_count, 1, 'unresolved mapping count mismatch');
  truthy(resolved.source_gaps.includes('TEAM_ID_MAPPING_NEEDED'), 'original mapping source gap should remain');
  truthy(resolved.source_gaps.includes('TEAM_KEY_MAPPING_MISSING'), 'missing mapping source gap should be added');
  truthy(resolved.source_gaps.includes('RULESET_VERSION_INFERRED'), 'unrelated source gap should be preserved');
});

T('13d. artifact resolver refuses ambiguous team-key mappings', () => {
  const artifact = {
    regulation_id: 'reg-m-b',
    format: 'doubles',
    retained: {
      replay_cards: [
        { player_team_id: 'player', opponent_team_id: 'opponent' }
      ]
    }
  };
  const resolved = TeamLab.resolveArtifactTeamMappings(artifact, [
    { id: 'map-a', source_system: 'qa_artifact', source_team_key: 'player', team_id: 'team-a', regulation_id: 'reg-m-b', format: 'doubles', mapping_status: 'verified' },
    { id: 'map-b', source_system: 'qa_artifact', source_team_key: 'player', team_id: 'team-b', regulation_id: 'reg-m-b', format: 'doubles', mapping_status: 'verified' },
    { id: 'map-opp', source_system: 'qa_artifact', source_team_key: 'opponent', team_id: 'team-opp', regulation_id: 'reg-m-b', format: 'doubles', mapping_status: 'verified' }
  ], { source_system: 'qa_artifact' });
  eq(resolved.ok, false, 'ambiguous mapping should block resolution');
  eq(resolved.status, 'ambiguous', 'ambiguous status mismatch');
  eq(resolved.ambiguous_count, 1, 'ambiguous mapping count mismatch');
  truthy(resolved.source_gaps.includes('TEAM_KEY_MAPPING_AMBIGUOUS'), 'ambiguous mapping source gap missing');
  eq(Object.prototype.hasOwnProperty.call(resolved.team_id_map, 'player'), false, 'ambiguous player key should not map');
});

T('14. promotion gate blocks unsafe evidence and approves only fully mapped current verified rows', () => {
  const baseEntry = {
    team_id: 'team-a',
    regulation_id: 'reg-m-b',
    format: 'doubles',
    leaderboard_scope: 'community_candidate',
    engine_version: 'eng-1',
    ruleset_version: 'rules-1',
    legality_status: 'verified',
    evidence_quality: 'official_ready',
    games_played: 240,
    confidence: 'high',
    stale: false,
    source_gaps: []
  };
  const rule = TeamLab.defaultPromotionRule({ regulation_id: 'reg-m-b', format: 'doubles', min_sample_size: 200 });
  const blocked = TeamLab.evaluateLeaderboardPromotion(baseEntry, {
    rule,
    current_engine_version: 'eng-1',
    current_ruleset_version: 'rules-1',
    approved_benchmark_pool: false,
    mapping: { status: 'verified', team_lab_team_id: 'team-a', mapping: { id: 'map-1' } }
  });
  eq(blocked.approved, false, 'unapproved benchmark pool should block promotion');
  truthy(blocked.reasons.includes('BENCHMARK_POOL_NOT_APPROVED'), 'benchmark reason missing');

  const experimental = TeamLab.evaluateLeaderboardPromotion(Object.assign({}, baseEntry, {
    legality_status: 'needs_verification',
    evidence_quality: 'experimental',
    source_gaps: ['REGULATION_SOURCE_MISSING']
  }), {
    rule,
    current_engine_version: 'eng-1',
    current_ruleset_version: 'rules-1',
    approved_benchmark_pool: true,
    mapping: { status: 'pending', team_lab_team_id: 'team-a', source_gap: 'TEAM_KEY_MAPPING_PENDING' }
  });
  eq(experimental.decision, 'experimental', 'unverified legality/source gaps should stay experimental');
  truthy(experimental.reasons.includes('LEGALITY_NOT_VERIFIED'), 'legality reason missing');
  truthy(experimental.reasons.includes('TEAM_KEY_MAPPING_PENDING'), 'mapping reason missing');

  const approved = TeamLab.evaluateLeaderboardPromotion(baseEntry, {
    rule,
    current_engine_version: 'eng-1',
    current_ruleset_version: 'rules-1',
    approved_benchmark_pool: true,
    mapping: { status: 'verified', team_lab_team_id: 'team-a', mapping: { id: 'map-1' } }
  });
  eq(approved.approved, true, 'fully gated row should approve');
  eq(approved.leaderboard_scope, 'official_sim_top_25', 'approved scope mismatch');
  const promoted = TeamLab.applyPromotionDecision(baseEntry, approved);
  eq(promoted.promotion_status, 'approved', 'promotion status mismatch');
  eq(promoted.leaderboard_scope, 'official_sim_top_25', 'promoted scope mismatch');
  eq(promoted.team_key_mapping_id, 'map-1', 'mapping id should attach to promoted row');
});

console.log(`\nTeam Lab foundation: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
