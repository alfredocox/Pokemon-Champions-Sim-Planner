const sp = { hp: 32, atk: 0, def: 0, spa: 2, spd: 0, spe: 32 };
const member = (name, ability, moves) => ({ name, ability, item: '', nature: 'Hardy', level: 50, evs: { ...sp }, moves });
const team = members => ({ name: 'Synthetic reference probe', format: 'champions', members });
const action = (move, targetSlot, targetSide = 'foe') => ({ move, ...(targetSlot === undefined ? {} : { targetSlot, targetSide }) });
const protect = () => action('Protect');

export function referenceProbes() {
  const player = team([
    member('Whimsicott', 'Prankster', ['Protect', 'Tailwind', 'Trick Room', 'Moonblast']),
    member('Blastoise', 'Torrent', ['Protect', 'Water Pulse']),
    member('Snorlax', 'Immunity', ['Protect']), member('Dragonite', 'Inner Focus', ['Protect'])
  ]);
  const opponent = team([
    member('Arcanine', 'Flash Fire', ['Protect', 'Flamethrower', 'Extreme Speed', 'Leer']),
    member('Venusaur', 'Overgrow', ['Protect', 'Growl']),
    member('Gengar', 'Cursed Body', ['Protect']), member('Pikachu', 'Static', ['Protect'])
  ]);
  const make = (id, turns, compareExactHP = false) => ({ id, formatId: 'gen9championsdoublescustomgame',
    synthetic: true, seed: [123, 456, 789, 42], player: structuredClone(player), opponent: structuredClone(opponent), turns, compareExactHP });
  const protectedMoves = make('protect-before-damage', [{ player: [action('Moonblast', 0), action('Water Pulse', 1)], opponent: [protect(), protect()] }], true);
  const tailwind = make('tailwind-midturn-speed', [{ player: [action('Tailwind'), action('Water Pulse', 0)], opponent: [action('Flamethrower', 0), protect()] }]);
  const trickRoom = make('trick-room-priority-brackets', [
    { player: [action('Trick Room'), protect()], opponent: [protect(), protect()] },
    { player: [action('Moonblast', 0), action('Water Pulse', 1)], opponent: [action('Extreme Speed', 0), protect()] }
  ]);
  const fixed = make('seismic-toss-fixed-damage', [{ player: [action('Seismic Toss', 0), protect()], opponent: [action('Leer'), protect()] }], true);
  fixed.player.members[0] = member('Machamp', 'Guts', ['Seismic Toss']);
  fixed.compareBoosts = true;
  const spread = make('earthquake-flying-ally', [{ player: [action('Earthquake'), action('Growl')], opponent: [action('Leer'), action('Growl')] }]);
  spread.player.members[0] = member('Garchomp', 'Sand Veil', ['Earthquake']);
  spread.player.members[1] = member('Charizard', 'Blaze', ['Growl']);
  spread.compareBoosts = true;
  spread.hpChange = { player: [0, 0, 0, 0], opponent: [-1, -1, 0, 0] };
  const ppDrain = make('eerie-spell-spite-pp-drain', [{
    player: [action('Eerie Spell', 0), action('Spite', 1)],
    opponent: [action('Psychic', 0), action('Thunderbolt', 1)]
  }]);
  ppDrain.player.members[0] = member('Slowbro', 'Own Tempo', ['Eerie Spell']);
  ppDrain.player.members[1] = member('Dusclops', 'Pressure', ['Spite']);
  ppDrain.opponent.members[0] = member('Alakazam', 'Synchronize', ['Psychic']);
  ppDrain.opponent.members[1] = member('Jolteon', 'Volt Absorb', ['Thunderbolt']);
  ppDrain.comparePP = true;
  return [protectedMoves, tailwind, trickRoom, fixed, spread, ppDrain];
}

export function completedGameProbes() {
  const player = team([
    member('Machamp', 'Guts', ['Seismic Toss']),
    member('Hariyama', 'Thick Fat', ['Seismic Toss']),
    member('Dragonite', 'Inner Focus', ['Protect']),
    member('Gengar', 'Cursed Body', ['Protect'])
  ]);
  const opponent = team([
    member('Abra', 'Synchronize', ['Growl']),
    member('Pichu', 'Static', ['Leer']),
    member('Diglett', 'Sand Veil', ['Growl']),
    member('Pikachu', 'Static', ['Leer'])
  ]);
  const turns = Array.from({ length: 12 }, () => ({
    player: [action('Seismic Toss', 0), action('Seismic Toss', 1)],
    opponent: [action('Growl'), action('Leer')]
  }));
  return [{
    id: 'complete-game-fixed-damage-replacements',
    formatId: 'gen9championsdoublescustomgame',
    synthetic: true,
    completeGame: true,
    compareExactHP: true,
    compareBoosts: true,
    comparePP: true,
    seed: [901, 902, 903, 904],
    player,
    opponent,
    turns
  }];
}
