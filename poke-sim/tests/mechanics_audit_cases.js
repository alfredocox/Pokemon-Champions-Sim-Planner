const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function team(members) {
  return { name: 'Audit', format: 'vgc', legality_status: 'legal', members };
}

function mon(name, move, extra) {
  const overrides = Object.assign({}, extra || {});
  const base = {
    name,
    item: '',
    ability: '',
    nature: 'Serious',
    level: 50,
    moves: [move],
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  };
  const mergedEvs = Object.assign({}, base.evs, overrides.evs || {});
  ['atk', 'def', 'spa', 'spd', 'spe'].forEach(function(stat) {
    if (Object.prototype.hasOwnProperty.call(overrides, stat)) {
      mergedEvs[stat] = overrides[stat];
      delete overrides[stat];
    }
  });
  base.evs = mergedEvs;
  return Object.assign(base, overrides);
}

function battleLog(battle) {
  return Array.isArray(battle && battle.log) ? battle.log.map(String) : [];
}

function hasLine(battle, needle) {
  return battleLog(battle).some(line => line.includes(needle));
}

function expectLine(battle, needle, message) {
  if (!hasLine(battle, needle)) {
    throw new Error(message || `missing log line: ${needle}`);
  }
}

function simulate(simulateBattle, playerMembers, oppMembers, opts) {
  return simulateBattle(team(playerMembers), team(oppMembers), Object.assign({
    format: 'doubles',
    seed: [1, 3, 5, 7],
    maxTurns: 1
  }, opts || {}));
}

