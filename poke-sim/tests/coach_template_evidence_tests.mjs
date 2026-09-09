import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../strategy-injectable.js', import.meta.url), 'utf8');
const ctx = vm.createContext({ console, TEAMS: { a: { name: 'Alpha', members: [{ name: 'First' }] }, b: { name: 'Beta', members: [] } } });
vm.runInContext(source.slice(source.indexOf('const COACH_BANNED_PHRASES')), ctx);

test('aggregate perfect wins cannot establish root cause or high confidence', () => {
  const text = ctx.coachPost({ wins: 100, losses: 0, draws: 0, turnLog: [] });
  assert(!/Root cause was|moved against the plan|\bhigh\b|Cap repeated/.test(text));
  assert(/not established|insufficient/i.test(text));
});
test('absent score and missing requested turn are unknown, not 50 percent or another turn', () => {
  const text = ctx.coachIn([{ turn: 7, pre: {}, post: {} }], 7);
  assert(!/50%|Preserve speed control/.test(text));
  assert(/unknown|not recorded/i.test(text));
  const missing = ctx.coachIn([{ turn: 7, post: { position_score: 0.99 } }], 1);
  assert(!/99/.test(missing));
});
test('zero heuristic score is preserved and is not called a win probability', () => {
  const text = ctx.coachIn([{ turn: 1, positionScore: 0 }], 1);
  assert(/0(?:\.00)?/.test(text));
  assert(!/50%/.test(text));
  assert(/heuristic/i.test(text));
});
test('duplicate turns and invalid scores remain unknown', () => {
  const duplicate = ctx.coachIn([{ turn: 1, positionScore: 0.2 }, { turn: 1, positionScore: 0.8 }], 1);
  assert(/Unknown/.test(duplicate));
  for (const value of [NaN, Infinity, -1, 2, '0.5']) {
    assert(/Unknown/.test(ctx.coachIn([{ turn: 1, post: { position_score: value } }], 1)));
  }
});
test('selected roster and aggregate history do not establish a best lead or bring', () => {
  const text = ctx.coachPre('a', 'b', { result: { wins: 100, losses: 0 } });
  assert(!/Best candidate|Lead First|Bring\s*: First|Deny the first|Convert through/.test(text));
  assert(/Alpha/.test(text) && /Beta/.test(text));
  assert(/not established|not verified/i.test(text));
});
test('invalid current score cannot borrow a valid legacy score', () => {
  for (const value of ['bad', NaN, Infinity, null, undefined]) {
    const text = ctx.coachIn([{ turn: 1, post: { position_score: value }, positionScore: 0.9 }], 1);
    assert(/Unknown/.test(text));
    assert(!/0.90/.test(text));
  }
  assert(/Heuristic index 0.90/.test(ctx.coachIn([{ turn: 1, post: {}, positionScore: 0.9 }], 1)));
});
test('malformed names, speed and deltas do not render invented facts', () => {
  assert(!/undefined/.test(ctx.coachPre()));
  const text = ctx.coachIn([{ turn: 1, post: { speed_order: [{}] }, delta: { position_score: 50 } }], 1);
  assert(!/\[object Object\]|50/.test(text));
  assert(/not recorded/.test(text));
});
