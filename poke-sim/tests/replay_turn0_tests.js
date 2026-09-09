// Replay Turn 0 audit snapshot tests.

require('../generated/pokemon_showdown_legal_data.js');
require('../move_legality.js');
const replayCoach = require('../replay_coach.js');

let pass = 0;
let fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || 'expected equality') + ': got ' + actual + ', expected ' + expected);
}
function truthy(value, msg) {
  if (!value) throw new Error(msg || 'expected truthy');
}

console.log('\n=== replay Turn 0 tests ===\n');

const log = [
  '|player|p1|Alice',
  '|player|p2|Bob',
  '|gametype|doubles',
  '|poke|p1|Kangaskhan, L50, F|',
  '|poke|p1|Arcanine-Hisui, L50, M|',
  '|poke|p1|Milotic, L50, F|',
  '|poke|p2|Tyranitar, L50, M|',
  '|poke|p2|Indeedee-F, L50, F|',
  '|poke|p2|Amoonguss, L50, M|',
  '|start',
  '|switch|p1a: Kanga|Kangaskhan, L50, F|100/100',
  '|switch|p1b: Arc|Arcanine-Hisui, Level 50, Male|100/100',
  '|switch|p2a: Tyranitar|Tyranitar, L50, M|100/100',
  '|switch|p2b: Indeedee|Indeedee-F, L50, F|100/100',
  '|turn|1',
  '|-mega|p1a: Kanga|Kangaskhanite',
  '|move|p1a: Kanga|Fake Out|p2a: Tyranitar',
  '|move|p1b: Arc|Surf|p2a: Tyranitar',
  '|-damage|p2a: Tyranitar|0 fnt',
  '|faint|p2a: Tyranitar',
  '|win|Alice'
].join('\n');

T('1. Turn 0 snapshot exists and Turn 1 remains the first parsed battle turn', () => {
  const parsed = replayCoach.parseShowdownLog(log, { selectedSide: 'p1' });
  truthy(parsed.turn0, 'turn0 missing');
  eq(parsed.turn0.title, 'Turn 0 — Starting State', 'turn0 title');
  eq(parsed.turns[0].number, 1, 'first battle turn');
});

T('2. Turn 0 includes both leads and normalized species names', () => {
  const parsed = replayCoach.parseShowdownLog(log, { selectedSide: 'p1' });
  eq(parsed.turn0.sides.p1.leads.length, 2, 'p1 lead count');
  eq(parsed.turn0.sides.p2.leads.length, 2, 'p2 lead count');
  truthy(parsed.turn0.sides.p1.leads.some((lead) => lead.species === 'Kangaskhan'), 'Kangaskhan lead missing');
  truthy(parsed.turn0.sides.p1.roster.some((row) => row.species === 'Milotic' && row.status === 'bench'), 'bench Milotic missing');
  truthy(!parsed.turn0.sides.p1.leads.some((lead) => lead.species === 'F'), 'F should not become lead species');
});

T('3. Turn 0 records gender metadata and preserves Mega as a later-turn change', () => {
  const parsed = replayCoach.parseShowdownLog(log, { selectedSide: 'p1' });
  const kanga = parsed.turn0.sides.p1.leads.find((lead) => lead.species === 'Kangaskhan');
  eq(kanga.gender, 'F', 'Kangaskhan gender');
  truthy(kanga.parserWarnings.join(';').includes('Mega form resolved'), 'Mega warning missing');
  truthy(parsed.turn0.parserWarnings.join(';').includes('gender token seen and stripped'), 'gender parser warning missing');
  const turnOneKanga = parsed.turns[0].rosterState.p1.find((row) => row.species === 'Kangaskhan-Mega');
  truthy(turnOneKanga && turnOneKanga.status === 'active', 'Kangaskhan-Mega should appear on turn 1 board');
  truthy(parsed.turns[0].events.some((ev) => ev.type === 'mega' && ev.pokemon === 'Kangaskhan-Mega'), 'Mega event missing on turn 1');
});

