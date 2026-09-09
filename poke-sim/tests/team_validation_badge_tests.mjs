import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source = fs.readFileSync(new URL('../ui.js', import.meta.url), 'utf8');
const ctx = vm.createContext({
  _escapeHtml: s => String(s).replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
  csTeamRulesetEvidence: team => ({ runtime_promotable: team.promoted === true })
});
vm.runInContext(source.slice(source.indexOf('function csRenderTeamValidationBadge('), source.indexOf('function csGetRegmbCoverageSections(')), ctx);
const render = ctx.csRenderTeamValidationBadge;
test('historical, unknown and review-only contexts cannot inherit a LEGAL label', () => {
  for (const status of ['historical', 'unknown', 'source_review']) {
    const html = render({ format: 'champions', legality_status: 'legal', ruleset_status: status }, { valid: true });
    assert.match(html, /LEGALITY UNVERIFIED/);
    assert.doesNotMatch(html, /badge-legal/);
  }
});
test('passing local checks is not tournament approval, even for a promoted ruleset', () => {
  assert.match(render({ promoted: true, format: 'champions' }, { valid: true }), /TEAM CHECK PASSED/);
  assert.match(render({ promoted: true, format: 'champions' }, { valid: true, inferred: true }), /INFERRED SET/);
  assert.match(render({ promoted: true }, {}), /LEGALITY UNVERIFIED/);
});
test('validation failures and SV compatibility remain distinct and escaped', () => {
  assert.match(render({}, { valid: false, errors: ['<bad>'] }), /TEAM CHECK FAILED/);
  assert.doesNotMatch(render({}, { valid: false, errors: ['<bad>'] }), /<bad>/);
  assert.match(render({ format: 'sv' }, { valid: true }), /SV COMPAT ONLY/);
});
test('team cards use the scoped badge instead of the old metadata-only shortcut', () => {
  const grid = source.slice(source.indexOf('function renderTeamsGrid('), source.indexOf('function renderTeamsGrid(') + 6500);
  assert.match(grid, /csRenderTeamValidationBadge\(team, legalityVerdict\)/);
  assert.doesNotMatch(grid, /st === 'legal' && fmt === 'champions'/);
});
