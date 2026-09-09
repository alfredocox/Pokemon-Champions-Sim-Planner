// Consumer integration: synthetic source pools prove context routing, not battle legality.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness({ missingPool = false, missingSource = false, missingApi = false } = {}) {
  const ctx = vm.createContext({ ChampionsSim: {}, selectedRegulationId: 'champions_reg_m_b_2026' });
  if (!missingSource) ctx.ChampionsSim.pokemonDataAudit = {
    source: 'synthetic-history', sourceCommitOrVersion: 'fixture-v1',
    species: { Pikachu: { id: 'pikachu', moves: { surf: '9M', thunderbolt: '9M' } } },
    moves: { surf: { move_name: 'Surf' }, thunderbolt: { move_name: 'Thunderbolt' }, protect: { move_name: 'Protect' } }
  };
  if (!missingPool) ctx.ChampionsSim.championsMovePools = {
    schema_version: 'champions-inherited-move-pools-v1', mod: 'champions',
    reference: { version: '0.11.11' },
    species: { pikachu: { reference_species_id: 'pikachu', status: 'known', moves: ['thunderbolt'], inherited_from: [] } }
  };
  const load = name => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), ctx, { filename: name });
  if (!missingApi) load('move_legality.js');
  load('replay_coach.js');
  return ctx.ChampionsSim.replayCoach;
}

function parse(api, metadata, opts = {}) {
  return api.parseShowdownLog([
    ...metadata, '|player|p1|Alice', '|player|p2|Bob',
    '|poke|p1|Pikachu, L50|', '|poke|p2|Pikachu, L50|',
    '|switch|p1a: Pikachu|Pikachu, L50|100/100',
    '|switch|p2a: Pikachu|Pikachu, L50|100/100',
    '|turn|1', '|move|p1a: Pikachu|Surf|p2a: Pikachu',
    '|turn|2', '|move|p2a: Pikachu|Thunderbolt|p1a: Pikachu', '|win|Alice'
  ].join('\n'), opts);
}

function rows(parsed) {
  return [
    ...parsed.turn0.sides.p1.roster, ...parsed.turn0.sides.p2.roster,
    ...parsed.turns.flatMap(turn => [...turn.rosterState.p1, ...turn.rosterState.p2])
  ].filter(row => row.moveLegality.length);
}

function unchecked(parsed, reason) {
  assert.ok(rows(parsed).length);
  for (const row of rows(parsed)) {
    for (const move of row.moveLegality) {
      assert.equal(move.legal, false);
      assert.equal(move.verification_status, 'unchecked');
      assert.equal(move.reason, reason);
    }
    assert.ok(row.parserWarnings.some(w => w.includes('move legality unchecked:')));
    assert.ok(!row.parserWarnings.some(w => /move not legal|membership not found/.test(w)));
  }
}

let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS ' + name); }
const champions = '|tier|[Gen 9 Champions] VGC 2026 Reg M-B';
const historical = '|tier|[Gen 9] VGC 2026';

test('tier and gameType remain separate in either order without changing compatibility format', () => {
  for (const metadata of [[champions, '|gametype|doubles'], ['|gametype|doubles', champions]]) {
    const result = parse(harness(), metadata);
    assert.equal(result.format, metadata[0].split('|')[2]);
    assert.equal(result.tier, '[Gen 9 Champions] VGC 2026 Reg M-B');
    assert.equal(result.gameType, 'doubles');
    assert.equal(result.learnsetContext, 'champions');
    for (const row of rows(result)) {
      for (const move of row.moveLegality) {
        assert.equal(move.learnsetContext, 'champions');
        assert.equal(move.verification_status, 'known');
        assert.equal(move.legal, move.move === 'Thunderbolt');
        assert.equal(move.sourceVersion, '0.11.11');
      }
      if (row.moveLegality.some(m => !m.legal)) assert.ok(row.parserWarnings.some(w => w.includes('move not legal')));
    }
  }
});

test('explicit SV replay uses historical membership, never current UI context', () => {
  const result = parse(harness(), [historical, '|gametype|doubles'], { learnsetContext: 'champions', selectedRegulationId: 'champions_reg_m_b_2026' });
  assert.equal(result.learnsetContext, 'historical');
  for (const row of rows(result)) {
    assert.ok(row.moveLegality.every(m => m.legal && m.learnsetContext === 'historical'));
    assert.ok(row.parserWarnings.some(w => w.includes('historical learnset membership found; not current Champions legality')));
    assert.ok(row.moveLegality.every(m => m.notes.includes('Historical learnset evidence only')));
  }
});

