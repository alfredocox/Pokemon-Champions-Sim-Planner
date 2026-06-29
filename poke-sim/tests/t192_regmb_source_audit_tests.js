'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const registry = fs.readFileSync(path.join(ROOT, 'docs', 'DATA_SOURCE_REGISTRY.md'), 'utf8');
const legalityDoc = fs.readFileSync(path.join(ROOT, 'docs', 'CHAMPIONS_LEGALITY.md'), 'utf8');
const syncDoc = fs.readFileSync(path.join(ROOT, 'docs', 'SHOWDOWN_SYNC_ARCHITECTURE.md'), 'utf8');
const conversionDoc = fs.readFileSync(path.join(ROOT, 'docs', 'REG_M_B_SOURCE_CONVERSION_TABLE.md'), 'utf8');
const ui = fs.readFileSync(path.join(ROOT, 'ui.js'), 'utf8');
const appShell = fs.readFileSync(path.join(ROOT, 'app_shell.js'), 'utf8');
const engine = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
const data = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
const moveLegalitySource = fs.readFileSync(path.join(ROOT, 'move_legality.js'), 'utf8');
const rulesets = require(path.join(ROOT, 'rulesets.js'));
global.getChampionsRuleset = rulesets.getChampionsRuleset;
global.getRulesetEvidencePolicy = rulesets.getRulesetEvidencePolicy;
const legality = require(path.join(ROOT, 'legality.js'));
const conversion = require(path.join(ROOT, 'regmb_source_conversion.js')).CHAMPIONS_REGMB_SOURCE_CONVERSION;

let pass = 0;
let fail = 0;

function T(name, fn) {
  try {
    fn();
    console.log('  PASS', name);
    pass++;
  } catch (err) {
    console.log('  FAIL', name, '-', err.message);
    fail++;
  }
}

function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

function inc(text, needle, msg) {
  truthy(String(text).includes(needle), msg || ('missing ' + needle));
}

function notInc(text, needle, msg) {
  truthy(!String(text).includes(needle), msg || ('unexpected ' + needle));
}

const REGMB_NEW_MEGAS = [
  'Raichu-Mega-X',
  'Raichu-Mega-Y',
  'Sceptile-Mega',
  'Blaziken-Mega',
  'Swampert-Mega',
  'Mawile-Mega',
  'Metagross-Mega',
  'Staraptor-Mega',
  'Scolipede-Mega',
  'Scrafty-Mega',
  'Eelektross-Mega',
  'Pyroar-Mega',
  'Malamar-Mega',
  'Barbaracle-Mega',
  'Dragalge-Mega',
  'Falinks-Mega'
];

const REGMB_ADDITIONS = [
  'Vileplume',
  'Qwilfish',
  'Sceptile',
  'Blaziken',
  'Swampert',
  'Mawile',
  'Metagross',
  'Staraptor',
  'Musharna',
  'Scolipede',
  'Scrafty',
  'Eelektross',
  'Pyroar',
  'Malamar',
  'Barbaracle',
  'Dragalge',
  'Grimmsnarl',
  'Falinks',
  'Overqwil',
  'Houndstone',
  'Annihilape',
  'Gholdengo'
];

console.log('\n=== Reg M-B source audit tests ===\n');

T('1. Reg M-B source facts are documented with source URLs', () => {
  inc(registry, 'Regulation Set M-B from June 17 to September 2, 2026');
  inc(registry, '2026 World Championships');
  inc(registry, 'https://victoryroad.pro/wp-content/uploads/2026/06/Reg-M-B-Pokemon1.jpg');
  inc(registry, 'https://victoryroad.pro/wp-content/uploads/2026/06/Reg-M-B-Pokemon2.jpg');
  inc(registry, 'https://victoryroad.pro/wp-content/uploads/2026/06/NewMegasRMB.png');
});

T('2. source-reviewed Reg M-B new Mega list is complete', () => {
  truthy(Array.isArray(legality.CHAMPIONS_REGMB_REVIEW_NEW_MEGAS), 'missing audit list export');
  truthy(legality.CHAMPIONS_REGMB_REVIEW_NEW_MEGAS.length === 16, 'expected 16 Reg M-B new Megas');
  REGMB_NEW_MEGAS.forEach((name) => {
    truthy(legality.CHAMPIONS_REGMB_REVIEW_NEW_MEGAS.includes(name), 'missing ' + name);
  });
});

