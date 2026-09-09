import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadLocalEngine, compareProbe } from '../tools/showdown-reference.mjs';
import { referenceProbes } from './fixtures/showdown_reference_probes.mjs';
const require = createRequire(import.meta.url);
const learning = require('../replay_learning.js');
const coach = require('../replay_coach.js');

test('AUD-1901 Leftovers precedes Toxic at full HP and later ticks on either side', () => {
  const local = loadLocalEngine();
  // The pinned prototype accepts at most five scripted turns; later lethal turns remain a gap.
  for (const swapped of [false, true]) for (const count of [1, 2, 3, 5]) {
    const f = referenceProbes()[0];
    f.id = `residual-leftovers-toxic-${swapped}-${count}`;
    f.player.members[0].moves = ['Splash'];
    f.player.members[1].moves = ['Growl'];
    f.player.members[1].item = 'Leftovers';
    f.opponent.members[0].moves = ['Leer'];
    f.opponent.members[1].moves = ['Toxic'];
    f.turns = Array.from({ length: count }, () => ({
      player: [{ move: 'Splash' }, { move: 'Growl' }],
      opponent: [{ move: 'Leer' }, { move: 'Toxic', targetSlot: 1, targetSide: 'foe' }]
    }));
    if (swapped) {
      [f.player, f.opponent] = [f.opponent, f.player];
      for (const t of f.turns) [t.player, t.opponent] = [t.opponent, t.player];
    }
    const r = compareProbe(f, local);
    assert.equal(r.status, 'agreement_in_declared_scope', JSON.stringify({ id: f.id, status: r.status, differences: r.differences }));
  }
});

test('AUD-1902 supplied plans never authenticate team identity or permit calibration', () => {
  for (const side of ['p1', 'p2']) for (const format of ['singles', 'doubles']) {
    const parsed = { ok: true, warnings: [], turns: [{}, {}], selectedSide: side, format };
    const roster = ['Magikarp', 'Feebas', 'Sunkern', 'Caterpie'];
    const review = { summary: { yourLead: roster.slice(0, 2), yourFour: roster }, coachingTags: [] };
    for (const bestFour of [roster, ['Whimsicott', 'Incineroar', 'Dragapult', 'unclear']]) {
      const comparison = learning.buildSimComparison(parsed, review, { simPlan: {
        bestFour, registeredRoster: roster, confidence: 'high', lineupMatrixComplete: true,
        identityVerified: true, status: 'matched'
      }});
      assert.notEqual(comparison.status, 'matched');
      assert.equal(comparison.evidenceTier, 'needs_more_data');
      const feedback = learning.buildSimFeedbackPacket(parsed, review, comparison).simFeedback;
      assert.equal(feedback.shouldUpdateLeadModel, false);
      assert.equal(feedback.shouldUpdateBringFourModel, false);
      assert.equal(feedback.shouldUpdateArchetypeModel, false);
    }
  }
  const forged = learning.buildSimFeedbackPacket({ ok: true }, { coachingTags: [{ id: 'bad_lead' }] }, {
    status: 'matched', confidence: 'high', leadMatch: 0, fourMatch: 0, identityVerified: true
  }).simFeedback;
  assert.equal(forged.shouldUpdateLeadModel, false);
  assert.equal(forged.shouldUpdateBringFourModel, false);
  assert.equal(forged.shouldUpdateArchetypeModel, false);
});

test('AUD-1902 UI does not manufacture plans from current team selections', () => {
  const source = readFileSync(new URL('../ui.js', import.meta.url), 'utf8');
  const start = source.indexOf('function csBuildBattleSenseiSimPlan(');
  const end = source.indexOf('\nfunction csInitReplayCoachUi(', start);
  assert(start >= 0 && end > start);
  const context = vm.createContext({});
  vm.runInContext(source.slice(start, end), context);
  for (const side of ['p1', 'p2']) {
    assert.equal(context.csBuildBattleSenseiSimPlan({ selectedSide: side, teamPreview: { p1: ['Magikarp'], p2: ['Feebas'] } }, side), null);
  }
});

test('AUD-1903 residual-only damage cannot earn speed-control conversion praise or points', () => {
  for (const side of ['p1', 'p2']) for (const format of ['singles', 'doubles']) {
    const opp = side === 'p1' ? 'p2' : 'p1';
    for (const from of ['psn', 'brn', 'Sandstorm']) {
      const raw = [
        `|gametype|${format}`, '|player|p1|A', '|player|p2|B',
        `|switch|${side}a: Whimsicott|Whimsicott|100/100`,
        `|switch|${opp}a: Arcanine|Arcanine|50/100 psn`, '|turn|1',
        `|move|${side}a: Whimsicott|Tailwind|${side}a: Whimsicott`,
        `|-sidestart|${side}: A|move: Tailwind`,
        `|-damage|${opp}a: Arcanine|38/100 psn|[from] ${from}`, '|turn|2',
        `|move|${side}a: Whimsicott|Protect|${side}a: Whimsicott`
      ].join('\n');
      const { review } = coach.analyzeShowdownReplay(raw, { selectedSide: side });
      assert(!review.coachingTags.some(x => ['speed_control_converted', 'deferred_payoff'].includes(x.id)));
      assert(!review.coachingTags.some(x => x.id === 'speed_control_pressure_observed'));
      assert.equal(review.learningReport.criticalTurns.fatalMistake, null);
      assert(!review.learningReport.battleIq.raisedBy.some(x => /Speed control converted/.test(x.text)));
    }
  }
});

test('AUD-1905 news PR discovery does not combine incompatible gh output flags', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/news-feed-sync.yml', import.meta.url), 'utf8');
  const command = workflow.split('\n').find(line => line.includes('candidates=$(gh api'));
  assert(command);
  assert(!command.includes('--jq'));
  assert(command.includes('| jq '));
});

test('AUD-1903 setup and protection cannot earn credit from later poison ticks', () => {
  for (const move of ['Swords Dance', 'Protect', 'Tailwind']) {
    const raw = [
      '|player|p1|A', '|player|p2|B',
      '|switch|p1a: Whimsicott|Whimsicott|100/100',
      '|switch|p2a: Arcanine|Arcanine|50/100 psn', '|turn|1',
      `|move|p1a: Whimsicott|${move}|p1a: Whimsicott`, '|turn|2',
      '|move|p1a: Whimsicott|Protect|p1a: Whimsicott',
      '|-damage|p2a: Arcanine|38/100 psn|[from] psn', '|turn|3',
      '|-damage|p2a: Arcanine|26/100 psn|[from] psn'
    ].join('\n');
    const { review } = coach.analyzeShowdownReplay(raw, { selectedSide: 'p1' });
    assert(!review.coachingTags.some(x => ['speed_control_converted', 'deferred_payoff', 'complementary_turn_payoff'].includes(x.id)));
    assert(!review.learningReport.battleIq.raisedBy.some(x => /payoff|setup turn produced|multi-turn planning/i.test(x.text)));
  }
});
