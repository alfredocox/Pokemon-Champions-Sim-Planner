// Issues #188/#189 - Battle Sensei UI shell depends on a local Showdown parser.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const replayCoach = require(path.join(ROOT, 'replay_coach.js'));
const sample = fs.readFileSync(path.join(ROOT, 'tests/fixtures/showdown_replay_sample.txt'), 'utf8');

let pass = 0;
let fail = 0;
const tests = [];
function T(name, fn) {
  tests.push([name, fn]);
}
async function runTests() {
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log('  PASS', name);
      pass++;
    } catch (e) {
      console.log('  FAIL', name, '-', e.message);
      fail++;
    }
  }
}
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'expected equality') + ': got ' + actual + ', expected ' + expected);
}
function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}
function includes(list, value, msg) {
  if (!Array.isArray(list) || !list.includes(value)) throw new Error((msg || 'missing value') + ': ' + value);
}

console.log('\n=== Battle Sensei parser tests ===\n');

T('1. parses players, format, winner, result, and turn count', () => {
  const parsed = replayCoach.parseShowdownLog(sample, { selectedSide: 'p1' });
  eq(parsed.players.p1, 'Alice', 'p1 name');
  eq(parsed.players.p2, 'Bob', 'p2 name');
  eq(parsed.format, 'doubles', 'format keeps first format signal');
  eq(parsed.winner, 'Bob', 'winner');
  eq(parsed.result, 'loss', 'selected side result');
  eq(parsed.totalTurns, 4, 'turn count');
  truthy(parsed.ok, 'parser should mark sample ok');
});

T('2. extracts team preview, selected Pokemon, and opening leads', () => {
  const parsed = replayCoach.parseShowdownLog(sample, { selectedSide: 'p1' });
  eq(parsed.teamPreview.p1.length, 6, 'p1 preview count');
  eq(parsed.teamPreview.p2.length, 6, 'p2 preview count');
  eq(parsed.leads.p1.join(','), 'Incineroar,Whimsicott', 'p1 leads');
  eq(parsed.leads.p2.join(','), 'Indeedee-F,Hatterene', 'p2 leads');
  includes(parsed.selectedPokemon.p1, 'Garchomp', 'selected p1 Garchomp');
  includes(parsed.selectedPokemon.p2, 'Hatterene', 'selected p2 Hatterene');
});

T('3. extracts moves, switches, faints, damage, field effects, and RNG markers', () => {
  const parsed = replayCoach.parseShowdownLog(sample, { selectedSide: 'p1' });
  const turn1 = parsed.turns.find((t) => t.number === 1);
  const turn3 = parsed.turns.find((t) => t.number === 3);
  truthy(turn1.moves.some((m) => m.move === 'Tailwind'), 'Tailwind move');
  truthy(turn1.field.some((f) => f.value === 'p1: Alice' || f.value === 'move: Trick Room'), 'field effect');
  truthy(turn3.faints.some((f) => f.pokemon === 'Arcanine'), 'Arcanine faint');
  truthy(turn3.damage.some((d) => d.pokemon === 'Arcanine' && d.hp === 0), 'damage hp');
  truthy(turn3.rng.some((r) => r.type === 'crit'), 'crit marker');
});

T('4. builds a coaching review with tags and critical turn', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const tags = analysis.review.coachingTags.map((t) => t.tag);
  const ids = analysis.review.coachingTags.map((t) => t.id);
  eq(analysis.review.summary.yourLead.join(','), 'Incineroar,Whimsicott', 'summary lead');
  eq(analysis.review.summary.result, 'loss', 'summary result');
  eq(analysis.review.summary.selectedFourConfidence.level, 'high', 'bring confidence');
  eq(analysis.review.summary.selectedFourConfidence.fullRosterKnown, true, 'full roster known');
  eq(analysis.review.summary.selectedFourConfidence.selectedFourKnown, true, 'selected four known');
  eq(analysis.review.summary.selectedFourConfidence.bringChoiceReviewable, true, 'bring choice reviewable');
  truthy(analysis.review.summary.criticalTurn >= 1, 'critical turn');
  includes(tags, 'Targeting Error', 'targeting coaching tag');
  includes(tags, 'Speed Control Without Pressure', 'speed control tag');
  includes(tags, 'Win Condition Exposed', 'win condition tag');
  includes(tags, 'RNG Materiality Check', 'rng tag');
  ['bad_lead', 'speed_control_without_pressure', 'targeting_error', 'field_control_failure', 'protect_misuse', 'switch_tempo_loss', 'win_condition_exposed', 'rng_material', 'endgame_misplay'].forEach((id) => {
    includes(ids, id, 'coaching rule id');
  });
  truthy(ids.length >= 5, 'detects at least five rule ids');
  analysis.review.coachingTags.forEach((tag) => {
    truthy(tag.whatHappened, 'tag what happened');
    truthy(tag.whyMattered, 'tag why mattered');
    truthy(tag.doInstead, 'tag do instead');
    truthy(tag.confidence, 'tag confidence');
  });
});