T('3. Reg M-B audit is not silently promoted to runtime legality', () => {
  inc(engine, "var CHAMPIONS_FORMAT_ID = 'champions-vgc-2026-regma'");
  inc(engine, 'champions_reg_m_b_doubles_bo3_source_review');
  inc(engine, 'Champions Reg M-A Historical Lane');
  inc(registry, 'not yet promoted as the implemented simulator legality lane');
  inc(legalityDoc, 'does not prove full Reg M-B legality');
  inc(syncDoc, 'source conversion, not just fetching');
});

T('4. Overview tells contributors the Reg M-B blocker clearly', () => {
  inc(ui, 'Reg M-B source audit recorded');
  inc(ui, 'Reg M-B conversion ledger added');
  inc(ui, '16 source-reviewed new Mega names');
  inc(ui, 'Runtime promotion remains blocked');
  inc(ui, 'source-backed data conversion');
});

T('5. unreviewed Reg M-B stones are not added by assumption', () => {
  [
    'Raichunite X',
    'Raichunite Y',
    'Sceptilite',
    'Blazikenite',
    'Swampertite',
    'Mawilite',
    'Metagrossite',
    'Staraptorite',
    'Scolipedite',
    'Scraftite',
    'Eelektrossite',
    'Pyroarite',
    'Malamarite',
    'Barbaraclite',
    'Dragalgite',
    'Falinksite'
  ].forEach((stone) => {
    truthy(!legality.CHAMPIONS_LEGAL_ITEMS.has(stone), 'unreviewed Reg M-B stone enabled: ' + stone);
  });
});

T('6. structured conversion ledger keeps Reg M-B rows blocked until fully sourced', () => {
  truthy(conversion.rulesetId === 'champions_reg_m_b_doubles_bo3_source_review', 'wrong ruleset id');
  truthy(conversion.runtimePromotionAllowed === false, 'Reg M-B should not be runtime-promotable yet');
  truthy(conversion.newMegaRows.length === 16, 'conversion ledger should carry 16 new Mega rows');
  REGMB_NEW_MEGAS.forEach((name) => {
    const row = conversion.newMegaRows.find((entry) => entry.megaForm === name);
    truthy(row, 'missing conversion row for ' + name);
    truthy(row.runtimePromotable === false, name + ' should not be runtime-promotable');
    truthy(row.reviewStatus === 'name_verified_fields_blocked', name + ' should be fields-blocked');
    truthy(row.blockers.includes('megaStone unconfirmed'), name + ' missing stone blocker');
    truthy(row.blockers.includes('positive and negative fixtures missing'), name + ' missing fixture blocker');
  });
});

T('7. conversion docs are linked and name required promotion fields', () => {
  inc(registry, 'REG_M_B_SOURCE_CONVERSION_TABLE.md');
  inc(legalityDoc, 'REG_M_B_SOURCE_CONVERSION_TABLE.md');
  inc(conversionDoc, 'Required Promotion Fields');
  [
    'megaStone',
    'megaBaseStats',
    'types',
    'ability',
    'spriteFallback',
    'positiveFixture',
    'negativeFixture'
  ].forEach((field) => inc(conversionDoc, field, 'conversion doc missing ' + field));
});

T('7b. Reg M-B addition rows are explicit but review-only', () => {
  truthy(Array.isArray(conversion.additionRows), 'missing Reg M-B addition rows');
  truthy(conversion.additionRows.length === 22, 'expected 22 Reg M-B addition rows');
  REGMB_ADDITIONS.forEach((name) => {
    const row = conversion.additionRows.find((entry) => entry.species === name);
    truthy(row, 'missing addition row for ' + name);
    truthy(row.runtimePromotable === false, name + ' should remain review-only');
    truthy(row.learningEligible === false, name + ' should block learning');
    truthy(row.poisoningGuard === 'review_only_do_not_train_or_rank', name + ' missing poisoning guard');
  });
  inc(conversionDoc, 'Reg M-B Addition Rows');
  inc(conversionDoc, 'Gholdengo');
});

T('8. ruleset lifecycle blocks source-review teams from trusted legality', () => {
  const policy = rulesets.getRulesetEvidencePolicy('champions_reg_m_b_2026');
  truthy(policy.ruleset_status === 'source_review', 'Reg M-B should be source_review');
  truthy(policy.runtime_promotable === false, 'Reg M-B should not be runtime-promotable');
  truthy(policy.poisoning_guard === 'review_only_do_not_train_or_rank', 'Reg M-B needs poisoning guard');
  const result = legality.validateTeamForRuleset({ members: [] }, 'champions_reg_m_b_2026');
  truthy(result.allowed === false, 'source-review ruleset should block legal sim');
  truthy(result.learning_eligible === false, 'source-review ruleset should block learning');
  truthy(result.violations.some((v) => v.code === 'RULESET_NOT_RUNTIME_PROMOTED'), 'missing source-review violation');
});

