// Project Overview tab should track shipped work, validation, gaps, and milestones.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function inc(hay, needle, msg='') {
  if (String(hay).indexOf(needle) < 0) throw new Error((msg || 'missing') + ': ' + needle);
}

console.log('\n=== project overview tab tests ===\n');

T('1. Overview is a top-level tab and mobile picker option', () => {
  inc(html, 'data-tab="overview">Overview');
  inc(html, '<option value="overview">Overview</option>');
  inc(html, '<section class="tab-panel" id="tab-overview">');
  inc(html, 'id="overview-content"');
});

T('2. Overview tracks accomplished work and validation proof', () => {
  inc(ui, 'CS_OVERVIEW_DATA');
  inc(ui, 'Current Truth');
  inc(ui, 'Not 100% yet');
  inc(ui, 'Damage Logs');
  inc(ui, 'Applied/calc split fixed locally');
  inc(ui, 'Testing Catalog Target');
  inc(ui, 'Top 10 Champion archetypes');
  inc(ui, 'Removed Teams');
  inc(ui, '17 legacy/inferred rows');
  inc(ui, '15 approved runtime rows');
  inc(ui, 'Stress Lite totals + coaching summary live');
  inc(ui, 'DB Log Detail');
  inc(ui, 'Summary/capped; exports are forensic proof');
  inc(ui, 'Current Champion source sweep recorded');
  inc(ui, 'Sim Truth Gate');
  inc(ui, 'Knock Off');
  inc(ui, 'Verified');
  inc(ui, 'Move Support');
  inc(ui, '120 verified / 0 baseline');
  inc(ui, 'Showdown Oracle');
  inc(ui, '56/56 green');
  inc(ui, 'Review tab restored');
  inc(ui, 'Live team-load simulation failure fixed');
  inc(ui, 'Lethal Sitrus and Oran timing fixed');
  inc(ui, 'Champion item and SP gate added');
  inc(ui, 'Stable Pokemon identity in sim exports');
  inc(ui, 'Move priority aligned with Showdown data');
  inc(ui, 'Showdown primary move metadata for imported teams');
  inc(ui, 'Target category bridge and stale-target retargeting guarded');
  inc(ui, 'Runtime naming cheat sheet added');
  inc(ui, 'Large-run QA artifact export added');
  inc(ui, 'QA coverage summary added to exports');
  inc(ui, 'Recoil applied HP evidence corrected');
  inc(ui, 'Type multiplier audit added');
  inc(ui, 'Low Kick weight source added');
  inc(ui, 'Core shipped move parity closed');
  inc(ui, 'Typed held-item damage boosts fixed');
  inc(ui, 'Stat and effective-speed evidence added to exports');
  inc(ui, 'Knock Off item behavior guarded');
  inc(ui, 'Champions SP/SV stat format');
  inc(ui, 'damage_events');
  inc(ui, 'effect_events');
  inc(ui, 'qa_coverage_summary');
  inc(ui, 'Effect math evidence added to turn logs');
  inc(ui, 'Shed Tail now follows Showdown context: 1/2 max HP cost rounded up');
  inc(ui, 'Architecture and evidence map added');
  inc(ui, 'source-to-engine-to-export map');
  inc(ui, 'DB history limits');
  inc(ui, 'Showdown sync and DB writer staged');
  inc(ui, 'Curated ability inventory modeled');
  inc(ui, 'Simulation-first direction documented');
  inc(ui, 'Public release milestone map documented');
  inc(ui, 'Live exported logs prove the sim now runs');
  inc(ui, 'Latest v2.1.33 logs pass strict structure and expose stacked mechanics evidence');
  inc(ui, 'The only no-valid-target line is terminal after the player side is empty');
  inc(ui, 'Item timing regression reproduced and covered');
  inc(ui, 'Fresh logs exposed a targeting boundary bug');
  inc(ui, 'Ability coverage guard is green');
  inc(ui, 'Priority-suppression family now has same-rule regression proof');
  inc(ui, 'Armor Tail, Dazzling, and Queenly Majesty');
  inc(ui, 'Previous v2.1.36 release checks were green');
  inc(ui, 'The current local damage-log and approved-team-gate slice has focused green checks');
  inc(ui, 'Damage applied versus calculated logging fixed locally');
  inc(ui, 'Strategy Priority Board added');
  inc(ui, 'coach call first');
  inc(ui, 'Branch move coach feeds the Strategy guide');
  inc(ui, 'confidence-rated avoid moves');
  inc(ui, 'Approved Champion team lane guarded');
  inc(ui, 'DB species/move legality view added');
  inc(ui, 'Showdown sync approval guard tightened');
  inc(ui, 'Low Kick weight-based damage matches Showdown');
  inc(ui, 'Showdown data/moves.ts records Low Kick basePower as 0');
  inc(ui, '100% Champion parity checklist is explicit');
  inc(ui, 'Damage stack oracle is green');
  inc(ui, 'Tera Blast parity is isolated from current Reg M-A');
  inc(ui, 'Knock Off source-truth behavior is documented');
  inc(ui, 'Turn-order stack evidence is green');
  inc(ui, 'GitHub issue sweep completed');
  inc(ui, 'Previous Y/Alfredo source sync completed');
});