T('5. builds readable turn timeline and hidden raw-log preview data', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const timeline = analysis.review.turnTimeline;
  eq(timeline.length, 4, 'timeline length');
  truthy(timeline[0].stateShift.includes('Speed control') || timeline[0].tags.includes('Speed Control Without Pressure'), 'turn 1 speed read');
  truthy(timeline.some((t) => t.severity === 'high'), 'timeline has high severity turn');
  truthy(timeline.every((t) => Array.isArray(t.events)), 'timeline events arrays');
  truthy(analysis.review.rawLogPreview.lineCount >= 50, 'raw log line count');
  truthy(analysis.review.rawLogPreview.lines.length > 0, 'raw preview lines');
});

T('6. fails soft on empty or incomplete logs', () => {
  const empty = replayCoach.parseShowdownLog('', { selectedSide: 'p1' });
  eq(empty.ok, false, 'empty ok flag');
  truthy(empty.warnings.length > 0, 'empty warnings');
  const partial = replayCoach.analyzeShowdownReplay('|player|p1|Alice\n|win|Alice', { selectedSide: 'p1' });
  eq(partial.review.summary.result, 'win', 'partial winner result');
  eq(partial.review.summary.confidence, 'medium', 'partial confidence');
});

T('7. marks partial bring-four evidence without overclaiming', () => {
  const partialBring = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|poke|p1|Incineroar, L50, M|',
    '|poke|p1|Whimsicott, L50, F|',
    '|poke|p1|Garchomp, L50, M|',
    '|poke|p1|Arcanine, L50, M|',
    '|poke|p1|Rillaboom, L50, M|',
    '|poke|p1|Milotic, L50, F|',
    '|poke|p2|Indeedee-F, L50, F|',
    '|poke|p2|Hatterene, L50, F|',
    '|poke|p2|Ursaluna, L50, M|',
    '|poke|p2|Torkoal, L50, M|',
    '|poke|p2|Amoonguss, L50, M|',
    '|poke|p2|Kingambit, L50, M|',
    '|teampreview',
    '|start',
    '|switch|p1a: Incineroar|Incineroar, L50, M|100/100',
    '|switch|p2a: Hatterene|Hatterene, L50, F|100/100',
    '|turn|1',
    '|move|p1a: Incineroar|Protect|p1a: Incineroar',
    '|win|Bob'
  ].join('\n');
  const analysis = replayCoach.analyzeShowdownReplay(partialBring, { selectedSide: 'p1' });
  const ids = analysis.review.coachingTags.map((t) => t.id);
  includes(ids, 'questionable_bring', 'questionable bring rule id');
  eq(analysis.review.summary.selectedFourConfidence.level, 'medium', 'partial bring confidence');
  eq(analysis.review.summary.selectedFourConfidence.fullRosterKnown, true, 'partial bring full preview known');
  eq(analysis.review.summary.selectedFourConfidence.selectedFourKnown, false, 'partial bring selected four incomplete');
  eq(analysis.review.summary.selectedFourConfidence.bringChoiceReviewable, false, 'partial bring choice not reviewable');
  truthy(/limited/i.test(analysis.review.summary.selectedFourConfidence.limitation), 'partial bring limitation');
});