T('9. implemented historical lane remains legal-sim eligible when team passes', () => {
  const policy = rulesets.getRulesetEvidencePolicy('champions_reg_m_a_2026');
  truthy(policy.runtime_promotable === true, 'Reg M-A historical lane should remain replay/sim eligible');
  truthy(policy.poisoning_guard === 'trusted_stats_allowed', 'historical lane should allow labeled trusted stats');
  const result = legality.validateTeamForRuleset({ members: [] }, 'champions_reg_m_a_2026');
  truthy(result.allowed === true, 'empty valid team fixture should pass historical wrapper');
  truthy(result.poisoning_guard === 'trusted_stats_allowed', 'historical wrapper should allow trusted stats');
});

T('10. analysis payload carries ruleset poisoning guard metadata', () => {
  inc(ui, 'ruleset_status:    rulesetEvidence.ruleset_status');
  inc(ui, 'learning_eligibility: rulesetEvidence.learning_eligibility');
  inc(ui, 'data_policy:       rulesetEvidence.data_policy');
  inc(ui, 'coaching_policy:   rulesetEvidence.coaching_policy');
  inc(ui, 'poisoning_guard:   rulesetEvidence.poisoning_guard');
  inc(ui, 'unknown_ruleset_do_not_train_or_rank');
});

T('10b. visual allowlist rows are review-only with confidence labels', () => {
  truthy(Array.isArray(conversion.visualAllowlistRows), 'missing visual allowlist rows');
  truthy(conversion.visualAllowlistRows.length === 235, 'expected 235 visual rows from both sheets');
  truthy(conversion.visualAllowlistRows.some((row) => row.confidence === 'needs_human_review'), 'expected human-review rows');
  truthy(conversion.visualAllowlistRows.every((row) => row.runtimePromotable === false), 'visual rows must not be runtime-promotable');
  truthy(conversion.visualAllowlistRows.every((row) => row.poisoningGuard === 'review_only_do_not_train_or_rank'), 'visual rows need poisoning guard');
});

T('10c. Reg M-B promotion gate blocks runtime, learning, and trusted coaching', () => {
  truthy(Array.isArray(conversion.promotionFieldChecklist), 'missing promotion field checklist');
  truthy(conversion.promotionFieldChecklist.length === conversion.requiredPromotionFields.length, 'promotion checklist should cover every required field');
  conversion.requiredPromotionFields.forEach((field) => {
    truthy(conversion.promotionFieldChecklist.some((row) => row.field === field), 'missing promotion field ' + field);
  });
  truthy(conversion.promotionFieldChecklist.filter((row) => row.blocksRuntime === true).length === 5, '5 Reg M-B fields should still block runtime');
  truthy(conversion.promotionFieldChecklist.some((row) => row.field === 'megaStone' && row.status === 'source_verified_review_only'), 'megaStone should be source-verified review-only');
  truthy(conversion.promotionFieldChecklist.some((row) => row.field === 'itemSourceUrl' && row.status === 'source_verified_review_only'), 'itemSourceUrl should be source-verified review-only');
  ['megaBaseStats', 'statsSourceUrl', 'types', 'typeSourceUrl', 'ability', 'abilitySourceUrl'].forEach((field) => {
    truthy(conversion.promotionFieldChecklist.some((row) => row.field === field && row.status === 'source_verified_review_only'), field + ' should be source-verified review-only');
  });
  truthy(conversion.promotionFieldChecklist.some((row) => row.field === 'learnsetPolicy' && row.status === 'source_verified_review_only'), 'learnsetPolicy should be source-verified review-only');
  truthy(conversion.promotionReadiness.status === 'blocked_not_runtime_promotable', 'promotion readiness should remain blocked');
  truthy(conversion.promotionReadiness.fieldsReadyForRuntime === 9, 'nine fields should be source-verified but review-only');
  truthy(conversion.promotionReadiness.fieldsBlockedForRuntime === 5, '5 fields should remain blocked');
  truthy(conversion.promotionReadiness.selectorPolicy === 'hidden_from_legal_sim', 'selector policy should stay hidden');
  truthy(conversion.promotionReadiness.learningPolicy === 'do_not_train_or_rank', 'learning policy should block training');
  truthy(conversion.promotionReadiness.coachingPolicy === 'do_not_recommend_as_trusted_reg_m_b', 'coaching policy should block trusted recommendations');
  truthy(Array.isArray(conversion.promotionStatusBuckets), 'missing promotion status buckets');
  truthy(conversion.promotionStatusBuckets.some((row) => row.id === 'visual_reviewed' && row.count === 235), 'visual reviewed bucket should show 235 rows');
  truthy(conversion.promotionStatusBuckets.some((row) => row.id === 'ready_for_runtime_review' && row.count === 9), 'ready-for-review bucket should show nine sourced fields');
  truthy(conversion.promotionStatusBuckets.some((row) => row.id === 'promoted' && row.count === 0), 'promoted bucket should stay zero');
});