const CASES = [
  {
    name: 'Protect chains on consecutive use',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Cresselia', 'Protect')
      ], [
        mon('Incineroar', 'Tackle')
      ], { maxTurns: 2, seed: [1, 3, 5, 7] });
      expectLine(battle, 'Cresselia used Protect!', 'first Protect should resolve');
      expectLine(battle, 'Cresselia used Protect! But it failed!', 'second Protect should fail');
    }
  },
  {
    name: 'Taunt blocks status moves',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Whimsicott', 'Taunt', { ability: 'Prankster' })
      ], [
        mon('Cofagrigus', 'Haze')
      ], { maxTurns: 2, seed: [7, 8, 9, 10] });
      expectLine(battle, 'fell for the Taunt!', 'Taunt infliction missing');
      expectLine(battle, 'used Haze! But it failed because of Taunt!', 'Taunt should block Haze');
    }
  },
  {
    name: 'Support uses turn-one utility',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Whimsicott', 'Tailwind', { spa: 252, spe: 252, moves: ['Tailwind', 'Moonblast'] }),
        mon('Garchomp', 'Dragon Claw', { atk: 252, spe: 252 }),
        mon('Incineroar', 'Tackle', { atk: 252 }),
        mon('Amoonguss', 'Spore')
      ], [
        mon('Incineroar', 'Tackle', { atk: 252 }),
        mon('Cresselia', 'Tackle')
      ], { maxTurns: 1, seed: [11, 12, 13, 14] });
      expectLine(battle, 'Whimsicott used Tailwind!', 'Support role should choose turn-one utility');
    }
  },
  {
    name: 'Sucker Punch fails against status intent',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Absol', 'Sucker Punch', { ability: 'Super Luck' })
      ], [
        mon('Cofagrigus', 'Haze')
      ], { maxTurns: 1, seed: [3, 4, 5, 6] });
      expectLine(battle, 'used Sucker Punch! But it failed!', 'Sucker Punch should fail on status');
    }
  },
  {
    name: 'Feint breaks through Protect and Quick Guard',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Gallade', 'Feint', { ability: 'Sharpness' })
      ], [
        mon('Whimsicott', 'Quick Guard', { ability: 'Prankster' }),
        mon('Smeargle', 'Protect')
      ], { maxTurns: 1, seed: [21, 22, 23, 24] });
      expectLine(battle, 'used Feint!', 'Feint should resolve');
      expectLine(battle, 'broke through', 'Feint should break protection');
      expectLine(battle, 'used Quick Guard!', 'Quick Guard setup missing');
    }
  },
  {
    name: 'Recover restores half HP',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Latias', 'Recover', { hp: 60, spa: 252, spe: 252 })
      ], [
        mon('Incineroar', 'Tackle', { atk: 252 })
      ], { maxTurns: 1, seed: [31, 32, 33, 34] });
      expectLine(battle, 'regained health with Recover!', 'Recover should heal the user');
    }
  },
  {
    name: 'Rest heals fully and puts the user to sleep',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Snorlax', 'Rest', { hp: 80, atk: 252, def: 252 })
      ], [
        mon('Incineroar', 'Tackle', { atk: 252 })
      ], { maxTurns: 2, seed: [41, 42, 43, 44] });
      expectLine(battle, 'went to sleep with Rest!', 'Rest should put the user to sleep');
      expectLine(battle, 'is fast asleep!', 'Rest sleep should persist into the next turn');
    }
  },
  {
    name: 'Sleep Talk calls a move while asleep',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Snorlax', 'Sleep Talk', { hp: 120, status: 'sleep', statusTurns: 2, sleepTurns: 0, moves: ['Sleep Talk', 'Recover'] })
      ], [
        mon('Incineroar', 'Tackle', { atk: 252 })
      ], { maxTurns: 1, seed: [51, 52, 53, 54] });
      expectLine(battle, 'used Sleep Talk!', 'Sleep Talk should resolve while asleep');
      expectLine(battle, 'regained health with Recover!', 'Sleep Talk should call Recover from the move pool');
    }
  },
  {
    name: 'Substitute absorbs contact damage',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Whimsicott', 'Substitute', { hp: 140, spe: 252 })
      ], [
        mon('Incineroar', 'Flare Blitz', { atk: 252 })
      ], { maxTurns: 1, seed: [61, 62, 63, 64] });
      expectLine(battle, 'made a Substitute!', 'Substitute should be created');
      expectLine(battle, 'Substitute was destroyed!', 'Substitute should absorb the hit and break');
    }
  },
  {
    name: 'Imprison blocks shared moves',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Whimsicott', 'Imprison', { spe: 252, moves: ['Imprison', 'Tackle'] }),
        mon('Amoonguss', 'Tackle', { spe: 0 })
      ], [
        mon('Incineroar', 'Tackle', { spe: 0 }),
        mon('Incineroar2', 'Tackle', { spe: 0 })
      ], { maxTurns: 1, seed: [71, 72, 73, 74] });
      expectLine(battle, 'sealed away its foes\' moves with Imprison!', 'Imprison should set the lock');
      expectLine(battle, 'used Tackle! But it failed because of Imprison!', 'Tackle should be blocked');
    }
  },
  {
    name: 'Ally Switch swaps the active order',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Indeedee', 'Ally Switch', { spe: 252 }),
        mon('Arcanine', 'Tackle', { spe: 0 })
      ], [
        mon('Incineroar', 'Tackle', { spe: 0 }),
        mon('Incineroar2', 'Tackle', { spe: 0 })
      ], { maxTurns: 1, seed: [81, 82, 83, 84] });
      expectLine(battle, 'switched places with its ally using Ally Switch!', 'Ally Switch should resolve');
      const pre = battle.turnLog && battle.turnLog[0] && battle.turnLog[0].pre && battle.turnLog[0].pre.active;
      const post = battle.turnLog && battle.turnLog[0] && battle.turnLog[0].post && battle.turnLog[0].post.active;
      if (!pre || !post || !Array.isArray(pre.player) || !Array.isArray(post.player) || pre.player.length < 2 || post.player.length < 2) {
        throw new Error('Ally Switch should expose pre/post active order');
      }
      if (pre.player[0] !== post.player[1] || pre.player[1] !== post.player[0]) {
        throw new Error('Ally Switch should swap the player active order');
      }
    }
  },
  {
    name: "King's Shield drops Attack on contact",
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Aegislash', "King's Shield")
      ], [
        mon('Incineroar', 'Tackle')
      ], { maxTurns: 1, seed: [2, 4, 6, 8] });
      expectLine(battle, "used King's Shield!", "King's Shield should resolve");
      expectLine(battle, "Attack fell due to King's Shield", "contact rider should lower Attack");
    }
  },
  {
    name: 'Spiky Shield damages contact attackers',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Chesnaught', 'Spiky Shield')
      ], [
        mon('Incineroar', 'Tackle')
      ], { maxTurns: 1, seed: [3, 5, 7, 9] });
      expectLine(battle, 'used Spiky Shield!', 'Spiky Shield should resolve');
      expectLine(battle, 'hurt by Spiky Shield', 'contact rider should damage attacker');
    }
  },
  {
    name: 'Baneful Bunker poisons contact attackers',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Toxapex', 'Baneful Bunker')
      ], [
        mon('Incineroar', 'Tackle')
      ], { maxTurns: 1, seed: [4, 6, 8, 10] });
      expectLine(battle, 'used Baneful Bunker!', 'Baneful Bunker should resolve');
      expectLine(battle, 'was poisoned by Baneful Bunker', 'contact rider should poison attacker');
    }
  },
  {
    name: 'Obstruct harshly lowers Defense on contact',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Grimmsnarl', 'Obstruct')
      ], [
        mon('Incineroar', 'Tackle')
      ], { maxTurns: 1, seed: [5, 7, 9, 11] });
      expectLine(battle, 'used Obstruct!', 'Obstruct should resolve');
      expectLine(battle, 'Defense harshly fell due to Obstruct', 'contact rider should lower Defense');
    }
  },
  {
    name: 'Mega weather abilities trigger before Aurora Veil',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Froslass-Mega', 'Aurora Veil', {
          item: 'Froslassite',
          ability: 'Snow Warning',
          nature: 'Timid',
          role: 'Support',
          moves: ['Aurora Veil', 'Blizzard', 'Shadow Ball', 'Protect'],
          evs: { hp: 2, atk: 0, def: 0, spa: 32, spd: 0, spe: 32 }
        })
      ], [
        mon('Incineroar', 'Tackle', { atk: 252 })
      ], { maxTurns: 1, seed: [6, 8, 10, 12] });
      expectLine(battle, 'Mega Evolved!', 'Mega evolution should resolve first');
      expectLine(battle, 'summoned snow!', 'Snow Warning should trigger on Mega evolution');
      expectLine(battle, 'used Aurora Veil!', 'Aurora Veil should be selected');
      if (hasLine(battle, 'used Aurora Veil! But it failed')) {
        throw new Error('Aurora Veil should not fail once snow is active');
      }
    }
  },
  {
    name: 'Taunt bypasses Substitute',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Whimsicott', 'Substitute', { hp: 140, spe: 252 })
      ], [
        mon('Whimsicott', 'Taunt', { spe: 0 })
      ], { maxTurns: 1, seed: [13, 15, 17, 19] });
      expectLine(battle, 'made a Substitute!', 'Substitute should be created');
      expectLine(battle, 'fell for the Taunt!', 'Taunt should bypass Substitute');
    }
  },
  {
    name: 'Sleep Talk bypasses Imprisoned moves',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Snorlax', 'Sleep Talk', {
          hp: 120,
          status: 'sleep',
          statusTurns: 2,
          sleepTurns: 0,
          moves: ['Sleep Talk', 'Recover']
        })
      ], [
        mon('Whimsicott', 'Imprison', { spe: 252, moves: ['Imprison', 'Recover'] })
      ], { maxTurns: 1, seed: [23, 25, 27, 29] });
      expectLine(battle, 'sealed away its foes\' moves with Imprison!', 'Imprison should resolve');
      expectLine(battle, 'used Sleep Talk!', 'Sleep Talk should still execute');
      expectLine(battle, 'regained health with Recover!', 'Sleep Talk should bypass Imprison for Recover');
    }
  },
  {
    name: 'Ally Switch retargets the current slot occupant',
    run(simulateBattle) {
      const battle = simulate(simulateBattle, [
        mon('Indeedee', 'Ally Switch', { spe: 252 }),
        mon('Arcanine', 'Tackle', { spe: 0 })
      ], [
        mon('Incineroar', 'Tackle', { spe: 0 }),
        mon('Incineroar2', 'Tackle', { spe: 0 })
      ], { maxTurns: 1, seed: [31, 33, 35, 37] });
      expectLine(battle, 'switched places with its ally using Ally Switch!', 'Ally Switch should resolve');
      expectLine(battle, '→ Arcanine', 'later attack should hit the new slot occupant');
      const pre = battle.turnLog && battle.turnLog[0] && battle.turnLog[0].pre && battle.turnLog[0].pre.active;
      const post = battle.turnLog && battle.turnLog[0] && battle.turnLog[0].post && battle.turnLog[0].post.active;
      if (!pre || !post || !Array.isArray(pre.player) || !Array.isArray(post.player) || pre.player.length < 2 || post.player.length < 2) {
        throw new Error('Ally Switch should expose pre/post active order');
      }
      if (pre.player[0] !== post.player[1] || pre.player[1] !== post.player[0]) {
        throw new Error('Ally Switch should swap the player active order');
      }
    }
  },
  {
    name: 'Roost source wiring grounds the user temporarily',
    run() {
      const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
      if (!/attacker\.roosting = true;[\s\S]*attacker\.flying = attacker\.ability === 'Levitate';/.test(src)) {
        throw new Error('Roost grounding wiring missing');
      }
      if (!/mon\.roosting = false;[\s\S]*mon\.flying = mon\.types\.includes\('Flying'\) \|\| mon\.ability === 'Levitate';/.test(src)) {
        throw new Error('Roost cleanup wiring missing');
      }
    }
  }
];