T('8. accepts replay-only visible four without full six overclaiming', () => {
  const visibleFourOnly = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|start',
    '|switch|p1a: Incineroar|Incineroar, L50, M|100/100',
    '|switch|p1b: Whimsicott|Whimsicott, L50, F|100/100',
    '|switch|p2a: Hatterene|Hatterene, L50, F|100/100',
    '|switch|p2b: Torkoal|Torkoal, L50, M|100/100',
    '|turn|1',
    '|move|p1a: Incineroar|Fake Out|p2a: Hatterene',
    '|switch|p1b: Garchomp|Garchomp, L50, M|100/100',
    '|turn|2',
    '|switch|p1a: Arcanine|Arcanine, L50, M|100/100',
    '|win|Alice'
  ].join('\n');
  const analysis = replayCoach.analyzeShowdownReplay(visibleFourOnly, { selectedSide: 'p1' });
  const ids = analysis.review.coachingTags.map((t) => t.id);
  eq(analysis.review.summary.selectedFourConfidence.level, 'medium', 'visible four confidence should stay medium without preview');
  eq(analysis.review.summary.selectedFourConfidence.label, 'Visible lineup inferred', 'visible lineup label');
  eq(analysis.review.summary.selectedFourConfidence.previewCount, 0, 'no full preview count');
  eq(analysis.review.summary.selectedFourConfidence.selectedCount, 4, 'four visible selected count');
  eq(analysis.review.summary.selectedFourConfidence.fullRosterKnown, false, 'full roster not known');
  eq(analysis.review.summary.selectedFourConfidence.selectedFourKnown, true, 'selected four known');
  eq(analysis.review.summary.selectedFourConfidence.bringChoiceReviewable, false, 'bring choice not reviewable without full six');
  truthy(/registered six/i.test(analysis.review.summary.selectedFourConfidence.limitation), 'registered six limitation');
  if (ids.includes('questionable_bring')) throw new Error('visible four should not be blocked by questionable_bring');
});

T('9. normalizes copied replay page text down to raw log lines', () => {
  const pastedPage = [
    'Pokemon Showdown replay',
    'Battle log',
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|turn|1',
    '|move|p1a: Incineroar|Fake Out|p2a: Indeedee-F',
    'Download replay'
  ].join('\n');
  const normalized = replayCoach.normalizeReplayLogInput(pastedPage);
  eq(normalized.split('\n').length, 4, 'normalized replay line count');
  truthy(normalized.indexOf('Pokemon Showdown replay') < 0, 'page chrome removed');
  truthy(normalized.indexOf('|move|p1a: Incineroar|Fake Out|p2a: Indeedee-F') >= 0, 'move line preserved');
});

T('10. extracts pipe-delimited log lines from exported replay HTML', () => {
  const replayHtml = [
    '<!doctype html>',
    '<html><body>',
    '<script>',
    'var replayLog = "|player|p1|Alice\\n|player|p2|Bob\\n|turn|1\\n|move|p1a: Incineroar|Fake Out|p2a: Indeedee-F";',
    '</script>',
    '<div>Download replay</div>',
    '</body></html>'
  ].join('\n');
  const normalized = replayCoach.normalizeReplayLogInput(replayHtml);
  eq(normalized.split('\n').length, 4, 'html normalized replay line count');
  truthy(normalized.indexOf('<script>') < 0, 'html chrome removed');
  truthy(normalized.indexOf('|player|p1|Alice') >= 0, 'player line preserved');
  truthy(normalized.indexOf('|move|p1a: Incineroar|Fake Out|p2a: Indeedee-F') >= 0, 'html move line preserved');
});

T('11. extracts entity-escaped Showdown HTML replay logs', () => {
  const replayHtml = [
    '<!doctype html>',
    '<html><body>',
    '<pre class="battle-log-data">',
    '&#124;player&#124;p1&#124;Alice<br>',
    '&#124;player&#124;p2&#124;Bob<br>',
    '&#124;turn&#124;1<br>',
    '&#124;move&#124;p1a: Incineroar&#124;Fake Out&#124;p2a: Indeedee-F',
    '</pre>',
    '</body></html>'
  ].join('');
  const normalized = replayCoach.normalizeReplayLogInput(replayHtml);
  eq(normalized.split('\n').length, 4, 'entity html normalized replay line count');
  truthy(normalized.indexOf('&#124;') < 0, 'entity pipes decoded');
  truthy(normalized.indexOf('|player|p1|Alice') >= 0, 'entity player line preserved');
  truthy(normalized.indexOf('|move|p1a: Incineroar|Fake Out|p2a: Indeedee-F') >= 0, 'entity html move line preserved');
});

T('12. converts replay URLs to .log endpoints and fetches them through the helper', async () => {
  const logUrl = replayCoach.replayUrlToLogUrl('https://replay.pokemonshowdown.com/gen9vgc2026-123456');
  eq(logUrl, 'https://replay.pokemonshowdown.com/gen9vgc2026-123456.log', 'log endpoint');
  let fetched = '';
  const text = await replayCoach.fetchReplayLog('https://replay.pokemonshowdown.com/gen9vgc2026-123456', async (url) => {
    fetched = url;
    return {
      ok: true,
      async text() {
        return 'Battle log\n|player|p1|Alice\n|turn|1';
      }
    };
  });
  eq(fetched, logUrl, 'helper fetch target');
  eq(text, '|player|p1|Alice\n|turn|1', 'fetched log normalized');
});