T('4. Turn 0 keeps move legality unchecked without a source tier', () => {
  const parsed = replayCoach.parseShowdownLog(log, { selectedSide: 'p1' });
  const kanga = parsed.turn0.sides.p1.leads.find((lead) => lead.species === 'Kangaskhan');
  const arc = parsed.turn0.sides.p1.leads.find((lead) => lead.species === 'Arcanine-Hisui');
  eq(kanga.baseStatsLabel, '105/95/80/40/80/90', 'Kangaskhan starting stats');
  truthy(kanga.moveLegality.some((row) => row.move === 'Fake Out' && row.verification_status === 'unchecked'), 'Fake Out lacks source context');
  truthy(arc.moveLegality.some((row) => row.move === 'Surf' && row.verification_status === 'unchecked'), 'Surf lacks source context, not proven illegal');
});

T('5. Turn timeline records health and knocked-out state', () => {
  const parsed = replayCoach.parseShowdownLog(log, { selectedSide: 'p1' });
  const tyranitar = parsed.turns[0].rosterState.p2.find((row) => row.species === 'Tyranitar');
  truthy(tyranitar, 'Tyranitar turn state missing');
  eq(tyranitar.hp, 0, 'Tyranitar HP after KO');
  eq(tyranitar.status, 'fainted', 'Tyranitar status after KO');
  eq(tyranitar.faintTurn, 1, 'Tyranitar faint turn');
});

T('6. Turn 0 handles unknown species and moves without crashing', () => {
  const unknownLog = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|switch|p1a: Mystery|Notapokemon, L50, F|100/100',
    '|turn|1',
    '|move|p1a: Mystery|Fake Move|p2a: Target',
    '|win|Bob'
  ].join('\n');
  const parsed = replayCoach.parseShowdownLog(unknownLog, { selectedSide: 'p1' });
  truthy(parsed.turn0.sides.p1.leads[0], 'unknown lead row');
  eq(parsed.turn0.sides.p1.leads[0].baseStatsLabel, 'unknown', 'unknown stats label');
});

T('7. Same-turn Mega timing is shown in replay event order', () => {
  const megaRaceLog = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|switch|p1a: Charizard|Charizard, L50, M|100/100',
    '|switch|p2a: Blastoise|Blastoise, L50, M|100/100',
    '|turn|1',
    '|-mega|p1a: Charizard|Charizardite Y',
    '|-mega|p2a: Blastoise|Blastoisinite',
    '|move|p1a: Charizard|Heat Wave|p2a: Blastoise',
    '|win|Alice'
  ].join('\n');
  const analysis = replayCoach.analyzeShowdownReplay(megaRaceLog, { selectedSide: 'p1' });
  const events = analysis.review.turnTimeline[0].events;
  const charizardIndex = events.findIndex((ev) => ev.includes('Charizard-Mega-Y'));
  const blastoiseIndex = events.findIndex((ev) => ev.includes('Blastoise-Mega'));
  truthy(charizardIndex >= 0, 'Charizard-Mega-Y timing event missing');
  truthy(blastoiseIndex >= 0, 'Blastoise-Mega timing event missing');
  truthy(charizardIndex < blastoiseIndex, 'Mega events should preserve replay order');
  truthy(events[charizardIndex].includes('timing shown in replay order'), 'timing note missing');
});

T('8. Bring-four replay without preview remains reviewable with a limitation', () => {
  const bringFourOnlyLog = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|start',
    '|switch|p1a: Tyranitar|Tyranitar, L50, M|100/100',
    '|switch|p1b: Excadrill|Excadrill, L50, M|100/100',
    '|switch|p2a: Amoonguss|Amoonguss, L50, M|100/100',
    '|switch|p2b: Indeedee|Indeedee-F, L50, F|100/100',
    '|turn|1',
    '|switch|p1a: Corviknight|Corviknight, L50, F|100/100',
    '|switch|p1b: Primarina|Primarina, L50, F|100/100',
    '|move|p2a: Amoonguss|Pollen Puff|p1a: Corviknight',
    '|win|Alice'
  ].join('\n');
  const analysis = replayCoach.analyzeShowdownReplay(bringFourOnlyLog, { selectedSide: 'p1' });
  const confidence = analysis.review.summary.selectedFourConfidence;
  truthy(analysis.parsed.ok, 'four-visible replay should parse');
  eq(confidence.selectedCount, 4, 'visible selected count');
  eq(confidence.fullRosterKnown, false, 'full roster should be unknown');
  truthy(confidence.limitation.includes('registered six were not fully revealed'), 'bring-four limitation missing');
  truthy(analysis.review.coachingTags.some((tag) => tag.id === 'bring_four_limited'), 'bring-four limitation tag missing');
});

