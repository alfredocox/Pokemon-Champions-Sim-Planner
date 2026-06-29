'use strict';

const fs = require('fs');
const path = require('path');
const SourceTruth = require('../source_truth.js');

const ROOT = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(ROOT, 'db', 'migrations', '2026_06_29_source_truth_ruleset_packages.sql'), 'utf8');

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

console.log('\n=== source truth package tests ===\n');

T('1. migration adds rule_facts and ruleset_packages without replacing existing rulesets', () => {
  truthy(migration.includes('CREATE TABLE IF NOT EXISTS rule_facts'), 'rule_facts table missing');
  truthy(migration.includes('CREATE TABLE IF NOT EXISTS ruleset_packages'), 'ruleset_packages table missing');
  truthy(!migration.includes('CREATE TABLE IF NOT EXISTS rulesets ('), 'must not replace existing rulesets table');
  truthy(migration.includes('REVOKE INSERT, UPDATE, DELETE ON rule_facts FROM anon, authenticated'), 'rule_facts write revoke missing');
  truthy(migration.includes('REVOKE INSERT, UPDATE, DELETE ON ruleset_packages FROM anon, authenticated'), 'ruleset_packages write revoke missing');
});

T('2. migration keeps version and source-status lookup indexes', () => {
  [
    'idx_rule_facts_regulation_ruleset_format',
    'idx_rule_facts_category_status',
    'idx_rule_facts_source_hash',
    'idx_ruleset_packages_lookup',
    'idx_ruleset_packages_status_updated'
  ].forEach((idx) => truthy(migration.includes(idx), `${idx} missing`));
});

T('3. rule fact validation rejects incomplete facts and warns on reference-only facts', () => {
  const bad = SourceTruth.validateRuleFact({ id: 'x', category: 'move', verification_status: 'official_verified' });
  eq(bad.valid, false, 'incomplete fact should fail');
  truthy(bad.errors.some((err) => err.code === 'RULE_FACT_STATEMENT_MISSING'), 'statement error missing');
  const ref = SourceTruth.validateRuleFact({ id: 'showdown-protect', category: 'move', statement: 'Protect exists in Showdown.', ruleset_version: 'showdown-2026-06-29', verification_status: 'showdown_reference' });
  eq(ref.valid, true, 'reference fact shape should be valid');
  truthy(ref.warnings.some((warn) => warn.code === 'REFERENCE_ONLY_FACT'), 'reference warning missing');
});

T('4. compiling with no facts produces needs_verification and source gaps', () => {
  const pkg = SourceTruth.compileRulesetPackage({ regulation_id: 'reg-m-b', ruleset_version: 'rules-1', format: 'doubles', facts: [] });
  eq(pkg.status, 'needs_verification', 'empty facts should not verify');
  eq(pkg.source_status.legality, 'needs_verification', 'legality should need verification');
  truthy(pkg.source_gaps.some((gap) => gap.code === 'NO_RULE_FACTS'), 'NO_RULE_FACTS gap missing');
});

T('5. reference-only facts do not promote Champion legality into verified package truth', () => {
  const pkg = SourceTruth.compileRulesetPackage({
    regulation_id: 'reg-m-b',
    ruleset_version: 'rules-1',
    format: 'doubles',
    facts: [{
      id: 'showdown-list',
      category: 'legality',
      statement: 'Reference list only.',
      regulation_id: 'reg-m-b',
      ruleset_version: 'rules-1',
      format: 'doubles',
      verification_status: 'showdown_reference',
      source_url: 'https://github.com/smogon/pokemon-showdown',
      data: { legal_species: ['charizard'], legal_moves: ['protect'] }
    }]
  });
  eq(pkg.status, 'partial', 'reference-only package should remain partial because source gaps are preserved');
  eq(pkg.legal_species.length, 0, 'reference-only species must not be promoted');
  truthy(pkg.source_gaps.some((gap) => gap.code === 'UNVERIFIED_RULE_FACT'), 'reference source gap missing');
});

T('6. verified facts can compile a complete rankable package', () => {
  const fact = {
    id: 'official-capture-001',
    category: 'legality',
    statement: 'Verified regulation package capture.',
    regulation_id: 'reg-m-b',
    ruleset_version: 'rules-1',
    format: 'doubles',
    verification_status: 'in_game_verified',
    source_note: 'controlled capture',
    data: {
      legal_species: ['charizard'],
      legal_forms: ['charizard-mega-y'],
      legal_moves: ['protect'],
      legal_items: ['charizardite-y'],
      legal_abilities: ['drought'],
      clauses: { species_clause: true, item_clause: true, team_size: 6, bring_size: 4, level_cap: 50 },
      mechanics: { mega_evolution: 'enabled', tera: 'disabled', dynamax: 'disabled' }
    }
  };
  const pkg = SourceTruth.compileRulesetPackage({ regulation_id: 'reg-m-b', ruleset_version: 'rules-1', format: 'doubles', facts: [fact] });
  eq(pkg.status, 'verified', 'complete verified package should verify');
  eq(pkg.source_gaps.length, 0, 'verified package should not have source gaps');
  eq(SourceTruth.packageCanOfficiallyRank(pkg), true, 'complete verified package should be rankable');
});

T('7. summaries distinguish verified, reference-only, unresolved, and conflicting facts', () => {
  const summary = SourceTruth.summarizeRuleFacts([
    { category: 'move', verification_status: 'official_verified' },
    { category: 'move', verification_status: 'showdown_reference' },
    { category: 'move', verification_status: 'needs_verification' },
    { category: 'move', verification_status: 'conflicting' }
  ]);
  eq(summary.total, 4, 'total count');
  eq(summary.verified, 1, 'verified count');
  eq(summary.reference_only, 1, 'reference count');
  eq(summary.needs_verification, 1, 'needs verification count');
  eq(summary.conflicting, 1, 'conflicting count');
});

console.log(`\nsource truth package tests: ${pass} pass, ${fail} fail\n`);
if (fail) process.exit(1);
