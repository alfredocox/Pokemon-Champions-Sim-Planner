const assert = require('node:assert/strict');
const { test } = require('node:test');
const coach = require('../replay_coach.js');
const fs = require('node:fs');
const vm = require('node:vm');

test('tactical export keeps species matches unverified and uses the supplied replay context', () => {
  const ui = fs.readFileSync(require.resolve('../ui.js'), 'utf8');
  const sandbox = { TEAMS: {
    first: { name: 'First', members: [{ name: 'Pelipper' }], ruleset: ['Species Clause'], legality_status: 'legal' },
    second: { name: 'Second', members: [{ name: 'Kingambit' }] }
  }, csGetBuildId: () => 'test-build', CS_LAST_REPLAY_SCENARIO_CONTEXT: { review: { summary: { yourPreview: ['Pelipper'] } } } };
  vm.createContext(sandbox);
  vm.runInContext(ui.slice(ui.indexOf('function csReplaySpeciesId('), ui.indexOf('function csReplayScenarioTopStatus(')), sandbox);
  const payload = sandbox.csBuildReplayScenarioTacticalQaPayload({ boardContext: { yourFour: ['Kingambit'], opponentFour: ['Pelipper'] } }, 0, { parsed: { format: 'doubles' } });
  assert.equal(payload.team_mapping.player.candidate_team_id, 'second');
  assert.equal(payload.player_team_id, null);
  assert.equal(payload.opponent_team_id, null);
  assert.equal(payload.team_mapping.status, 'needs_verification');
  assert.equal(payload.team_mapping.opponent.legality_status, 'unknown');
  assert.equal(payload.team_mapping.opponent.regulation_id, null);
  assert.equal(payload.engine_version, 'unknown');
  assert.equal(payload.ruleset_version, 'unknown');
  assert.equal(payload.exporter_build_id, 'test-build');
});

function analyze(events) {
  return coach.analyzeShowdownReplay([
    '|gametype|doubles', '|player|p1|Alice', '|player|p2|Bob',
    '|switch|p1a: Pelipper|Pelipper, L50|100/100',
    '|switch|p2a: Sneasler|Sneasler, L50|100/100',
    '|turn|1', ...events, '|win|Bob'
  ].join('\n'), { selectedSide: 'p1' });
}

test('faint replacements and drag are not voluntary switches; ordinary switches remain voluntary', () => {
  const { parsed, review } = analyze([
    '|-damage|p1a: Pelipper|0 fnt', '|faint|p1a: Pelipper',
    '|switch|p1a: Kingambit|Kingambit, L50|100/100',
    '|turn|2', '|drag|p1a: Incineroar|Incineroar, L50|100/100',
    '|turn|3', '|switch|p1a: Kingambit|Kingambit, L50|100/100'
  ]);
  assert.equal(parsed.turns[0].switches[0].forced, true);
  assert.equal(parsed.turns[1].switches[0].forced, true);
  assert.equal(parsed.turns[2].switches[0].forced, false);
  assert(!review.coachingTags.some(r => r.id === 'switch_tempo_loss' && r.turn === 1));
});

test('weather upkeep and ending weather do not imply new opponent field control', () => {
  for (const event of ['|-weather|Snow|[upkeep]', '|-weather|none', '|-fieldend|move: Trick Room']) {
    const { review } = analyze([event]);
    assert(!review.coachingTags.some(r => r.id === 'field_control_failure'), event);
  }
  const own = analyze(['|-weather|RainDance|[from] ability: Drizzle|[of] p1a: Pelipper']);
  assert(!own.review.coachingTags.some(r => r.id === 'field_control_failure'));
  const opposing = analyze(['|-weather|Snow|[from] ability: Snow Warning|[of] p2a: Sneasler']);
  assert(opposing.review.coachingTags.some(r => r.id === 'field_control_failure'));
});

test('miss cards name the move rather than the target slot', () => {
  const { review } = analyze(['|move|p1a: Pelipper|Hurricane|p2a: Sneasler|[miss]', '|-miss|p1a: Pelipper|p2a: Sneasler']);
  assert.equal(review.actionDenialCards[0].move, 'Hurricane');
});

test('effectiveness belongs to one damage event, not every hit on that species in the turn', () => {
  const { parsed, review } = analyze([
    '|move|p2a: Sneasler|Dire Claw|p1a: Pelipper', '|-damage|p1a: Pelipper|53/100',
    '|move|p2a: Sneasler|Heat Wave|p1a: Pelipper', '|-resisted|p1a: Pelipper', '|-damage|p1a: Pelipper|22/100',
    '|-damage|p1a: Pelipper|16/100|[from] psn'
  ]);
  assert.deepEqual(parsed.turns[0].damage.map(r => r.effects), [[], ['resisted'], []]);
  assert(!review.damageContextCards.some(r => r.hp === 53 && r.effects.includes('resisted')));
  assert(!review.damageContextCards.some(r => r.hp === 16 && r.effects.includes('resisted')));
});

test('Protect and ability activations are not classified as items', () => {
  const { parsed } = analyze(['|-activate|p1a: Pelipper|move: Protect', '|-activate|p2a: Sneasler|ability: Supreme Overlord|3', '|-activate|p1a: Pelipper|item: Quick Claw']);
  assert.equal(parsed.turns[0].items.length, 1);
  assert.equal(parsed.turns[0].abilities.length, 1);
  assert(parsed.turns[0].events.some(r => r.type === 'activate' && r.effect === 'move: Protect'));
});

test('mirror species and multi-target damage keep effectiveness attached to the target slot', () => {
  const { parsed } = analyze([
    '|switch|p2a: Pelipper|Pelipper, L50|100/100',
    '|move|p1a: Pelipper|Surf|p2a: Pelipper',
    '|-resisted|p2a: Pelipper', '|-damage|p1a: Pelipper|45/100', '|-damage|p2a: Pelipper|65/100'
  ]);
  assert.deepEqual(parsed.turns[0].damage.map(r => r.effects), [[], ['resisted']]);
});

test('turn boundaries and unknown field owners never borrow an unrelated move actor', () => {
  const { parsed, review } = analyze([
    '|move|p2a: Sneasler|Growl|p1a: Pelipper', '|-weather|Snow',
    '|turn|2', '|-miss|p2a: Sneasler|p1a: Pelipper'
  ]);
  assert.equal(parsed.turns[0].field[0].side, '');
  assert.equal(parsed.turns[1].rng[0].move, '');
  assert(!review.coachingTags.some(r => r.id === 'field_control_failure'));
});