T('9. Manual full roster completion makes bring-choice reviewable', () => {
  const bringFourOnlyLog = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|doubles',
    '|start',
    '|switch|p1a: Tyranitar|Tyranitar, L50, M|100/100',
    '|switch|p1b: Excadrill|Excadrill, L50, M|100/100',
    '|switch|p2a: Amoonguss|Amoonguss, L50, M|100/100',
    '|switch|p2b: Indeedee|Indeedee-F, L50, F|100/100',
    '|turn|1',
    '|switch|p1a: Corviknight|Corviknight, L50, F|100/100',
    '|switch|p1b: Primarina|Primarina, L50, F|100/100',
    '|move|p2a: Amoonguss|Pollen Puff|p1a: Corviknight',
    '|win|Alice'
  ].join('\n');
  const analysis = replayCoach.analyzeShowdownReplay(bringFourOnlyLog, {
    selectedSide: 'p1',
    manualTeamPreview: [
      'Tyranitar',
      'Excadrill',
      'Corviknight',
      'Primarina',
      'Incineroar',
      'Sinistcha'
    ].join('\n')
  });
  const confidence = analysis.review.summary.selectedFourConfidence;
  eq(analysis.parsed.teamPreview.p1.length, 6, 'manual full roster count');
  eq(confidence.fullRosterKnown, true, 'manual roster should count as full preview');
  eq(confidence.bringChoiceReviewable, true, 'bring-choice should be reviewable');
  truthy(analysis.parsed.turn0.sides.p1.roster.some((row) => row.species === 'Incineroar' && row.status === 'bench'), 'manual bench Incineroar missing');
  truthy(!analysis.review.coachingTags.some((tag) => tag.id === 'bring_four_limited'), 'limited tag should clear with full roster');
});

T('10. Singles three-of-six lineup is reviewable when registered roster is known', () => {
  const singlesLog = [
    '|player|p1|Alice',
    '|player|p2|Bob',
    '|gametype|singles',
    '|start',
    '|switch|p1a: Dragonite|Dragonite, L50, M|100/100',
    '|switch|p2a: Rotom|Rotom-Wash, L50|100/100',
    '|turn|1',
    '|switch|p1a: Gholdengo|Gholdengo, L50|100/100',
    '|move|p2a: Rotom|Thunderbolt|p1a: Gholdengo',
    '|turn|2',
    '|switch|p1a: Chien-Pao|Chien-Pao, L50|100/100',
    '|move|p2a: Rotom|Hydro Pump|p1a: Chien-Pao',
    '|win|Alice'
  ].join('\n');
  const analysis = replayCoach.analyzeShowdownReplay(singlesLog, {
    selectedSide: 'p1',
    manualTeamPreview: [
      'Dragonite',
      'Gholdengo',
      'Chien-Pao',
      'Ursaluna-Bloodmoon',
      'Amoonguss',
      'Incineroar'
    ].join('\n')
  });
  const confidence = analysis.review.summary.selectedFourConfidence;
  eq(confidence.expectedLineupSize, 3, 'singles expected lineup size');
  eq(confidence.selectedCount, 3, 'singles selected count');
  eq(confidence.bringChoiceReviewable, true, 'singles lineup should be reviewable');
});

console.log(`\nreplay Turn 0: ${pass} pass, ${fail} fail\n`);
process.exit(fail ? 1 : 0);