T('3. Overview names current Supabase and Showdown DB alignment state', () => {
  inc(ui, 'Supabase app wiring is live for existing app tables');
  inc(ui, 'Local DB contract suite is green');
  inc(ui, 'Latest v2.1.42 browser logs validate and expose effect evidence');
  inc(ui, 'Fresh v2.1.43 single logs exposed recoil evidence naming drift');
  inc(ui, 'Live Supabase freshness checks require `RUN_LIVE_DB=1`');
  inc(ui, 'overview-showdown-db-inspect');
  inc(ui, 'loadShowdownDbSnapshot');
  inc(ui, 'loadShowdownEntities');
  inc(ui, 'approvedCounts');
  inc(ui, 'sourceFiles');
  inc(ui, 'Champions override seed/review remains open');
  inc(ui, 'generate_showdown_data.mjs');
  inc(ui, 'Live logs exposed stale DB item drift');
  inc(ui, 'Pokemon data audit has unresolved reviewer risk');
  inc(ui, '100% parity still has non-move gates');
  inc(ui, 'Mechanics truth beta gate remains open');
  inc(ui, 'Move support is 120 verified / 0 baseline / 0 incomplete');
  inc(ui, 'Source refresh needed must be visible before trust claims');
  inc(ui, 'Full raw thousand-battle retention is still not automatic');
  inc(ui, 'Supabase history is not full forensic turn-log storage yet');
  inc(ui, 'downloaded turn-log JSON and QA Artifact export');
  inc(ui, 'Team editor is guarded but not a fluid full builder yet');
  inc(ui, 'Alfredo #241');
  inc(ui, 'Life Orb');
  inc(ui, 'showdown_sync_runs');
  inc(ui, 'showdown_entities');
  inc(ui, 'champions_overrides');
});

T('3b. replay formatter accepts richer applied damage log brackets', () => {
  inc(ui, 'dmg(?:,[^\\]]*)?');
  inc(ui, 'lost $1 HP');
});

T('4. Overview includes next milestones and source docs', () => {
  inc(ui, 'Stress-test, rebuild, and prove the new truth board');
  inc(ui, 'Replace removed teams with approved Champion teams');
  inc(ui, 'Trick Room, anti-Trick Room, Tailwind/speed, sun, rain, sand or snow');
  inc(ui, 'Verify the next deployed source URL and QA artifact');
  inc(ui, 'Mirror or update JD issue alignment in the Y fork');
  inc(ui, 'Apply Champion item cleanup to live Supabase rows');
  inc(ui, 'Seed and review Champions overrides');
  inc(ui, 'Design DB forensic log retention before relying on saved history');
  inc(ui, 'build_id, source_url, and retention metadata');
  inc(ui, 'Prove post-move mechanics by battle system');
  inc(ui, 'With the shipped move audit at 120 verified / 0 baseline / 0 incomplete');
  inc(ui, 'Close the mechanics truth beta gate');
  inc(ui, 'Pokemon Champions mechanics truth gate');
  inc(ui, 'finish action-denial and priority-suppression reason inventory for singles and doubles');
  inc(ui, 'Make replay and QA transparency strong enough for coaching trust');
  inc(ui, 'HP-loss causes, and move-failure causes obvious enough');
  inc(ui, 'Rebuild editor into full Champion team builder');
  inc(ui, 'Keep Alfredo and Y fork synced through protected PRs');
  inc(ui, 'Surface source drift as update needed in Overview');
  inc(ui, 'Recent Fix + Issue Snapshot');
  inc(ui, 'recent-fixes-and-open-issues-2026-06-21.md');
  inc(ui, 'Architecture + Evidence Map');
  inc(ui, 'CHAMPION_SIM_ARCHITECTURE_AND_EVIDENCE.md');
  inc(ui, 'Champion Parity 100 Checklist');
  inc(ui, 'champion_parity_100_checklist.md');
  inc(ui, 'Move Support Audit');
  inc(ui, 'move_support_audit.md');
  inc(ui, 'Type Multiplier Audit');
  inc(ui, 'type_multiplier_audit.md');
  inc(ui, 'Simulation First');
  inc(ui, 'SIMULATION_FIRST_REALIGNMENT_2026-06-06.md');
  inc(ui, 'Public Release Plan');
  inc(ui, 'PUBLIC_RELEASE_MILESTONE_PLAN_2026-06-06.md');
  inc(ui, 'Showdown DB Stress Test');
  inc(ui, 'SHOWDOWN_DB_WIRING_STRESS_TEST_2026-06-06.md');
  inc(ui, 'Jdoutt38 Investigation');
  inc(ui, 'JDOUTT38_INVESTIGATION_2026-06-06.md');
  inc(ui, 'Closure Confidence');
  inc(ui, 'CLOSURE_CONFIDENCE_2026-06-06.md');
  inc(ui, 'Repo Parity Report');
  inc(ui, 'REPO_PARITY_REPORT_2026-06-06.md');
  inc(ui, 'Closeout Note');
  inc(ui, 'CLOSEOUT_2026-06-06.md');
  inc(ui, 'Showdown DB Plan');
  inc(ui, 'SHOWDOWN_DB_SOURCE_OF_TRUTH_PLAN.md');
  inc(ui, 'Mechanics Truth Beta Gate Checklist');
  inc(ui, 'mechanics_truth_beta_gate_checklist.md');
  inc(ui, 'Approved Runtime Team Test Matrix');
  inc(ui, 'approved_runtime_team_test_matrix.md');
  inc(ui, 'Runtime Naming Cheat Sheet');
  inc(ui, 'SHOWDOWN_RUNTIME_NAMING_CHEATSHEET.md');
  inc(ui, 'SHOWDOWN_SYNC_ARCHITECTURE.md');
});