T('10d. Reg M-B Mega stone rows are source-verified but not runtime-promoted', () => {
  truthy(Array.isArray(conversion.megaStoneRows), 'missing Reg M-B stone rows');
  truthy(conversion.megaStoneRows.length === REGMB_NEW_MEGAS.length, 'expected one stone row per new Mega');
  REGMB_NEW_MEGAS.forEach((megaForm) => {
    truthy(conversion.megaStoneRows.some((row) => row.megaForm === megaForm), 'missing stone row for ' + megaForm);
  });
  ['Raichunite X', 'Raichunite Y', 'Staraptite', 'Scolipite', 'Scraftinite', 'Barbaracite', 'Dragalgite', 'Falinksite'].forEach((itemName) => {
    truthy(conversion.megaStoneRows.some((row) => row.itemName === itemName), 'missing sourced item ' + itemName);
  });
  truthy(conversion.megaStoneRows.every((row) => row.sourceUrl.includes('pokemon-showdown/master/data/items.ts')), 'stone rows should cite Pokemon Showdown item data');
  truthy(conversion.megaStoneRows.every((row) => row.runtimePromotable === false), 'stone rows must remain review-only');
  truthy(conversion.megaStoneRows.every((row) => row.learningEligible === false), 'stone rows must not train learning');
});

T('10e. Reg M-B Mega implementation rows source stats, types, and abilities without promotion', () => {
  truthy(Array.isArray(conversion.megaImplementationRows), 'missing Reg M-B implementation rows');
  truthy(conversion.megaImplementationRows.length === REGMB_NEW_MEGAS.length, 'expected one implementation row per new Mega');
  REGMB_NEW_MEGAS.forEach((megaForm) => {
    truthy(conversion.megaImplementationRows.some((row) => row.megaForm === megaForm), 'missing implementation row for ' + megaForm);
  });
  const raichuX = conversion.megaImplementationRows.find((row) => row.megaForm === 'Raichu-Mega-X');
  truthy(raichuX && raichuX.baseStats.atk === 135 && raichuX.ability === 'Electric Surge', 'Raichu-Mega-X stats/ability mismatch');
  const staraptor = conversion.megaImplementationRows.find((row) => row.megaForm === 'Staraptor-Mega');
  truthy(staraptor && staraptor.types.join('/') === 'Fighting/Flying' && staraptor.ability === 'Contrary', 'Staraptor-Mega sourced data mismatch');
  const eelektross = conversion.megaImplementationRows.find((row) => row.megaForm === 'Eelektross-Mega');
  truthy(eelektross && eelektross.ability === 'Eelevate', 'Eelektross-Mega ability should preserve source spelling');
  truthy(conversion.megaImplementationRows.every((row) => row.sourceUrl.includes('pokemon-showdown/master/data/pokedex.ts')), 'implementation rows should cite Pokemon Showdown pokedex data');
  truthy(conversion.megaImplementationRows.every((row) => row.runtimePromotable === false), 'implementation rows must remain review-only');
  truthy(conversion.megaImplementationRows.every((row) => row.learningEligible === false), 'implementation rows must not train learning');
});

T('10f. Reg M-B learnset policy inherits base species but stays review-only', () => {
  truthy(Array.isArray(conversion.learnsetPolicyRows), 'missing Reg M-B learnset policy rows');
  truthy(conversion.learnsetPolicyRows.length === REGMB_NEW_MEGAS.length, 'expected one learnset policy row per new Mega');
  REGMB_NEW_MEGAS.forEach((megaForm) => {
    const row = conversion.learnsetPolicyRows.find((entry) => entry.megaForm === megaForm);
    truthy(row, 'missing learnset policy row for ' + megaForm);
    truthy(row.policy === 'mega_inherits_base_species_learnset', 'wrong learnset policy for ' + megaForm);
    truthy(row.localPolicySource.includes('move_legality.js'), 'learnset policy should cite local Mega fallback');
    truthy(row.runtimePromotable === false, 'learnset policy should stay review-only for ' + megaForm);
    truthy(row.learningEligible === false, 'learnset policy should not train learning for ' + megaForm);
  });
  const raichuY = conversion.learnsetPolicyRows.find((row) => row.megaForm === 'Raichu-Mega-Y');
  truthy(raichuY && raichuY.baseSpecies === 'Raichu' && raichuY.requiredItem === 'Raichunite Y', 'Raichu-Mega-Y learnset policy mismatch');
  inc(moveLegalitySource, 'if (/-Mega(?:-[XY])?$/i.test(canonical) && row.baseSpecies)');
});