function runMechanicsAudit(simulateBattle, opts) {
  if (typeof simulateBattle !== 'function') throw new Error('simulateBattle function is required');
  const selected = (opts && Array.isArray(opts.cases) && opts.cases.length) ? opts.cases : CASES;
  const label = (opts && opts.label) || 'Mechanics audit';
  const results = [];

  console.log(`\n=== ${label} ===\n`);
  let pass = 0;
  let fail = 0;
  for (let i = 0; i < selected.length; i++) {
    const c = selected[i];
    try {
      c.run(simulateBattle);
      console.log(`  PASS ${i + 1}. ${c.name}`);
      results.push({ name: c.name, pass: true });
      pass++;
    } catch (err) {
      console.log(`  FAIL ${i + 1}. ${c.name} - ${err.message}`);
      results.push({ name: c.name, pass: false, error: err.message });
      fail++;
    }
  }
  console.log(`\n${label}: ${pass} pass, ${fail} fail\n`);
  if (fail > 0) {
    const failed = results.filter(r => !r.pass).map(r => `- ${r.name}: ${r.error}`).join('\n');
    const error = new Error(`${label} failed:\n${failed}`);
    error.results = results;
    throw error;
  }
  return { pass, fail, results };
}

function runMechanicsSmoke(simulateBattle) {
  return runMechanicsAudit(simulateBattle, {
    label: 'Mechanics smoke',
    cases: [
      CASES[0],
      CASES[1],
      CASES[4],
      CASES[7],
      CASES[8],
      CASES[15],
      CASES[16],
      CASES[17],
      CASES[18],
      CASES[19]
    ]
  });
}

module.exports = {
  CASES,
  runMechanicsAudit,
  runMechanicsSmoke,
  team,
  mon,
  hasLine
};