test('absent, unknown, gameType-only and misleading tier text cannot select a pool', () => {
  for (const metadata of [[], ['|gametype|doubles'], ['|tier|Unknown'], ['|tier|[Gen 9] Unknown'], ['|tier|Unofficial Champions'], ['|gametype|[Gen 9 Champions] VGC 2026 Reg M-B']]) {
    const result = parse(harness(), metadata, { learnsetContext: 'champions', tier: '[Gen 9 Champions] VGC 2026 Reg M-B' });
    assert.equal(result.learnsetContext, '');
    unchecked(result, 'learnset_context_unavailable');
  }
});

test('missing Champions artifact is unchecked even when historical move exists', () => {
  unchecked(parse(harness({ missingPool: true }), [champions]), 'champions_pool_unavailable');
});

test('missing historical source and missing API produce unchecked warnings', () => {
  unchecked(parse(harness({ missingSource: true }), [historical]), 'source_unavailable');
  unchecked(parse(harness({ missingApi: true }), [champions]), 'source_unavailable');
});

test('historical nonmembership is not described as current illegality', () => {
  const api = harness();
  const result = api.parseShowdownLog([
    historical, '|switch|p1a: Pikachu|Pikachu, L50|100/100',
    '|turn|1', '|move|p1a: Pikachu|Protect|p1a: Pikachu'
  ].join('\n'));
  for (const row of rows(result)) {
    assert.ok(row.moveLegality.every(m => !m.legal && m.verification_status === 'known'));
    assert.ok(row.parserWarnings.some(w => w.includes('historical learnset membership not found; not current Champions legality')));
    assert.ok(!row.parserWarnings.some(w => w.includes('move not legal')));
  }
});

test('unknown historical move is unchecked, not known nonmembership', () => {
  const result = harness().parseShowdownLog([
    historical, '|switch|p1a: Pikachu|Pikachu, L50|100/100',
    '|turn|1', '|move|p1a: Pikachu|Missing Move|p1a: Pikachu'
  ].join('\n'));
  unchecked(result, 'unknown_move');
});

test('all six supported Champions tier names match pinned formats, including Bo3 and BSS', () => {
  const showdown = require('pokemon-showdown');
  const pkg = require('pokemon-showdown/package.json');
  assert.equal(pkg.version, '0.11.11');
  for (const reg of ['A', 'B']) {
    for (const [suffix, gameType] of [
      ['BSS Reg M-' + reg, 'singles'],
      ['VGC 2026 Reg M-' + reg, 'doubles'],
      ['VGC 2026 Reg M-' + reg + ' (Bo3)', 'doubles']
    ]) {
      const tier = '[Gen 9 Champions] ' + suffix;
      const pinned = showdown.Dex.formats.get(tier);
      assert.equal(pinned.exists, true, tier);
      assert.equal(pinned.name, tier);
      assert.equal(pinned.gameType, gameType);
      for (const metadata of [['|tier|' + tier, '|gametype|' + gameType], ['|gametype|' + gameType, '|tier|' + tier]]) {
        const result = parse(harness(), metadata);
        assert.equal(result.learnsetContext, 'champions');
        assert.equal(result.metadataConflicts.length, 0);
        assert.ok(rows(result).every(row => row.moveLegality.every(m => m.verification_status === 'known')));
      }
    }
  }
});

test('conflicting duplicate headers fail closed in either order for every snapshot', () => {
  for (const pair of [
    [historical, champions], [champions, '|tier|Unknown'],
    [champions, '|tier|[Gen 9 Champions] VGC 2026 Reg M-A'],
    ['|gametype|doubles', '|gametype|singles']
  ]) {
    for (const headers of [pair, pair.slice().reverse()]) {
      const result = parse(harness(), headers);
      assert.equal(result.format, headers[0].split('|')[2]);
      assert.equal(result.learnsetContext, '');
      assert.ok(result.metadataConflicts.some(w => w.includes('conflicting')));
      assert.ok(result.warnings.some(w => w.includes('Replay learnset context unchecked:')));
      unchecked(result, 'learnset_context_unavailable');
    }
  }
});