T('11. Reg M-B review coverage sections remain blocked from runtime learning', () => {
  truthy(Array.isArray(conversion.coverageSections), 'missing Reg M-B coverage sections');
  truthy(conversion.coverageSections.length === 4, 'expected four coverage sections');
  const covered = [];
  conversion.coverageSections.forEach((section) => {
    truthy(section.rulesetId === 'champions_reg_m_b_doubles_bo3_source_review', 'coverage section has wrong ruleset');
    truthy(section.runtimePromotable === false, 'coverage section should not be runtime-promotable');
    truthy(section.learningEligible === false, 'coverage section should block learning');
    truthy(section.poisoningGuard === 'review_only_do_not_train_or_rank', 'coverage section missing poisoning guard');
    truthy(section.selectorPolicy === 'hidden_from_legal_sim', 'coverage section should stay hidden from legal sim');
    section.coveredMegaForms.forEach((name) => covered.push(name));
  });
  REGMB_NEW_MEGAS.forEach((name) => truthy(covered.includes(name), 'coverage sections missing ' + name));
});

T('12. Teams UI exposes ruleset sections, tags, and badges', () => {
  inc(ui, 'function csTeamRulesetEvidence');
  inc(ui, 'function csTeamRulesetTags');
  inc(ui, 'function csRenderTeamRulesetBadges');
  inc(ui, 'function csRenderRegmbCoverageCards');
  inc(ui, 'function csRenderRegmbPromotionGateCard');
  inc(ui, 'csGetRegmbPromotionReadiness');
  inc(ui, 'Reg M-B runtime promotion gate');
  inc(ui, 'HIDDEN FROM LEGAL SIM');
  inc(ui, 'fieldsBlockedForRuntime');
  inc(ui, 'function csRenderRegmbVisualReviewGrid');
  inc(ui, 'function csRegmbSpriteUrl');
  inc(appShell, 'function csHandleSpriteError');
  inc(appShell, 'function csSpriteFallbackAttrs');
  inc(data, 'raichu-alola.gif');
  inc(data, 'zoroark-hisui.gif');
  inc(data, 'SHOWDOWN_SPRITE_BASE');
  inc(appShell, "'Charizard-Mega-X': 'charizard-megax'");
  inc(appShell, "'Charizard-Mega-Y': 'charizard-megay'");
  inc(appShell, "'Ninetales-Alola': 'ninetales-alola'");
  inc(appShell, "'Arcanine-Hisui': 'arcanine-hisui'");
  inc(data, 'return showdownAnimatedSpriteUrl(name)');
  inc(appShell, "'Ninetales-Alola': 'ninetales-alola'");
  inc(appShell, "'Charizard-Mega-X': 'charizard-megax'");
  inc(appShell, "'Charizard-Mega-Y': 'charizard-megay'");
  inc(appShell, "'Arcanine-Hisui': 'arcanine-hisui'");
  inc(ui, "'Zoroark-Hisui': 'zoroark-hisui'");
  inc(ui, 'lycanroc-midnight');
  inc(ui, 'lycanroc-dusk');
  inc(ui, 'if (typeof getSpriteUrl ===');
  inc(data, "'Mr. Rime':");
  inc(data, "'Kommo-o':");
  inc(data, "'Tauros-Paldea-Combat':");
  inc(data, 'tauros-paldeacombat.gif');
  inc(data, 'tauros-paldeablaze.gif');
  inc(data, 'tauros-paldeaaqua.gif');
  inc(data, "'Tauros-Paldea-Blaze':");
  inc(data, "'Tauros-Paldea-Aqua':");
  inc(ui, "filter === 'regmb_review'");
  inc(ui, "label:'Reg M-B Review'");
  inc(ui, "if (TEAMS_FILTER === 'regmb_review')");
  inc(ui, 'regmb-visual-grid');
  inc(ui, 'DO NOT TRAIN/RANK');
  inc(ui, 'team.metadata.poisoning_guard');
  inc(ui, 'not-runtime-promoted');
});

if (fail) {
  console.error('\nReg M-B source audit: ' + pass + ' pass, ' + fail + ' fail');
  process.exit(1);
}
console.log('\nReg M-B source audit: ' + pass + ' pass, 0 fail');
