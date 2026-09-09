import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { compareVisibleReplay, ingestDirectory } from '../tools/compare-visible-replay.mjs';

function fixture() {
  const mon = side => ({ displayName: 'Mirror', stableKey: `${side}:slot:0:Mirror`, status: 'active',
    hp: 100, hpLabel: '100%', item: side === 'player' ? 'Sitrus Berry' : 'Leftovers', ability: 'Pressure', moves: ['Protect'] });
  const snapshot = { roster: { player: [mon('player')], opponent: [mon('opponent')] }, field: {}, speed_control: {} };
  const log = { seed: [1, 2, 3, 4], build_id: 'build-1', exporter_build_id: 'build-1', result: 'win', opponent_team: { name: 'Opponent' },
    provenance: { build_id: 'build-1', player_team_digest: 'a'.repeat(64), opp_team_digest: 'b'.repeat(64) },
    participants: { player: [{ stable_key: mon('player').stableKey }], opponent: [{ stable_key: mon('opponent').stableKey }] },
    turnLog: [{ turn: 1, pre: structuredClone(snapshot), post: structuredClone(snapshot), events: [{ text: 'Mirror used Protect!' }], damage_events: [] }] };
  const visibleMon = m => ({ name: m.displayName, status: 'ACTIVE', hp: 'HP: 100%', hp_bar: '100%',
    metadata: [`${m.item} \u00b7 ${m.ability}`, 'Moves: Protect'] });
  const board = label => ({ label, player: [visibleMon(mon('player'))], opponent: [visibleMon(mon('opponent'))], field: [] });
  const visual = { schema_version: 'champions-visible-replay-v1', renderer_build_id: 'build-1', banner: 'Preview build-1', title: 'WIN vs Opponent', meta: '1 turns',
    turns: [{ label: 'T1', lines: ['Mirror used Protect!'] }], boards: [board('TURN 0'), board('AFTER T1')] };
  return { log, visual };
}
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }
function rejects(mutator, code) {
  const pair = fixture(); mutator(pair);
  assert.ok(compareVisibleReplay(pair.log, pair.visual).issues.some(i => i.code === code), code);
}
test('matching mirror species stay side-specific despite CSS capitalization', () => {
  const { log, visual } = fixture();
  assert.equal(compareVisibleReplay(log, visual).status, 'matched_observable_fields');
});
test('empty evidence never passes', () => assert.equal(compareVisibleReplay({}, {}).status, 'mismatch'));
test('wrong build and title are rejected', () => {
  rejects(p => p.visual.renderer_build_id = 'build-10', 'build_mismatch');
  rejects(p => p.visual.title = 'WIN vs New selected team', 'replay_title_mismatch');
});
test('missing and duplicate turns are rejected', () => {
  rejects(p => p.visual.turns = [], 'turn_sequence_mismatch');
  rejects(p => p.visual.boards.push(p.visual.boards[1]), 'board_sequence_mismatch');
});
test('side swapping cannot hide item ownership mismatch', () => {
  rejects(p => [p.visual.boards[1].player, p.visual.boards[1].opponent] = [p.visual.boards[1].opponent, p.visual.boards[1].player], 'item_ability_mismatch');
});
test('HP text, HP bar, faint state and move discrepancies are detected', () => {
  rejects(p => p.visual.boards[1].player[0].hp = 'HP: 1%', 'hp_mismatch');
  rejects(p => p.visual.boards[1].player[0].hp_bar = '0%', 'hp_bar_mismatch');
  rejects(p => p.visual.boards[1].player[0].status = 'fainted', 'status_mismatch');
  rejects(p => p.visual.boards[1].player[0].metadata[1] = 'Moves: Tackle', 'moves_mismatch');
});
test('replacement outside selected participants fails', () => rejects(p => p.log.turnLog[0].post.roster.player[0].stableKey = 'player:slot:5:Other', 'unselected_participant'));
test('Tailwind duration must be visible from the exported tailwind_turns field', () => rejects(p => p.log.turnLog[0].post.speed_control.player = { tailwind_turns: 3 }, 'field_state_mismatch'));
test('omitted status move and reversed resolved order fail', () => {
  rejects(p => p.log.turnLog[0].events.unshift({ text: 'Partner used Tailwind!' }), 'resolved_move_order_or_omission');
  rejects(p => { p.log.turnLog[0].events.push({ text: 'Partner used Tailwind!' }); p.visual.turns[0].lines.unshift('Partner used Tailwind!'); }, 'resolved_move_order_or_omission');
});
test('wrong damage is detected independently of the UI formatter', () => rejects(p => {
  p.log.turnLog[0].damage_events.push({ attacker: 'Mirror', target: 'Partner', move: 'Tackle', applied_damage: 25 });
  p.visual.turns[0].lines.push('Mirror used Tackle! Partner lost 24 HP');
}, 'damage_display_mismatch'));
test('legitimate consumed-item state can agree without rewriting registered ownership', () => {
  const { log, visual } = fixture();
  log.turnLog[0].post.roster.player[0].item = null;
  visual.boards[1].player[0].metadata[0] = 'Pressure';
  assert.equal(compareVisibleReplay(log, visual).status, 'matched_observable_fields');
});
test('historical execution under a new exporter is not misidentified as a current run', () => {
  const { log, visual } = fixture();
  log.exporter_build_id = visual.renderer_build_id = 'build-2';
  assert.equal(compareVisibleReplay(log, visual).status, 'matched_observable_fields');
  rejects(p => p.log.build_id = 'wrong-execution', 'execution_build_mismatch');
});
test('missing action evidence and empty expected metadata fail closed', () => {
  rejects(p => p.log.turnLog[0].events = [], 'resolved_move_order_or_omission');
  rejects(p => delete p.log.turnLog[0].events, 'missing_action_evidence');
  rejects(p => { p.log.turnLog[0].post.roster.player[0].item = null; p.log.turnLog[0].post.roster.player[0].ability = null; }, 'item_ability_mismatch');
});
test('ingestion requires exact inventory, symmetric pairs and matching seeds', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'visible-replay-test-'));
  try {
    const { log, visual } = fixture();
    const write = (name, value) => fs.writeFileSync(path.join(directory, name), JSON.stringify(value));
    const inventory = { schema_version: 'champions-visual-inventory-v1', expected_game_count: 1, cases: [{ id: 'game', kind: 'simulation', seed: log.seed }] };
    write('game.log.json', log); write('game.visual.json', visual);
    assert.throws(() => ingestDirectory(directory));
    write('capture-inventory.json', inventory);
    assert.equal(ingestDirectory(directory).mismatch_pairs, 0);
    write('orphan.log.json', log);
    assert.throws(() => ingestDirectory(directory), /Unpaired/);
    fs.unlinkSync(path.join(directory, 'orphan.log.json'));
    inventory.cases[0].seed = [9, 9, 9, 9]; write('capture-inventory.json', inventory);
    assert.throws(() => ingestDirectory(directory), /Seed differs/);
    inventory.expected_game_count = 2; write('capture-inventory.json', inventory);
    assert.throws(() => ingestDirectory(directory), /Invalid expected-game/);
  } finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    fs.rmSync(directory, { recursive: true });
  }
});
console.log(`Visible replay comparison: ${passed}/${passed} passed`);