T('13. recognizes Trick Room reversing opposing Tailwind without false speed penalty', () => {
  const log = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|start',
    '|switch|p1a: Hatterene|Hatterene, L50, F|100/100',
    '|switch|p1b: Incineroar|Incineroar, L50, M|100/100',
    '|switch|p2a: Whimsicott|Whimsicott, L50, F|100/100',
    '|switch|p2b: Garchomp|Garchomp, L50, M|100/100',
    '|turn|1',
    '|move|p2a: Whimsicott|Tailwind|p2a: Whimsicott',
    '|move|p1a: Hatterene|Trick Room|p1a: Hatterene',
    '|turn|2',
    '|move|p1a: Hatterene|Psychic|p2a: Whimsicott',
    '|faint|p2a: Whimsicott',
    '|win|Alice'
  ].join('\n');
  const analysis = replayCoach.analyzeShowdownReplay(log, { selectedSide: 'p1' });
  const ids = analysis.review.coachingTags.map((tag) => tag.id);
  includes(ids, 'speed_control_reversal', 'speed reversal tag');
  if (ids.includes('speed_control_without_pressure')) throw new Error('reversal should not be penalized as no-pressure speed control');
  const turn = analysis.review.turnTimeline.find((row) => row.turn === 1);
  eq(turn.stateShift, 'Speed control reversed', 'turn state shift');
});

T('14. recognizes same-turn Tailwind neutralization', () => {
  const log = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|start',
    '|switch|p1a: Whimsicott|Whimsicott, L50, F|100/100',
    '|switch|p1b: Garchomp|Garchomp, L50, M|100/100',
    '|switch|p2a: Talonflame|Talonflame, L50, M|100/100',
    '|switch|p2b: Rotom-Wash|Rotom-Wash, L50|100/100',
    '|turn|1',
    '|move|p1a: Whimsicott|Tailwind|p1a: Whimsicott',
    '|move|p2a: Talonflame|Tailwind|p2a: Talonflame',
    '|win|Bob'
  ].join('\n');
  const analysis = replayCoach.analyzeShowdownReplay(log, { selectedSide: 'p1' });
  const ids = analysis.review.coachingTags.map((tag) => tag.id);
  includes(ids, 'speed_control_neutralized', 'speed neutralized tag');
  const turn = analysis.review.turnTimeline.find((row) => row.turn === 1);
  eq(turn.stateShift, 'Speed control neutralized', 'turn state shift');
});

T('15. recognizes deferred payoff within three turns', () => {
  const log = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|start',
    '|switch|p1a: Whimsicott|Whimsicott, L50, F|100/100',
    '|switch|p1b: Garchomp|Garchomp, L50, M|100/100',
    '|switch|p2a: Rotom-Wash|Rotom-Wash, L50|100/100',
    '|switch|p2b: Altaria|Altaria, L50|100/100',
    '|turn|1',
    '|move|p1a: Whimsicott|Tailwind|p1a: Whimsicott',
    '|move|p2a: Rotom-Wash|Protect|p2a: Rotom-Wash',
    '|turn|2',
    '|move|p1b: Garchomp|Earthquake|p2a: Rotom-Wash',
    '|-damage|p2a: Rotom-Wash|65/100',
    '|turn|3',
    '|move|p1b: Garchomp|Dragon Claw|p2a: Rotom-Wash',
    '|faint|p2a: Rotom-Wash',
    '|win|Alice'
  ].join('\n');
  const analysis = replayCoach.analyzeShowdownReplay(log, { selectedSide: 'p1' });
  const ids = analysis.review.coachingTags.map((tag) => tag.id);
  includes(ids, 'deferred_payoff', 'deferred payoff tag');
  if (ids.includes('speed_control_without_pressure')) throw new Error('deferred payoff should not be penalized as no-pressure speed control');
  const turn = analysis.review.turnTimeline.find((row) => row.turn === 1);
  eq(turn.stateShift, 'Setup paid off later', 'turn state shift');
});

