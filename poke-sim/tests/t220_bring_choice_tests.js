// Issue #220 - Battle Sensei replay parser should surface the benched two
// when the full six-mon roster and the brought four are both known.
// RED phase: all tests fail until buildReplayCoachReview is updated.
// GREEN phase: all tests pass after implementation.
// Exit code: 1 if any test fails (blocks CI).

const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const replayCoach = require(path.join(ROOT, 'replay_coach.js'));

let pass = 0, fail = 0;
function T(name, fn) {
  try { fn(); console.log('  PASS', name); pass++; }
  catch (e) { console.log('  FAIL', name, '-', e.message); fail++; }
}
function eq(a, b, msg)    { if (a !== b) throw new Error(`${msg || 'eq'}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); }
function truthy(v, msg)   { if (!v) throw new Error(msg || `expected truthy, got ${JSON.stringify(v)}`); }
function falsy(v, msg)    { if (v)  throw new Error(msg || `expected falsy, got ${JSON.stringify(v)}`); }
function includes(arr, v, msg) { if (!arr.includes(v)) throw new Error(`${msg || 'includes'}: ${JSON.stringify(v)} not in ${JSON.stringify(arr)}`); }

// Full-preview log: 6 poke lines for each side, 4 mons appear in play for p1.
// p1 preview: Incineroar, Whimsicott, Garchomp, Arcanine, Rillaboom, Milotic
// p1 in play: Incineroar, Whimsicott, Arcanine, Garchomp  →  bench = Rillaboom, Milotic
const FULL_PREVIEW_LOG = [
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
  '|switch|p1b: Whimsicott|Whimsicott, L50, F|100/100',
  '|switch|p2a: Indeedee-F|Indeedee-F, L50, F|100/100',
  '|switch|p2b: Hatterene|Hatterene, L50, F|100/100',
  '|turn|1',
  '|move|p1a: Incineroar|Fake Out|p2b: Hatterene',
  '|switch|p1a: Arcanine|Arcanine, L50, M|100/100',
  '|turn|2',
  '|move|p1a: Arcanine|Flare Blitz|p2a: Indeedee-F',
  '|-damage|p2a: Indeedee-F|55/100',
  '|turn|3',
  '|switch|p1a: Garchomp|Garchomp, L50, M|100/100',
  '|move|p1b: Whimsicott|Tailwind|p1: Alice',
  '|win|Alice',
].join('\n');

// No-preview log: no |poke| lines, only 4 mons revealed by play
const NO_PREVIEW_LOG = [
  '|player|p1|Alice',
  '|player|p2|Bob',
  '|gametype|doubles',
  '|start',
  '|switch|p1a: Incineroar|Incineroar, L50, M|100/100',
  '|switch|p1b: Whimsicott|Whimsicott, L50, F|100/100',
  '|switch|p2a: Hatterene|Hatterene, L50, F|100/100',
  '|switch|p2b: Torkoal|Torkoal, L50, M|100/100',
  '|turn|1',
  '|switch|p1a: Garchomp|Garchomp, L50, M|100/100',
  '|turn|2',
  '|switch|p1b: Arcanine|Arcanine, L50, M|100/100',
  '|win|Bob',
].join('\n');

// Partial-bring log: 6 poke lines but only 1 mon appears in play
const PARTIAL_BRING_LOG = [
  '|player|p1|Alice',
  '|player|p2|Bob',
  '|gametype|doubles',
  '|poke|p1|Incineroar, L50, M|',
  '|poke|p1|Whimsicott, L50, F|',
  '|poke|p1|Garchomp, L50, M|',
  '|poke|p1|Arcanine, L50, M|',
  '|poke|p1|Rillaboom, L50, M|',
  '|poke|p1|Milotic, L50, F|',
  '|poke|p2|Hatterene, L50, F|',
  '|poke|p2|Torkoal, L50, M|',
  '|poke|p2|Amoonguss, L50, M|',
  '|poke|p2|Kingambit, L50, M|',
  '|poke|p2|Indeedee-F, L50, F|',
  '|poke|p2|Ursaluna, L50, M|',
  '|teampreview',
  '|start',
  '|switch|p1a: Incineroar|Incineroar, L50, M|100/100',
  '|switch|p2a: Hatterene|Hatterene, L50, F|100/100',
  '|turn|1',
  '|move|p1a: Incineroar|Protect|p1a: Incineroar',
  '|win|Bob',
].join('\n');

console.log('\n=== Battle Sensei bring-choice coaching tests (#220) ===\n');

// ============================================================
// T1 — benchedTwo computed correctly when bringChoiceReviewable
// ============================================================
T('1. summary.benchedTwo is a 2-element array containing the 2 not-brought mons', () => {
  const analysis = replayCoach.analyzeShowdownReplay(FULL_PREVIEW_LOG, { selectedSide: 'p1' });
  const benchedTwo = analysis.review.summary.benchedTwo;
  truthy(Array.isArray(benchedTwo), 'benchedTwo must be an array');
  eq(benchedTwo.length, 2, 'benchedTwo must have exactly 2 entries');
  includes(benchedTwo, 'Rillaboom', 'benchedTwo must contain Rillaboom');
  includes(benchedTwo, 'Milotic', 'benchedTwo must contain Milotic');
});

// ============================================================
// T2 — bring_choice_review tag fires with required fields
// ============================================================
T('2. bring_choice_review coaching tag fires with benchedSpecies, whatHappened, whyMattered, doInstead', () => {
  const analysis = replayCoach.analyzeShowdownReplay(FULL_PREVIEW_LOG, { selectedSide: 'p1' });
  const tags = analysis.review.coachingTags;
  const tag = tags.find((t) => t.id === 'bring_choice_review');
  truthy(tag, 'bring_choice_review tag must be present');
  truthy(Array.isArray(tag.benchedSpecies) && tag.benchedSpecies.length === 2, 'tag.benchedSpecies must have 2 entries');
  includes(tag.benchedSpecies, 'Rillaboom', 'benchedSpecies must contain Rillaboom');
  includes(tag.benchedSpecies, 'Milotic', 'benchedSpecies must contain Milotic');
  truthy(tag.whatHappened && tag.whatHappened.length > 0, 'tag.whatHappened must be non-empty');
  truthy(tag.whyMattered && tag.whyMattered.length > 0, 'tag.whyMattered must be non-empty');
  truthy(tag.doInstead && tag.doInstead.length > 0, 'tag.doInstead must be non-empty');
});

// ============================================================
// T3 — benchedTwo absent when full roster unknown (no |poke| lines)
// ============================================================
T('3. summary.benchedTwo is empty and no bring_choice_review tag when full roster is unknown', () => {
  const analysis = replayCoach.analyzeShowdownReplay(NO_PREVIEW_LOG, { selectedSide: 'p1' });
  const benchedTwo = analysis.review.summary.benchedTwo;
  truthy(!benchedTwo || benchedTwo.length === 0,
    'benchedTwo must be empty when full roster is unknown (no preview lines)');
  const tag = (analysis.review.coachingTags || []).find((t) => t.id === 'bring_choice_review');
  falsy(tag, 'bring_choice_review must NOT fire when full roster is unknown');
});

// ============================================================
// T4 — benchedTwo absent when selected four not complete (< 4 revealed)
// ============================================================
T('4. summary.benchedTwo is empty and no bring_choice_review tag when fewer than 4 mons are revealed', () => {
  const analysis = replayCoach.analyzeShowdownReplay(PARTIAL_BRING_LOG, { selectedSide: 'p1' });
  const benchedTwo = analysis.review.summary.benchedTwo;
  truthy(!benchedTwo || benchedTwo.length === 0,
    'benchedTwo must be empty when fewer than 4 mons appeared in play');
  const tag = (analysis.review.coachingTags || []).find((t) => t.id === 'bring_choice_review');
  falsy(tag, 'bring_choice_review must NOT fire when selected four is incomplete');
});

console.log(`\nRESULT: ${pass}/${pass + fail} PASS`);
process.exit(fail === 0 ? 0 : 1);
