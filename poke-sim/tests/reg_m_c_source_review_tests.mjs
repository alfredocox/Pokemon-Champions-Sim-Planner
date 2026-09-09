import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const review = JSON.parse(fs.readFileSync(new URL('source/reg-m-c-source-review.json', root), 'utf8'));
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(new URL('rulesets.js', root), 'utf8'), ctx, { filename: 'rulesets.js' });

let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }

test('official M-C schedule uses exact UTC boundaries', () => {
  const row = ctx.getChampionsRuleset('champions_reg_m_c_2026');
  assert.equal(row.startsAtUtc, '2026-09-09T02:00:00Z');
  assert.equal(row.endsAtUtc, '2026-12-02T01:59:00Z');
  assert.equal(review.official_notice.effective_from_utc, row.startsAtUtc);
  assert.equal(review.official_notice.effective_to_utc, row.endsAtUtc);
});

test('M-B extension covers September 8 without granting competitive approval', () => {
  const gap = ctx.getChampionsRegulationCoverage('2026-09-08T12:00:00Z');
  assert.equal(gap.status, 'source_review');
  assert.equal(gap.covered, false);
  assert.equal(gap.regulation_id, 'champions_reg_m_b_2026');
});

test('M-C is recognized but blocked at both exact active boundaries', () => {
  for (const when of ['2026-09-09T02:00:00Z', '2026-12-02T01:59:00Z']) {
    const active = ctx.getChampionsRegulationCoverage(when);
    assert.equal(active.status, 'source_review');
    assert.equal(active.covered, false);
    assert.equal(active.regulation_id, 'champions_reg_m_c_2026');
  }
  assert.equal(ctx.getChampionsRegulationCoverage('2026-12-02T01:59:00.001Z').status, 'successor_required');
});

test('named additions remain candidates and species-versus-form reconciliation is not inferred', () => {
  assert.deepEqual(review.named_additions.mega_forms, [
    'Salamence-Mega', 'Golisopod-Mega', 'Baxcalibur-Mega',
    'Absol-Mega-Z', 'Garchomp-Mega-Z', 'Lucario-Mega-Z'
  ]);
  assert.deepEqual(review.named_additions.ordinary_species_examples, ['Rillaboom']);
  assert.equal(review.named_additions.complete_new_species_list, null);
  assert.equal(review.competitive_use, false);
  assert.equal(review.learning_eligible, false);
});

test('Showdown observation cannot be mistaken for M-C format approval', () => {
  assert.equal(review.showdown_observation.format_status, 'm_c_reference_formats_present_not_approved');
  assert.equal(review.showdown_observation.mc_mod, 'champions');
  assert.equal(review.showdown_observation.historical_mb_mod, 'championsregmb');
  assert.equal(review.showdown_observation.runtime_reference_upgraded, false);
  assert.equal(ctx.getChampionsRuleset('champions_reg_m_c_2026').engineFormatId, null);
});

test('captured official roster replaces the stale missing-image explanation without approval', () => {
  const roster = JSON.parse(fs.readFileSync(new URL('source/reg-m-c-official-roster.json', root), 'utf8'));
  assert.equal(roster.rows.length, review.official_roster.captured_rows);
  assert.equal(new Set(roster.rows.map(row => row.official_id)).size, 262);
  assert.equal(roster.competitive_use, false);
  assert.match(ctx.getChampionsRuleset('champions_reg_m_b_2026').blocker, /235 reconciled/);
  assert.match(ctx.getChampionsRuleset('champions_reg_m_c_2026').blocker, /262 official/);
  assert.match(ctx.getChampionsRegulationCoverage('2026-09-10T00:00:00Z').message, /Reg M-C/);
  assert.equal(ctx.getChampionsRuleset('champions_reg_m_c_2026').runtimePromotable, false);
});

test('missing exact sprites remain explicit and use a labeled fallback policy', () => {
  assert.equal(review.sprite_observation.exact_assets['Salamence-Mega'], 'available_ani_and_gen5');
  for (const name of review.named_additions.mega_forms.slice(1)) {
    assert.equal(review.sprite_observation.exact_assets[name], 'missing_ani_and_gen5');
  }
  assert.match(review.sprite_observation.runtime_policy, /base-form fallback/);
});

test('current regulation warning has explicit contrasting theme surfaces', () => {
  const css = fs.readFileSync(new URL('style.css', root), 'utf8');
  assert.match(css, /\.regulation-coverage-warning \{ color: #fef3c7; background: #422006;/);
  assert.match(css, /\[data-theme="light"\] \.regulation-coverage-warning \{ color: #78350f; background: #fffbeb;/);
});

console.log(`Reg M-C source review: ${count}/${count} passed`);