T('16. recognizes complementary setup turn payoff', () => {
  const log = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|start',
    '|switch|p1a: Amoonguss|Amoonguss, L50, F|100/100',
    '|switch|p1b: Garchomp|Garchomp, L50, M|100/100',
    '|switch|p2a: Rotom-Wash|Rotom-Wash, L50|100/100',
    '|switch|p2b: Altaria|Altaria, L50|100/100',
    '|turn|1',
    '|move|p1a: Amoonguss|Protect|p1a: Amoonguss',
    '|move|p2a: Rotom-Wash|Hydro Pump|p1a: Amoonguss',
    '|turn|2',
    '|move|p1b: Garchomp|Earthquake|p2a: Rotom-Wash',
    '|faint|p2a: Rotom-Wash',
    '|win|Alice'
  ].join('\n');
  const analysis = replayCoach.analyzeShowdownReplay(log, { selectedSide: 'p1' });
  const ids = analysis.review.coachingTags.map((tag) => tag.id);
  includes(ids, 'complementary_turn_payoff', 'complementary payoff tag');
  const turn = analysis.review.turnTimeline.find((row) => row.turn === 1);
  eq(turn.stateShift, 'Complementary turn paid off', 'turn state shift');
});

T('17. recognizes planned speed transition after Trick Room ends from structured speed evidence', () => {
  const parsed = replayCoach.parseShowdownLog([
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|start',
    '|switch|p1a: Dragapult|Dragapult, L50|100/100',
    '|switch|p2a: Torkoal|Torkoal, L50|100/100',
    '|turn|1',
    '|move|p2a: Torkoal|Protect|p2a: Torkoal',
    '|turn|2',
    '|move|p1a: Dragapult|Dragon Darts|p2a: Torkoal',
    '|win|Alice'
  ].join('\n'), { selectedSide: 'p1' });
  parsed.turns[0].post = {
    field: { trick_room: 1 },
    speed_order_details: [
      { side: 'p2', calculated_speed: 40 },
      { side: 'p1', calculated_speed: 213 }
    ]
  };
  parsed.turns[1].pre = {
    field: { trick_room: 0 },
    speed_order_details: [
      { side: 'p1', calculated_speed: 213 },
      { side: 'p2', calculated_speed: 40 }
    ]
  };
  const review = replayCoach.buildReplayCoachReview(parsed, { selectedSide: 'p1' });
  const ids = review.coachingTags.map((tag) => tag.id);
  includes(ids, 'planned_speed_transition', 'planned transition tag');
  const turn = review.turnTimeline.find((row) => row.turn === 2);
  eq(turn.stateShift, 'Planned speed transition', 'turn state shift');
});

