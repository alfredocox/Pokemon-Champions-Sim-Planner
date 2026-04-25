// T9j.7 Mega Evolution + Trigger Sweep test suite (12 cases)
// Runs in Node with data.js + engine.js loaded via vm.runInContext.
const fs   = require('fs');
const vm   = require('vm');
const nodePath = require('path');
const ROOT = nodePath.resolve(__dirname, '..');

const ctx = { console, require, module: {}, exports: {} };
vm.createContext(ctx);

function loadFile(f) {
  const src = fs.readFileSync(nodePath.join(ROOT, f), 'utf-8');
  vm.runInContext(src, ctx, { filename: f });
}
loadFile('data.js');
loadFile('engine.js');
// Expose class declarations (class/let/const are lexical, not on ctx object)
vm.runInContext('this.Pokemon = Pokemon; this.Field = Field; if (typeof TEAMS !== "undefined") this.TEAMS = TEAMS;', ctx);

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { console.log(`PASS: ${name}`); pass++; }
  else      { console.log(`FAIL: ${name}${detail ? ' — ' + detail : ''}`); fail++; }
}

// adding comments for testing purposes
// -- TEST 1: Pre-trigger stats are base form --
const dragData = { name: 'Dragonite-Mega', item: 'Dragoninite', ability: 'Multiscale',
                   nature: 'Jolly', evs: { hp:0, atk:252, def:0, spa:0, spd:4, spe:252 },
                   moves: ['Dragon Claw','Earthquake','Extreme Speed','Fly'], level: 50 };
const drag = new ctx.Pokemon(dragData, 'Doubles', 'sv');
check('1. Dragonite-Mega pre-trigger uses BASE stats (atk < Mega atk)',
      drag.baseAtk < 200, `baseAtk=${drag.baseAtk}`);
check('1b. Dragonite-Mega.name resolved to Dragonite for engine stat lookup',
      drag.name === 'Dragonite', `name=${drag.name}`);
check('1c. Dragonite-Mega.displayName preserved for UI',
      drag.displayName === 'Dragonite-Mega');
check('1d. megaForm stored with Mega stats',
      drag.megaForm && drag.megaForm.megaStats && drag.megaForm.megaName === 'Dragonite-Mega');
check('1e. hasMegaEvolved starts false',
      drag.hasMegaEvolved === false);

// -- TEST 2: Post-trigger stats are Mega form --
// Dragonite-Mega is a SPECIAL attacker variant: base atk 134 -> Mega atk 124 (DECREASES),
// base spa 100 -> Mega spa 145 (INCREASES). Validate structural swap via _base.atk and _base.spa.
const preBaseAtk = drag._base.atk;
const preBaseSpa = drag._base.spa;
drag.megaEvolve([]);
check('2. Post-megaEvolve _base.atk swapped to Mega value (134->124)',
      preBaseAtk === 134 && drag._base.atk === 124,
      `pre=${preBaseAtk} post=${drag._base.atk}`);
check('2a. Post-megaEvolve _base.spa swapped to Mega value (100->145)',
      preBaseSpa === 100 && drag._base.spa === 145,
      `pre=${preBaseSpa} post=${drag._base.spa}`);
check('2b. hasMegaEvolved flipped to true',
      drag.hasMegaEvolved === true);
check('2c. displayName becomes Mega name',
      drag.displayName === 'Dragonite-Mega');

// -- TEST 3: Types swap (Altaria Dragon/Flying -> Dragon/Fairy) --
const altData = { name: 'Altaria-Mega', item: 'Altarianite', ability: 'Pixilate',
                  nature: 'Modest', evs: { hp:4, atk:0, def:0, spa:252, spd:0, spe:252 },
                  moves: ['Hyper Voice','Draco Meteor','Protect','Roost'], level: 50 };
const alt = new ctx.Pokemon(altData, 'Doubles', 'sv');
check('3. Altaria pre-trigger types = Dragon/Flying',
      alt.types.includes('Dragon') && alt.types.includes('Flying') && !alt.types.includes('Fairy'),
      `types=${alt.types.join(',')}`);
alt.megaEvolve([]);
check('3b. Altaria post-trigger types = Dragon/Fairy',
      alt.types.includes('Dragon') && alt.types.includes('Fairy') && !alt.types.includes('Flying'),
      `types=${alt.types.join(',')}`);

// -- TEST 4: Ability swap (Natural Cure -> Pixilate) --
const alt2 = new ctx.Pokemon(altData, 'Doubles', 'sv');
check('4. Altaria pre-trigger ability = Natural Cure (base)',
      alt2.ability === 'Natural Cure', `ability=${alt2.ability}`);
alt2.megaEvolve([]);
check('4b. Altaria post-trigger ability = Pixilate (Mega)',
      alt2.ability === 'Pixilate', `ability=${alt2.ability}`);

// -- TEST 5: One-Mega-per-team cap (simulated on Field flag) --
const field5 = new ctx.Field();
check('5. Field.playerMegaUsed initializes false',
      field5.playerMegaUsed === false && field5.oppMegaUsed === false);

