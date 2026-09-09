'use strict';
const assert = require('node:assert/strict');
const rules = require('../rulesets.js');
global.getChampionsRuleset = rules.getChampionsRuleset;
const legality = require('../legality.js');
let failed = 0;
function test(name, fn) {
  try { fn(); console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}
for (const id of ['champions_reg_m_b_2026_typo', '', undefined, null, 'constructor', '__proto__']) {
  test('unknown/missing ruleset fails closed: ' + String(id), () => {
    const policy = rules.getRulesetEvidencePolicy(id);
    assert.equal(policy.ruleset_id, id == null ? '' : id);
    assert.equal(policy.ruleset_status, 'unknown');
    assert.equal(policy.runtime_promotable, false);
    assert.equal(rules.isRulesetRuntimeLegal(id), false);
    assert.equal(legality.validateTeamForRuleset({ members: [] }, id).learning_eligible, false);
    assert.equal(legality.validateTeamForRuleset({ members: [] }, id).allowed, false);
  });
}
test('reviewed aliases retain historical identity, not current M-B approval', () => {
  for (const id of ['champions_reg_m_a_2026', 'champions_reg_m_doubles_bo3', 'champions-vgc-2026-regma']) {
    assert.equal(rules.getRulesetEvidencePolicy(id).ruleset_id, 'champions_reg_m_a_2026');
    assert.equal(rules.isRulesetRuntimeLegal(id), true);
  }
  assert.equal(rules.isRulesetRuntimeLegal('champions_reg_m_b_2026'), false);
});
test('missing registry cannot silently validate against M-A', () => {
  delete global.getChampionsRuleset;
  assert.equal(legality.validateTeamForRuleset({ members: [] }, 'champions_reg_m_a_2026').allowed, false);
});
process.exitCode = failed ? 1 : 0;
