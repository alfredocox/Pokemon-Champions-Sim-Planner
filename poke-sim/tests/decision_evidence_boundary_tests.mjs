import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const ui = fs.readFileSync(new URL('../ui.js', import.meta.url), 'utf8');
const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync(new URL('../data.js', import.meta.url), 'utf8'), context);
for (const [start, end] of [['_csResolveSnapshotKey', 'csRenderDecisionAuditChip'], ['csBuildReplayCoachingSummary', 'csRenderReplayCoachingSummary']]) {
  vm.runInContext(ui.slice(ui.indexOf(`function ${start}(`), ui.indexOf(`function ${end}(`)), context);
}
const options = {
  teamLookup: [{ name: 'Hero', moves: ['Protect', 'Recover'] }],
  oppLookup: [{ name: 'Dummy', moves: ['Tackle'] }]
};
function fixture(pp = 0) {
  return [{ turn: 7, pre: {
    active: { player: ['Hero'], opponent: ['Dummy'] }, hp_pct: { Hero: 0.22, Dummy: 1 }, field: {},
    legal_options: { Hero: ['Protect -> Dummy', 'Recover -> Dummy'] },
    roster: { player: [{ name: 'Hero', move_pp: { Recover: { current: pp, max: 8 } } }] }
  }, actions: { player: [{ actor: 'Hero', move: 'Protect', target: 'Dummy' }] } }];
}
for (const [name, alter] of [
  ['zero PP', () => {}],
  ['positive PP without lock/target evidence', rows => { rows[0].pre.roster.player[0].move_pp.Recover.current = 8; }],
  ['missing PP', rows => { delete rows[0].pre.roster.player[0].move_pp; }],
  ['missing move inventory with current-team fallback', rows => { delete rows[0].pre.legal_options; }],
  ['Choice item without historical lock', rows => { rows[0].pre.roster.player[0].item = 'Choice Scarf'; }],
  ['Assault Vest', rows => { rows[0].pre.roster.player[0].item = 'Assault Vest'; }],
  ['Struggle', rows => { rows[0].actions.player[0].move = 'Struggle'; }],
  ['ambiguous actor identity', rows => { rows[0].pre.roster.player.push({ name: 'Hero' }); }],
  ['missing targets', rows => { rows[0].pre.legal_options.Hero = ['Protect', 'Recover']; }]
]) test(`no authoritative alternative from ${name}`, () => {
  const rows = fixture();
  alter(rows);
  const audit = context.csBuildDecisionAudit(rows, options);
  assert.equal(audit.total_flags, 0);
  assert.equal(audit.flagged_turns.length, 0);
  const summary = context.csBuildReplayCoachingSummary({ result: 'loss', turnLog: rows, turning_point: { turn: 1 } }, options);
  assert.equal(summary.issue_category, 'not enough evidence');
  assert(!/clearer line|execution rather|Review T7/.test(JSON.stringify(summary)));
});
