// Read-only diagnostic: reuse the existing isolated UI test bootstrap.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { createRequire } = require('node:module');
const testPath = path.resolve(__dirname, '../tests/t9j16_tests.js');
const source = fs.readFileSync(testPath, 'utf8');
const marker = '// Expose helpers';
if (!source.includes(marker)) throw new Error('Test bootstrap changed; review diagnostic');
const host = { require: createRequire(testPath), __dirname: path.dirname(testPath), console, setTimeout, setInterval, clearTimeout, clearInterval };
vm.createContext(host);
vm.runInContext(source.slice(0, source.indexOf(marker)) + '\nthis.auditContext = ctx;', host);
const ctx = host.auditContext;
const findings = vm.runInContext(`(() => {
  const results = {};
  const team = TEAMS.player;
  const original = JSON.parse(JSON.stringify(team));
  const before = teamSignature(team);
  const report = buildStrategyReport('player', results, 'doubles');
  team.members[0].nature = team.members[0].nature === 'Timid' ? 'Adamant' : 'Timid';
  const after = teamSignature(team);
  const repeated = buildStrategyReport('player', results, 'doubles');
  TEAMS.player = original;
  TEAMS.audit_clone = JSON.parse(JSON.stringify(original));
  const clone = buildStrategyReport('audit_clone', results, 'doubles');
  const fake = T9J16_RULES.find(r => r.id === 'fake-out-illegal-timing');
  const spread = T9J16_RULES.find(r => r.id === 'redirection-vs-spread');
  const output = {
    nature_edit_preserves_signature: before === after,
    nature_edit_reuses_report: report === repeated,
    clone_report_team_key: clone.team_key,
    expected_clone_team_key: 'audit_clone',
    fake_out_without_action_evidence: fake.when({members:[{name:'Incineroar',moves:['Fake Out']}],lead_top:[]}),
    fake_out_claim: fake.explain({}),
    spread_claim: spread.explain({}),
    mega_cache_key: megaTriggerCacheKey('player','opponent',3,'doubles')
  };
  delete TEAMS.audit_clone;
  return output;
})()`, ctx);
const rules = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../rulesets.js'), 'utf8'), rules);
findings.regulation_september_8 = rules.getChampionsRegulationCoverage('2026-09-08T12:00:00Z');
const { Dex } = require('pokemon-showdown');
findings.pinned_reference_flags = Object.fromEntries(['spite','eeriespell','followme'].map(id => {
  const move = Dex.moves.get(id);
  return [id, { flags: move.flags, target: move.target }];
}));
console.log(JSON.stringify(findings, null, 2));