T('18. structures real-match protocol rows used by coaching feed', () => {
  const replay = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|poke|p1|Manectric, L50, M|',
    '|poke|p1|Sneasler, L50, M|',
    '|poke|p2|Garchomp, L50, M|',
    '|poke|p2|Torkoal, L50, M|',
    '|start',
    '|switch|p1a: Manectric|Manectric, L50, M|100/100',
    '|switch|p1b: Sneasler|Sneasler, L50, M|100/100',
    '|switch|p2a: Garchomp|Garchomp, L50, M|100/100',
    '|switch|p2b: Torkoal|Torkoal, L50, M|100/100',
    '|turn|1',
    '|-mega|p1a: Manectric|Manectric|Manectite',
    '|detailschange|p1a: Manectric|Manectric-Mega, L50, M|100/100',
    '|-ability|p1a: Manectric|Intimidate|boost',
    '|-unboost|p2a: Garchomp|atk|1',
    '|move|p1b: Sneasler|Fake Out|p2b: Torkoal',
    '|-singleturn|p2b: Torkoal|move: Protect',
    '|cant|p2b: Torkoal|flinch|Eruption',
    '|move|p2a: Garchomp|Earthquake|p1a: Manectric|[spread] p1b',
    '|-supereffective|p1a: Manectric',
    '|-resisted|p1b: Sneasler',
    '|-damage|p1a: Manectric|40/100',
    '|-item|p1a: Manectric|Sitrus Berry',
    '|-heal|p1a: Manectric|65/100|[from] item: Sitrus Berry',
    '|-enditem|p1a: Manectric|Sitrus Berry',
    '|-activate|p2a: Garchomp|ability: Rough Skin',
    '|win|Alice'
  ].join('\n');
  const parsed = replayCoach.parseShowdownLog(replay, { selectedSide: 'p1' });
  const turn1 = parsed.turns.find((t) => t.number === 1);
  truthy(turn1, 'turn 1 missing');
  truthy(turn1.formChanges.some((row) => row.type === 'mega' && row.pokemon === 'Manectric-Mega'), 'mega form row missing');
  truthy(turn1.formChanges.some((row) => row.type === 'detailschange' && row.pokemon === 'Manectric-Mega'), 'detailschange row missing');
  truthy(turn1.abilities.some((row) => row.ability === 'Intimidate' && row.pokemon === 'Manectric-Mega'), 'ability row missing');
  truthy(turn1.actionDenials.some((row) => row.reason === 'flinch' && row.move === 'Eruption'), 'cant/action denial row missing');
  truthy(turn1.singleTurn.some((row) => row.effect === 'move: Protect'), 'single-turn row missing');
  truthy(turn1.effectiveness.some((row) => row.type === 'supereffective' && row.pokemon === 'Manectric-Mega'), 'supereffective row missing');
  truthy(turn1.effectiveness.some((row) => row.type === 'resisted' && row.pokemon === 'Sneasler'), 'resisted row missing');
  truthy(turn1.items.some((row) => row.type === 'item' && row.item === 'Sitrus Berry'), 'item row missing');
  truthy(turn1.items.some((row) => row.type === 'enditem' && row.item === 'Sitrus Berry'), 'enditem row missing');
  truthy(turn1.items.some((row) => row.type === 'activate' && /Rough Skin/.test(row.item)), 'activate row missing');
  const review = replayCoach.buildReplayCoachReview(parsed, { selectedSide: 'p1' });
  truthy(review.actionDenialCards.some((row) => row.reason === 'flinch' && row.move === 'Eruption'), 'action denial card missing');
  truthy(review.abilityItemImpactCards.some((row) => row.kind === 'ability' && row.sourceName === 'Intimidate'), 'ability impact card missing');
  truthy(review.abilityItemImpactCards.some((row) => row.kind === 'item' && row.sourceName === 'Sitrus Berry'), 'item impact card missing');
  truthy(review.megaTimingCards.some((row) => row.pokemon === 'Manectric-Mega'), 'mega timing card missing');
  truthy(review.damageContextCards.some((row) => row.pokemon === 'Manectric-Mega' && row.effects.includes('supereffective')), 'damage context card missing');
  truthy(Array.isArray(review.scenarioQueue) && review.scenarioQueue.length >= 3, 'scenario queue missing');
  truthy(review.scenarioQueue.some((row) => /Action-denial branch/.test(row.title)), 'action-denial scenario missing');
  truthy(review.scenarioQueue.some((row) => /Mega timing branch/.test(row.title)), 'mega timing scenario missing');
  truthy(review.scenarioQueue.some((row) => /Damage threshold branch/.test(row.title)), 'damage threshold scenario missing');
  truthy(review.scenarioQueue.every((row) => row.regulationStatus === 'not_rule_truth'), 'scenario queue must not become rule truth');
  truthy(review.scenarioQueue.every((row) => Array.isArray(row.sourceGaps) && row.sourceGaps.length), 'scenario source gaps missing');
});

T('19. builds a source-bound claim audit for every replay review', () => {
  const analysis = replayCoach.analyzeShowdownReplay(sample, { selectedSide: 'p1' });
  const audit = analysis.review.claimAudit;
  truthy(audit, 'claim audit missing');
  eq(audit.schema_version, 'champions-replay-claim-audit-v1', 'claim audit schema');
  eq(audit.source, 'showdown_replay_import', 'claim audit source');
  truthy(audit.observed.count > 0, 'observed count should be positive');
  truthy(audit.inferred.count >= analysis.review.coachingTags.length, 'inferred count should cover coaching tags');
  truthy(audit.sim_derived.count === analysis.review.scenarioQueue.length, 'scenario count should match queue');
  truthy(audit.source_gaps.some((gap) => gap.code === 'CHAMPION_LEGALITY_NOT_VALIDATED'), 'Champion legality source gap missing');
  truthy(audit.source_gaps.some((gap) => gap.code === 'ALTERNATIVE_BRANCHES_NOT_EXHAUSTIVE'), 'alternative branch source gap missing');
  truthy(audit.forbidden_claims.some((claim) => /definitely best/i.test(claim)), 'best-claim guard missing');
  truthy(audit.forbidden_claims.some((claim) => /official Pokemon Champion legality/i.test(claim)), 'legality guard missing');
});

runTests().then(() => {
  console.log(`\nBattle Sensei parser: ${pass} pass, ${fail} fail\n`);
  process.exit(fail ? 1 : 0);
});