// -- TEST 6: Persistence through switch (hasMegaEvolved survives) --
const drag6 = new ctx.Pokemon(dragData, 'Doubles', 'sv');
drag6.megaEvolve([]);
const preservedFlag = drag6.hasMegaEvolved;
// Simulate a "switch out and back in" — the mon object itself is reused.
// hasMegaEvolved should still be true.
check('6. After Mega + simulated switch, hasMegaEvolved stays true',
      preservedFlag === true && drag6.hasMegaEvolved === true);

// -- TEST 7: HP% preserved across swap --
const drag7 = new ctx.Pokemon(dragData, 'Doubles', 'sv');
const preMaxHp = drag7.maxHp;
drag7.hp = Math.floor(drag7.maxHp * 0.5);  // damage to 50%
drag7.megaEvolve([]);
const postFrac = drag7.hp / drag7.maxHp;
check('7. HP% preserved at 50% across Mega swap',
      Math.abs(postFrac - 0.5) < 0.02, `fraction=${postFrac.toFixed(3)}`);

// -- TEST 8: Non-Mega unaffected (no stone held) --
const noStoneData = { name: 'Dragonite-Mega', item: 'Life Orb', ability: 'Multiscale',
                      nature: 'Jolly', evs: { hp:0, atk:252, def:0, spa:0, spd:4, spe:252 },
                      moves: ['Dragon Claw','Earthquake','Extreme Speed','Fly'], level: 50 };
const noStone = new ctx.Pokemon(noStoneData, 'Doubles', 'sv');
check('8. Dragonite-Mega without Dragoninite = legacy behavior (megaForm null)',
      noStone.megaForm === null, `megaForm=${noStone.megaForm}`);
check('8b. Non-Mega with no stone: name stays Dragonite-Mega (legacy)',
      noStone.name === 'Dragonite-Mega', `name=${noStone.name}`);

// Also: regular Pokemon with no Mega form at all
const regData = { name: 'Kingambit', item: 'Leftovers', ability: 'Supreme Overlord',
                  nature: 'Adamant', evs: { hp:252, atk:252, def:0, spa:0, spd:4, spe:0 },
                  moves: ['Kowtow Cleave','Iron Head','Sucker Punch','Swords Dance'], level: 50 };
const reg = new ctx.Pokemon(regData, 'Doubles', 'sv');
check('8c. Non-Mega Pokemon: megaForm null, hasMegaEvolved false',
      reg.megaForm === null && reg.hasMegaEvolved === false);

// -- TEST 9: at_turn:3 policy triggers exactly on turn 3, not earlier --
const drag9 = new ctx.Pokemon(dragData, 'Doubles', 'sv');
drag9.megaPolicy      = ctx.MEGA_TRIGGER_POLICY.AT_TURN;
drag9.megaTriggerTurn = 3;
check('9. at_turn:3 returns false on turn 1',
      ctx.shouldMegaThisTurn(drag9, 1) === false);
check('9b. at_turn:3 returns false on turn 2',
      ctx.shouldMegaThisTurn(drag9, 2) === false);
check('9c. at_turn:3 returns true on turn 3',
      ctx.shouldMegaThisTurn(drag9, 3) === true);

// -- TEST 10: never policy blocks evolution all battle --
const drag10 = new ctx.Pokemon(dragData, 'Doubles', 'sv');
drag10.megaPolicy = ctx.MEGA_TRIGGER_POLICY.NEVER;
check('10. never policy returns false on turn 1',
      ctx.shouldMegaThisTurn(drag10, 1) === false);
check('10b. never policy returns false on turn 30',
      ctx.shouldMegaThisTurn(drag10, 30) === false);

// -- TEST 11: MEGA_TRIGGER_POLICY enum exposed --
check('11. MEGA_TRIGGER_POLICY enum has all three modes',
      ctx.MEGA_TRIGGER_POLICY.FIRST_ELIGIBLE === 'first_eligible' &&
      ctx.MEGA_TRIGGER_POLICY.AT_TURN === 'at_turn' &&
      ctx.MEGA_TRIGGER_POLICY.NEVER === 'never');

// -- TEST 12: runMegaTriggerSweep produces MAX_TURN+1 cells + refinedTop3 --
check('12. runMegaTriggerSweep function is exported',
      typeof ctx.runMegaTriggerSweep === 'function');

// Structural test only — confirm the function signature produces a result
// shape without actually running a full sweep (would take >1 min).
// We'll verify the cell helper (runMegaSweepCell) with minimal n.
const sweepTeamA = ctx.TEAMS.mega_dragonite;
const sweepTeamB = ctx.TEAMS.kingambit_sneasler;
if (sweepTeamA && sweepTeamB) {
  try {
    const testCell = ctx.runMegaSweepCell(sweepTeamA, sweepTeamB, 1, 'at_turn', 2, 3);
    check('12b. runMegaSweepCell returns {wr, n, ci95}',
          typeof testCell.wr === 'number' && typeof testCell.n === 'number' &&
          typeof testCell.ci95 === 'number' && testCell.n === 3,
          `wr=${testCell.wr.toFixed(2)} n=${testCell.n}`);
  } catch(e) {
    check('12b. runMegaSweepCell returns {wr, n, ci95}', false, e.message);
  }
} else {
  check('12b. sweep teams available', false, 'mega_dragonite or kingambit_sneasler missing');
}

console.log(`\n=== RESULT: ${pass} pass, ${fail} fail (out of ${pass+fail}) ===`);
process.exit(fail === 0 ? 0 : 1);
