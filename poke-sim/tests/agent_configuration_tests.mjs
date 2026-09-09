import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts) => readFileSync(join(repoRoot, ...parts), 'utf8');

const skill = read('.agents', 'skills', 'pokemon-champion-engineering', 'SKILL.md');
assert.match(skill, /^---\r?\nname: pokemon-champion-engineering\r?\n/);
assert.match(skill, /description: .+proof gates/);
assert.match(skill, /mechanics_reviewer/);
assert.match(skill, /trust_boundary_reviewer/);
assert.match(skill, /release_reviewer/);

const interfaceYaml = read('.agents', 'skills', 'pokemon-champion-engineering', 'agents', 'openai.yaml');
assert.match(interfaceYaml, /display_name: "Pokemon Champion Engineering"/);
assert.match(interfaceYaml, /\$pokemon-champion-engineering/);
assert.match(interfaceYaml, /allow_implicit_invocation: true/);

const battleSkill = read('.agents', 'skills', 'pokemon-battle-audit', 'SKILL.md');
assert.match(battleSkill, /^---\r?\nname: pokemon-battle-audit\r?\n/);
assert.match(battleSkill, /battle_auditor/);
assert.match(battleSkill, /npm --prefix poke-sim run test:battle-audit/);
assert.match(battleSkill, /universal/i);

for (const [file, name] of [
  ['mechanics-reviewer.toml', 'mechanics_reviewer'],
  ['trust-boundary-reviewer.toml', 'trust_boundary_reviewer'],
  ['release-reviewer.toml', 'release_reviewer'],
  ['battle-auditor.toml', 'battle_auditor'],
]) {
  const agent = read('.codex', 'agents', file);
  assert.match(agent, new RegExp(`name = "${name}"`));
  assert.match(agent, /description = ".+"/);
  assert.match(agent, /sandbox_mode = "read-only"/);
  assert.match(agent, /developer_instructions = """[\s\S]+"""/);
}

const projectInstructions = read('AGENTS.md');
assert.match(projectInstructions, /.agents\/skills\/pokemon-champion-engineering\/SKILL.md/);
assert.match(projectInstructions, /.codex\/agents/);
assert.match(projectInstructions, /.agents\/skills\/pokemon-battle-audit\/SKILL.md/);
assert.match(projectInstructions, /docs\/IMPROVEMENT_LOG\.md/);
assert.match(projectInstructions, /Missing access or a skipped test is not a pass/);
assert.match(read('CONTRIBUTING.md'), /docs\/IMPROVEMENT_LOG\.md/);
assert.match(read('.github', 'pull_request_template.md'), /docs\/IMPROVEMENT_LOG\.md/);
const improvementLog = read('docs', 'IMPROVEMENT_LOG.md');
const improvementIds = [...improvementLog.matchAll(/<a id="(imp-\d{4})"><\/a>/g)].map(match => match[1]);
assert.ok(improvementIds.length > 0);
assert.equal(new Set(improvementIds).size, improvementIds.length, 'improvement IDs must be unique');
assert.match(improvementLog, /SQL fixtures have not been executed/);
assert.match(improvementLog, /no production security change/);

console.log('agent configuration: passed');
