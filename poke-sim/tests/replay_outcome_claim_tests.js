const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../replay_learning.js');
const coach = require('../replay_coach.js');

test('a final faint and loss do not prove an endgame decision error in either format or side', () => {
  for (const format of ['singles', 'doubles']) {
    for (const side of ['p1', 'p2']) {
      const opponent = side === 'p1' ? 'p2' : 'p1';
      const raw = [
        '|gametype|' + format, '|player|p1|Alice', '|player|p2|Bob',
        '|switch|' + side + 'a: Kingambit|Kingambit, L50|1/100',
        '|switch|' + opponent + 'a: Sneasler|Sneasler, L50|100/100',
        '|turn|5', '|move|' + opponent + 'a: Sneasler|Close Combat|' + side + 'a: Kingambit',
        '|-damage|' + side + 'a: Kingambit|0 fnt', '|faint|' + side + 'a: Kingambit',
        '|win|' + (opponent === 'p1' ? 'Alice' : 'Bob')
      ].join('\n');
      const { parsed, review } = coach.analyzeShowdownReplay(raw, { selectedSide: side });
      assert.equal(parsed.result, 'loss');
      assert.equal(parsed.turns[0].faints.length, 1);
      assert(!review.coachingTags.some(r => r.id === 'endgame_misplay'));
      assert(!JSON.stringify(review.learningReport).includes('The final exchange did not preserve the closing piece.'));
    }
  }
});

test('missing detected errors do not generate positive IQ evidence', () => {
  const { review } = coach.analyzeShowdownReplay('|player|p1|Alice\n|player|p2|Bob\n|switch|p1a: Pelipper|Pelipper|100/100\n|turn|1\n|move|p1a: Pelipper|Protect|p1a: Pelipper\n|win|Alice', { selectedSide: 'p1' });
  const output = JSON.stringify(review.learningReport);
  for (const unsupported of [
    'No major speed-control error was detected from this log.',
    'No clear win-condition abandonment was detected.',
    'No major resource misuse was detected from parsed events.'
  ]) assert(!output.includes(unsupported), unsupported);
});
