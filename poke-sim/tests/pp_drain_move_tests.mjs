import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const context = vm.createContext({ console });
for (const file of ['data.js', 'generated/pokemon_showdown_legal_data.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}
vm.runInContext('this.Pokemon = Pokemon; this.Field = Field; this.simulateBattle = simulateBattle; this.drainMovePP = _drainMovePP;', context);

const member = (name, moves, extra = {}) => ({
  name,
  ability: extra.ability || '',
  item: extra.item || '',
  nature: extra.nature || 'Hardy',
  level: 50,
  moves,
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
});
const team = (name, members) => ({ name, format: 'champions', legality_status: 'legal', members });

test('shared PP drain clamps at zero and records exact before/after evidence', () => {
  const target = new context.Pokemon(member('Alakazam', ['Psychic']), '', 'champions');
  const field = new context.Field({ format: 'doubles' });
  target.side = field.oppSide;
  target.movePP.Psychic.current = 2;
  const log = [];

  assert.equal(context.drainMovePP(target, 'Psychic', 4, 'Spite', field, log), 2);
  assert.equal(target.movePP.Psychic.current, 0);
  assert.match(log[0], /lost 2 PP because of Spite/);
  const event = field._ctx.turnEffectEvents[0];
  assert.equal(event.effect_kind, 'pp-drain');
  assert.equal(event.drained_move, 'Psychic');
  assert.equal(event.pp_before, 2);
  assert.equal(event.pp_after, 0);
  assert.equal(event.pp_requested, 4);
  assert.equal(event.pp_drained, 2);
  assert.equal(context.drainMovePP(target, 'Psychic', 4, 'Spite', field, log), 0);
});

test('Spite fails before a slower target has used a move', () => {
  const battle = context.simulateBattle(
    team('Spite first', [member('Gengar', ['Spite']), member('Blissey', ['Protect'])]),
    team('No history', [member('Snorlax', ['Tackle']), member('Dragonite', ['Protect'])]),
    {
      format: 'doubles', maxTurns: 1, seed: [11, 12, 13, 14],
      forcedActions: [
        { turn: 1, side: 'player', slot: 0, move: 'Spite', targetSide: 'enemy', targetSlot: 0 },
        { turn: 1, side: 'player', slot: 1, move: 'Protect' },
        { turn: 1, side: 'opponent', slot: 0, move: 'Tackle', targetSide: 'enemy', targetSlot: 0 },
        { turn: 1, side: 'opponent', slot: 1, move: 'Protect' }
      ]
    }
  );
  assert.ok(battle.log.some(line => String(line).includes('Gengar used Spite! But it failed!')));
  assert.equal(battle.turnLog[0].effect_events.filter(event => event.effect_kind === 'pp-drain').length, 0);
});

test('Protect prevents Spite from draining the protected move', () => {
  const battle = context.simulateBattle(
    team('Spite into Protect', [member('Gengar', ['Spite']), member('Blissey', ['Protect'])]),
    team('Protected history', [member('Snorlax', ['Protect']), member('Dragonite', ['Protect'])]),
    {
      format: 'doubles', maxTurns: 1, seed: [21, 22, 23, 24],
      forcedActions: [
        { turn: 1, side: 'player', slot: 0, move: 'Spite', targetSide: 'enemy', targetSlot: 0 },
        { turn: 1, side: 'player', slot: 1, move: 'Protect' },
        { turn: 1, side: 'opponent', slot: 0, move: 'Protect' },
        { turn: 1, side: 'opponent', slot: 1, move: 'Protect' }
      ]
    }
  );
  const target = battle.turnLog[0].post.roster.opponent[0];
  assert.equal(target.move_pp.Protect.current, target.move_pp.Protect.max - 1);
  assert.equal(battle.turnLog[0].effect_events.filter(event => event.effect_kind === 'pp-drain').length, 0);
});

test('Spite bypasses Substitute after the target acts on the next turn', () => {
  const battle = context.simulateBattle(
    team('Spite into Substitute', [member('Dusclops', ['Protect', 'Spite']), member('Blissey', ['Protect'])]),
    team('Substitute history', [member('Pikachu', ['Substitute', 'Tackle']), member('Snorlax', ['Protect'])]),
    {
      format: 'doubles', maxTurns: 2, seed: [31, 32, 33, 34],
      forcedActions: [
        { turn: 1, side: 'player', slot: 0, move: 'Protect' },
        { turn: 1, side: 'player', slot: 1, move: 'Protect' },
        { turn: 1, side: 'opponent', slot: 0, move: 'Substitute' },
        { turn: 1, side: 'opponent', slot: 1, move: 'Protect' },
        { turn: 2, side: 'player', slot: 0, move: 'Spite', targetSide: 'enemy', targetSlot: 0 },
        { turn: 2, side: 'player', slot: 1, move: 'Protect' },
        { turn: 2, side: 'opponent', slot: 0, move: 'Tackle', targetSide: 'enemy', targetSlot: 0 },
        { turn: 2, side: 'opponent', slot: 1, move: 'Protect' }
      ]
    }
  );
  assert.ok(!battle.log.some(line => String(line).includes('failed because of Substitute')));
  assert.equal(battle.turnLog[1].effect_events.filter(event => event.effect_kind === 'pp-drain').length, 1);
  const target = battle.turnLog[1].post.roster.opponent[0];
  assert.equal(target.move_pp.Tackle.current, target.move_pp.Tackle.max - 5);
});
