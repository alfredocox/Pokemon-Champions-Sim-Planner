import assert from 'node:assert/strict';
import { classifyTest, discoverTests } from '../tools/run-project-gate.mjs';

assert.deepEqual(classifyTest('priority_tests.js'), { lane: 'fast' });
assert.deepEqual(classifyTest('news_sync_resilience_tests.mjs'), { lane: 'fast' });
assert.deepEqual(classifyTest('db_m9_hardening_tests.js'), { lane: 'db' });
assert.equal(classifyTest('_db_helpers.js').lane, 'skip');
assert.equal(classifyTest('audit.js').lane, 'skip');
assert.equal(classifyTest('fixture.json').lane, 'ignore');

const discovered = discoverTests();
assert.ok(discovered.some((test) => test.filename === 'db_m9_hardening_tests.js' && test.lane === 'db'));
assert.ok(discovered.some((test) => test.filename === 'project_gate_runner_tests.mjs' && test.lane === 'fast'));
assert.equal(discovered.filter((test) => test.lane === 'db').length > 0, true);

console.log('project gate runner: 9/9 passed');