T('4b. Architecture evidence map documents the QA proof contract', () => {
  const doc = fs.readFileSync(path.join(ROOT, 'docs', 'CHAMPION_SIM_ARCHITECTURE_AND_EVIDENCE.md'), 'utf8');
  inc(doc, 'Source truth');
  inc(doc, 'Review and approval layer');
  inc(doc, 'Generated runtime assets');
  inc(doc, 'Deterministic engine');
  inc(doc, 'QA evidence outputs');
  inc(doc, 'Supabase Boundary');
  inc(doc, 'Damage Calculation Evidence');
  inc(doc, 'Effect Evidence');
  inc(doc, 'Shed Tail has two different HP values');
  inc(doc, 'Required QA Proof Workflow');
  inc(doc, 'Current Non-100% Gaps');
});

T('5. Overview styles are responsive and scan-friendly', () => {
  inc(css, '.overview-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--sp3)}');
  inc(css, '.overview-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:var(--sp4);align-items:start}');
  inc(css, '.overview-db-inspector');
  inc(css, '.overview-milestone-board');
  inc(css, '.overview-milestone-summary');
  inc(css, '.overview-bucket');
  inc(css, '.overview-closed-proof-archive');
  inc(css, '.overview-qa-josh-issues');
  inc(css, '.overview-db-counts');
  inc(css, '.overview-db-table');
  inc(css, '.overview-status.done');
  inc(css, '.overview-status.gap');
  inc(css, '@media(max-width:900px){.overview-grid{grid-template-columns:1fr}.overview-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.overview-db-summary,.overview-db-counts{grid-template-columns:repeat(2,minmax(0,1fr))}}');
});

T('6. Overview renders through a reusable function for future growth', () => {
  inc(ui, 'function renderOverviewTab()');
  inc(ui, 'csBuildOverviewMilestones');
  inc(ui, 'overview-milestone-board');
  inc(ui, 'Milestone Board');
  inc(ui, 'Done / Open / Next');
  inc(ui, 'function csRenderOverviewClosedProofArchive');
  inc(ui, 'overview-closed-proof-summary');
  inc(ui, 'Validated proof stays available for audit');
  inc(ui, 'Simulation Truth & Mechanics Accuracy');
  inc(ui, 'Source Truth, Regulations & Data Governance');
  inc(ui, 'Team Lab, Saved Teams & Evidence Pipeline');
  inc(ui, 'Release Reliability, Security & Repo Sync');
  inc(ui, 'Coaching, UX & Player Learning');
  inc(ui, 'Repo Docs Guide');
  inc(ui, 'what to read first');
  inc(ui, 'QA / Josh Review Issues');
  inc(ui, 'Josh review: Pokemon data audit workbook (#123)');
  inc(ui, 'Manual QA: Champion Replay Intelligence smoke test (#105)');
  inc(ui, 'Second verified Champion replay artifact (#104)');
  inc(ui, 'Mechanics truth audit beta gate (#149)');
  inc(ui, 'Team Lab / Leaderboard Plan');
  inc(ui, 'Team Lab read UI (#179)');
  inc(ui, 'Custom team submission and validation (#180)');
  inc(ui, 'Leaderboard recalculation and stale guards (#181)');
  inc(ui, 'QA artifact import pipeline (#182)');
  inc(ui, 'Compare My Team matchup matrix (#183)');
  inc(ui, 'Hidden-details privacy and public API contract (#184)');
  inc(ui, 'Account profile analytics (#185)');
  inc(ui, 'Global vs personal analytics boundary');
  inc(ui, 'Canonical Team Lab trust roadmap');
  inc(ui, 'ChampionsSim.overview');
  inc(ui, 'renderOverviewTab();');
  inc(ui, '.tab-btn[data-tab="overview"]');
});

console.log(`\nproject overview tab: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