test('tier/gameType contradictions fail closed in either header order', () => {
  for (const [tier, gameType] of [[champions, 'singles'], ['|tier|[Gen 9 Champions] BSS Reg M-B', 'doubles'], [historical, 'singles']]) {
    const pair = [tier, '|gametype|' + gameType];
    for (const headers of [pair, pair.slice().reverse()]) {
      const result = parse(harness(), headers);
      assert.ok(result.metadataConflicts.includes('tier and gametype disagree'));
      unchecked(result, 'learnset_context_unavailable');
    }
  }
});

test('identical early duplicates are consistent but late headers invalidate all snapshots', () => {
  assert.equal(parse(harness(), [champions, champions, '|gametype|doubles', '|gametype|doubles']).learnsetContext, 'champions');
  for (const early of [[], [historical], [champions]]) {
    for (const late of [champions, '|gametype|doubles']) {
      const result = harness().parseShowdownLog([
        ...early, '|switch|p1a: Pikachu|Pikachu, L50|100/100',
        '|turn|1', '|move|p1a: Pikachu|Surf|p1a: Pikachu',
        '|turn|2', late, '|move|p1a: Pikachu|Thunderbolt|p1a: Pikachu'
      ].join('\n'));
      assert.equal(result.format, (early[0] || late).split('|')[2]);
      assert.ok(result.metadataConflicts.some(w => w.startsWith('late ')));
      unchecked(result, 'learnset_context_unavailable');
    }
  }
});

test('unlisted Champions names and free-text variants remain unchecked', () => {
  for (const tier of [
    '[Gen 9 Champions] VGC 2026 Reg M-C',
    '[Gen 9 Champions] BSS Reg M-B (Bo3)',
    '[Gen 9 Champions] VGC 2026 Reg M-B Bo3',
    'Unofficial [Gen 9 Champions] VGC 2026 Reg M-B (Bo3)'
  ]) unchecked(parse(harness(), ['|tier|' + tier]), 'learnset_context_unavailable');
});

test('explicit generation must agree with the tier, independent of header order', () => {
  for (const tier of [champions, historical, '|tier|[Gen 9 Champions] BSS Reg M-B']) {
    for (const headers of [
      ['|gen|8', tier], [tier, '|gen|8'],
      ['|gen|8', '|gen|9', tier], ['|gen|9', '|gen|8', tier]
    ]) {
      const result = parse(harness(), headers);
      assert.equal(result.format, tier.split('|')[2]);
      assert.ok(result.metadataConflicts.some(w => /gen/.test(w)));
      assert.ok(result.warnings.some(w => /context unchecked.*gen/.test(w)));
      unchecked(result, 'learnset_context_unavailable');
    }
  }
});

test('malformed and late generation headers invalidate all snapshots', () => {
  for (const header of ['|gen|', '|gen', '|gen|nine', '|gen|9x', '|gen|9.0', '|gen|09', '|gen|-9', '|gen|9|8']) {
    for (const headers of [[header, champions], [champions, header, '|gen|9']]) {
      const result = parse(harness(), headers);
      assert.ok(result.metadataConflicts.includes('malformed gen header'), header);
      unchecked(result, 'learnset_context_unavailable');
    }
  }
  for (const header of ['|gen|9', '|gen|8', '|gen|invalid']) {
    const result = harness().parseShowdownLog([
      champions, '|gen|9', '|switch|p1a: Pikachu|Pikachu, L50|100/100',
      '|turn|1', '|move|p1a: Pikachu|Surf|p1a: Pikachu',
      '|turn|2', header, '|move|p1a: Pikachu|Thunderbolt|p1a: Pikachu'
    ].join('\n'));
    assert.ok(result.metadataConflicts.includes('late gen header'));
    unchecked(result, 'learnset_context_unavailable');
  }
});

test('missing generation and consistent early Gen 9 headers retain compatibility', () => {
  for (const tier of [champions, historical]) {
    for (const headers of [[tier], ['|gen|9', tier], [tier, '|gen|9', '|gen|9']]) {
      const result = parse(harness(), headers);
      assert.equal(result.format, tier.split('|')[2]);
      assert.equal(result.learnsetContext, tier === champions ? 'champions' : 'historical');
      assert.equal(result.metadataConflicts.length, 0);
      assert.ok(rows(result).every(row => row.moveLegality.every(m => m.verification_status === 'known')));
    }
  }
});

console.log(count + ' replay learnset context groups passed');
