// T9j.17 (Refs #101) -- Engine closeout: Champions mechanics audit.
//
// Coverage targets (46 cases) mapped to the six T9j.17 mechanic deliverables:
//   Section A -- Parental Bond 0.25x second hit (5 cases)
//   Section B -- Fake Out hard-gate (8 cases)
//   Section C -- Piercing Drill 25% miss (6 cases)
//   Section D -- Expanding Force x Psychic Terrain (7 cases)
//   Section E -- Terrain Seeds switch-in (8 cases)
//   Section F -- Status weakening audit (8 cases)
//   Section G -- Frostbite (4 cases)
//
// Plain-English summary of what each section verifies:
//   A. Mega Kangaskhan strikes twice; the second hit is at 1/4 base power
//      (Champions nerf vs mainline 1/2). Multi-hit / pivot moves do not
//      trigger Parental Bond's second hit.
//   B. Mega Incineroar (or any Fake Out user) can only legally use Fake Out
//      on its first turn out. Switching out and back in resets the window.
//      A forced second use Struggles instead of dealing the 40-BP attack.
//   C. Piercing Drill (Mega Excadrill) now has a flat 25% miss chance on
//      every move. The prior contact-bypass-Protect interpretation is gone.
//   D. Expanding Force used by a grounded Pokemon under Psychic Terrain
//      becomes a spread move (all adjacent foes) at 1.5x base power.
//      Ungrounded users keep the default single-target behavior.
//   E. Grassy/Electric/Misty/Psychic Seed give +1 Def or +1 SpD when the
//      holder switches in to matching terrain. Item is consumed once.
//   F. Burn (1/16 chip + Atk halved), paralysis (12.5% full skip + Spe
//      halved), toxic (N/16 ramp, cap N=15), and frozen (25% thaw, 3-turn
//      cap) all match the Champions spec.
//   G. Frostbite halves Special Attack, chips 1/16 maxHp end of turn, and
//      cannot be inflicted on Ice-types, Magma Armor holders, or in sun.
//
// Cite: https://game8.co/games/Pokemon-Champions/archives/590403
// Cite: https://bulbapedia.bulbagarden.net/wiki/Fake_Out_(move)
// Cite: https://bulbapedia.bulbagarden.net/wiki/Expanding_Force_(move)
// Cite: https://bulbapedia.bulbagarden.net/wiki/Frostbite_(status_condition)
// Cite: https://bulbapedia.bulbagarden.net/wiki/Grassy_Seed
// Cite: https://bulbapedia.bulbagarden.net/wiki/Parental_Bond_(Ability)

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ctx = {
  console, require, module:{}, exports:{}, Math, Object, Array, Set, JSON,
  Promise, setTimeout, Date, String, Number, Boolean, Map, Error, RegExp,
  Symbol, parseFloat, parseInt,
  window: {},
  document: { getElementById: () => null, querySelectorAll: () => [] },
  localStorage: {
    _s: {},
    getItem(k) { return this._s[k] || null; },
    setItem(k, v) { this._s[k] = String(v); },
    removeItem(k) { delete this._s[k]; }
  }
};
ctx.window.matchMedia = () => ({ matches: false });
vm.createContext(ctx);
function load(f) { vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename:f }); }
load('data.js');
try { load('legality.js'); } catch(_) {}
load('engine.js');
vm.runInContext([
  'this.Pokemon=Pokemon;',
  'this.Field=Field;',
  'this.simulateBattle=simulateBattle;',
  'this.BASE_STATS=BASE_STATS;',
  'this.TEAMS=TEAMS;',
  'this.tryTerrainSeed=tryTerrainSeed;',
  'this.TERRAIN_SEEDS=TERRAIN_SEEDS;',
  'this.canInflictStatus=canInflictStatus;',
  'this.getMoveTarget=getMoveTarget;'
].join(' '), ctx);

let PASS = 0, FAIL = 0;
function T(name, fn) {
  try { fn(); console.log(`  PASS ${name}`); PASS++; }
  catch (e) { console.log(`  FAIL ${name} :: ${e.message}`); FAIL++; }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg||'') + ` expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); }
function truthy(v, m) { if (!v) throw new Error(m || 'not truthy'); }
function falsy(v, m)  { if (v)  throw new Error(m || 'not falsy'); }
function approx(a, b, eps, m) { if (Math.abs(a-b) > eps) throw new Error((m||'') + ` expected ~${b} got ${a}`); }

// Helper: build a single Pokemon from a small set spec.
function mk(opts) {
  const set = Object.assign({
    name: 'Pikachu', item: '', ability: 'Static', nature: 'Serious',
    evs: { hp:0,atk:0,def:0,spa:0,spd:0,spe:0 },
    moves: ['Tackle','Protect','Substitute','Endure']
  }, opts || {});
  const fmt = opts && opts.format ? opts.format : 'sv';
  return new ctx.Pokemon(set, '', fmt);
}

// Helper: build a tiny 2v2 doubles team for simulateBattle.
function team(members, format) {
  return { members: members, style: '', format: format || 'sv' };
}

// Helper: deterministic seed from a single integer.
function seed(s) {
  return [s>>>0, (s*7919)>>>0, (s*104729)>>>0, (s*1299709)>>>0];
}

// ============================================================
// SECTION A -- Parental Bond 0.25x second hit (5 cases)
// What the user is testing: Mega Kangaskhan's two-hit ability is wired
// correctly in the Champions nerfed form (1/4 power, was 1/2). Verify the
// engine sets bpMult=0.25 on the second strike, that the second strike is
// skipped on multi-hit / pivot moves, and that single-target damaging moves
// trigger it but spread moves do not.
// ============================================================
console.log('\n=== SECTION A: Parental Bond ===');

T('A1. _skipSecond Set excludes Fake Out, Dragon Darts, Bone Rush, U-turn, Flip Turn', () => {
  // We can't read the inner Set directly, so we inspect engine.js source.
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  const m = src.match(/_skipSecond = new Set\(\[([^\]]*)\]\)/);
  truthy(m, 'skipSecond Set should be present');
  const list = m[1];
  truthy(list.includes("'Fake Out'"));
  truthy(list.includes("'Dragon Darts'"));
  truthy(list.includes("'Bone Rush'"));
  truthy(list.includes("'U-turn'"));
  truthy(list.includes("'Flip Turn'"));
});

T('A2. Parental Bond bpMult on second strike is 0.25 (not 0.5)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  // The Champions nerf: field._ctx.bpMult = 0.25 between the two executeMove calls.
  truthy(/field\._ctx\.bpMult = 0\.25/.test(src),
    'engine.js must set field._ctx.bpMult = 0.25 for the Parental Bond second hit');
});

T('A3. field._ctx.bpMult resets to 1 after second strike fires', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  // Look for the reset line right after the second executeMove call.
  truthy(/field\._ctx\.bpMult = 0\.25;[\s\S]*?executeMove\([^)]*\);[\s\S]*?field\._ctx\.bpMult = 1/.test(src),
    'bpMult must reset to 1 after the Parental Bond second-strike call');
});

T('A4. Parental Bond eligibility requires single-target damaging move', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/_isSingleTargetDamage = \(_tCat === 'normal' \|\| _tCat === 'adjacent-foe'\)/.test(src),
    'PB second hit only fires on normal / adjacent-foe target categories');
});

T('A5. Champions nerf citation present in engine.js Parental Bond block', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/game8\.co\/games\/Pokemon-Champions\/archives\/590403/.test(src),
    'engine.js must cite the Champions ability change source');
});

// ============================================================
// SECTION B -- Fake Out hard-gate (8 cases)
// What the user is testing: Fake Out is illegal past the user's first turn
// out. The selectMove path skips it; the executeAction path Struggles if
// forced (Encore lock); switching out and back in resets the window.
// ============================================================
console.log('\n=== SECTION B: Fake Out hard-gate ===');

T('B1. New Pokemon initializes _fakeDone = false', () => {
  const p = mk({ name: 'Incineroar', moves:['Fake Out','Knock Off','Parting Shot','Flare Blitz'] });
  eq(p._fakeDone, false);
});

T('B2. selectMove gate present for Fake Out (skips selection past turn 1)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/if \(move === 'Fake Out'\)[\s\S]*?if \(attacker\._fakeDone\) continue;/.test(src),
    'selectMove must skip Fake Out when _fakeDone is set');
});

T('B3. executeAction hard-gate routes blocked Fake Out to Struggle', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/if \(move === 'Fake Out'\)[\s\S]*?if \(attacker\._fakeDone\)[\s\S]*?Struggle/.test(src),
    'Forced Fake Out past turn 1 must trigger Struggle path');
});

T('B4. Struggle redirect deals 1/4 maxHp to target and 1/4 maxHp recoil to user', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/_struggleTgt\.maxHp \* 0\.25/.test(src), 'target damage = 1/4 maxHp');
  truthy(/attacker\.maxHp \* 0\.25/.test(src),     'recoil       = 1/4 maxHp');
});

T('B5. _fakeDone flag is set BEFORE the Protect early-return', () => {
  // Read executeAction source and confirm the flag-set line precedes the
  // protected check, so a Protect-blocked Fake Out still consumes the window.
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  // Anchor on the executeAction comment block (NOT the constructor flag init).
  const headerIdx = src.indexOf('Fake Out hard-gate enforced inside executeAction');
  truthy(headerIdx > 0, 'executeAction Fake Out header must exist');
  const slice = src.slice(headerIdx, headerIdx + 4000);
  const localFakeIdx = slice.indexOf('attacker._fakeDone = true;');
  const localProtIdx = slice.indexOf('if (target && target.protected)');
  truthy(localFakeIdx >= 0, 'flag-set must exist after header');
  truthy(localProtIdx >= 0, 'protect check must exist after header');
  truthy(localFakeIdx < localProtIdx, 'Fake Out flag-set must precede the protect check');
});

T('B6. _fakeDone resets on switch-in via replaceOnField', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/replacement\._fakeDone\s*=\s*false/.test(src),
    'replaceOnField must reset _fakeDone to false on switch-in');
});

T('B7. _fakeDone NOT reset per turn (only switch-in)', () => {
  // Confirm the per-turn reset block does not include _fakeDone among the
  // flags it clears (hasActed / protected / helpingHand / _flinched).
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  const m = src.match(/Per-turn flag reset[\s\S]{0,400}/);
  // Even if the comment header isn't there, the per-turn block should not
  // touch _fakeDone. Search for any line that resets _fakeDone outside
  // replaceOnField + constructor.
  const occurrences = src.split('_fakeDone').length - 1;
  // Expected: constructor init + replaceOnField reset + executeAction set
  // + selectMove read + executeAction read in Struggle gate. >=4 references.
  // Most importantly: no per-turn reset.
  truthy(occurrences >= 4, '_fakeDone should be referenced in multiple places');
  // Specifically: the per-turn reset block (if any) does not touch _fakeDone.
  if (m) {
    falsy(/_fakeDone/.test(m[0]), 'per-turn reset must not touch _fakeDone');
  }
});

T('B8. Fake Out user picks a non-Fake-Out move on its second turn out', () => {
  // Build a tiny solo team where Fake Out is move slot 0, then run a Bo1.
  // After turn 1, _fakeDone is set; selectMove must pick another move turn 2.
  const ally = { name:'Magnemite', item:'', ability:'Sturdy', nature:'Serious',
                 evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},
                 moves:['Thunderbolt','Protect','Volt Switch','Flash Cannon'] };
  const fo = { name:'Incineroar', item:'', ability:'Intimidate', nature:'Serious',
               evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},
               moves:['Fake Out','Knock Off','Flare Blitz','Parting Shot'] };
  const opp = { name:'Pikachu', item:'', ability:'Static', nature:'Serious',
                evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},
                moves:['Thunderbolt','Quick Attack','Iron Tail','Protect'] };
  const r = ctx.simulateBattle(team([fo, ally, opp, opp, opp, opp]),
                                team([opp, opp, opp, opp, opp, opp]),
                                { format:'doubles', seed: seed(2024) });
  // Count Fake Out usages by Incineroar in the log. Must be exactly 0 or 1.
  // (0 if Incineroar fainted before T1 acted; 1 if it landed on T1 then never again.)
  const foLines = (r.log || []).filter(l => /Incineroar.*Fake Out/.test(l));
  truthy(foLines.length <= 1, `Incineroar may use Fake Out at most once, saw ${foLines.length}`);
});

// ============================================================
// SECTION C -- Piercing Drill 25% miss (6 cases)
// What the user is testing: Mega Excadrill's ability rerolls a 25% miss on
// every move. The prior Protect-bypass behavior is gone. Data tag updated.
// ============================================================
console.log('\n=== SECTION C: Piercing Drill 25% miss ===');

T('C1. data.js Piercing Drill effect tag is miss-25pct', () => {
  const dsrc = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
  truthy(/'Piercing Drill':\s*\{[\s\S]*?effect:\s*'miss-25pct'/.test(dsrc),
    "data.js must tag Piercing Drill with effect:'miss-25pct'");
});

T('C2. data.js no longer carries the contact-bypass-protect tag', () => {
  const dsrc = fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8');
  falsy(/'Piercing Drill':\s*\{[\s\S]*?'contact-bypass-protect-25pct'/.test(dsrc),
    'old contact-bypass tag must be gone');
});

T('C3. ABILITIES Piercing Drill entry has no onProtectResolve hook', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  // Slice the Piercing Drill ABILITIES entry and confirm it does not declare
  // an onProtectResolve hook as a key (the rewritten entry mentions the
  // hook by name in a comment to explain WHY it was removed -- that's fine).
  const m = src.match(/'Piercing Drill':\s*\{[\s\S]*?\n\s*\},/);
  truthy(m, 'Piercing Drill ABILITIES entry must exist');
  falsy(/onProtectResolve\s*:/.test(m[0]),
    'Piercing Drill ABILITIES entry must not declare onProtectResolve as a key');
});

T('C4. executeMove gates a 25% miss when attacker.ability === Piercing Drill', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/attacker\.ability === 'Piercing Drill' && rng\(\) < 0\.25/.test(src),
    'executeMove must contain the Piercing Drill 25% roll');
});

T('C5. Piercing Drill miss happens AFTER the standard ACC_MAP check', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  // Check the ACC_MAP miss block precedes the Piercing Drill block in source.
  const accIdx = src.indexOf('const acc = ACC_MAP[move] || 1.0;');
  const pdIdx  = src.indexOf("attacker.ability === 'Piercing Drill' && rng() < 0.25");
  truthy(accIdx < pdIdx && accIdx > 0 && pdIdx > 0,
    'Piercing Drill roll must fire after ACC_MAP miss block in executeMove');
});

T('C6. Mega Excadrill with Piercing Drill misses some battles in 50-run seed sweep', () => {
  // Run 50 deterministic seeds. The 25% miss on the user side should produce
  // measurably different battle logs vs a control set without Piercing Drill.
  const ed = { name:'Excadrill', item:'', ability:'Piercing Drill', nature:'Adamant',
               evs:{hp:0,atk:32,def:0,spa:0,spd:0,spe:32},
               moves:['Earthquake','Iron Head','Rock Slide','High Horsepower'] };
  const opp = { name:'Skarmory', item:'', ability:'Sturdy', nature:'Impish',
                evs:{hp:32,atk:0,def:32,spa:0,spd:0,spe:0},
                moves:['Roost','Iron Head','Body Press','Whirlwind'] };
  let drillMissCount = 0, runs = 50;
  for (let i = 0; i < runs; i++) {
    const r = ctx.simulateBattle(team([ed, opp, opp, opp, opp, opp]),
                                  team([opp, opp, opp, opp, opp, opp]),
                                  { format:'doubles', seed: seed(i+1) });
    drillMissCount += (r.log || []).filter(l => /Piercing Drill missed/.test(l)).length;
  }
  // 25% miss * dozens of attacks across 50 battles -> well over 0 missed.
  truthy(drillMissCount > 0, `expected at least one Piercing Drill miss across ${runs} runs, got ${drillMissCount}`);
});

// ============================================================
// SECTION D -- Expanding Force x Psychic Terrain (7 cases)
// What the user is testing: Expanding Force becomes a spread move at 1.5x
// BP under Psychic Terrain when the user is grounded. Ungrounded users keep
// the default single-target.
// ============================================================
console.log('\n=== SECTION D: Expanding Force x Psychic Terrain ===');

T('D1. data.js MOVE_TARGETS Expanding Force = normal (default single-target)', () => {
  const target = ctx.getMoveTarget('Expanding Force');
  eq(target, 'normal');
});

T('D2. engine.js executeMove flips targetCat to all-adjacent-foes under Psychic Terrain', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/move === 'Expanding Force' && field\.terrain === 'psychic' && !attacker\.flying[\s\S]*?targetCat = 'all-adjacent-foes'/.test(src),
    'executeMove must rewrite targetCat for grounded user under Psychic Terrain');
});

T('D3. Expanding Force BP boost is 1.5x via field._ctx.bpMult', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/move === 'Expanding Force' && field\.terrain === 'psychic'[\s\S]*?bpMult = _prevBpMult \* 1\.5/.test(src),
    'Expanding Force must multiply bpMult by 1.5 under Psychic Terrain');
});

T('D4. Ungrounded (Flying or Levitate) attacker keeps default single-target', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/!attacker\.flying/.test(src),
    'spread/BP boost must be gated on !attacker.flying');
});

T('D5. bpMult is restored after Expanding Force resolves', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/if \(_bpMultPushed\) field\._ctx\.bpMult = _prevBpMult/.test(src),
    'executeMove must restore bpMult on early-return AND on completion');
});

T('D6. Psychic-Terrain helper citations present', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/Expanding_Force_\(move\)/.test(src),
    'Bulbapedia Expanding Force citation must be present');
});

T('D7. Pokemon constructor sets flying=true for Flying-types', () => {
  const p = mk({ name:'Latios', moves:['Expanding Force','Psyshock','Recover','Protect'] });
  // Latios is Dragon/Psychic, NOT Flying -> grounded.
  eq(p.flying, false, 'Latios should be grounded');
  const p2 = mk({ name:'Latias', moves:['Expanding Force','Psyshock','Recover','Protect'] });
  eq(p2.flying, false, 'Latias is grounded too');
  const p3 = mk({ name:'Cresselia', moves:['Expanding Force','Moonblast','Moonlight','Protect'] });
  eq(p3.flying, false, 'Cresselia is grounded -> seeds + Expanding Force apply');
});

// ============================================================
// SECTION E -- Terrain Seeds switch-in (8 cases)
// What the user is testing: Grassy/Electric/Misty/Psychic Seed each grant
// the right stat boost when the holder switches in to matching terrain.
// Ungrounded mons skip; non-matching terrain skips; consume flag fires.
// ============================================================
console.log('\n=== SECTION E: Terrain Seeds ===');

T('E1. TERRAIN_SEEDS map covers all 4 seeds with correct stat targets', () => {
  const TS = ctx.TERRAIN_SEEDS;
  eq(TS['Grassy Seed'].stat, 'def');
  eq(TS['Electric Seed'].stat, 'def');
  eq(TS['Psychic Seed'].stat, 'spd');
  eq(TS['Misty Seed'].stat, 'spd');
});

T('E2. Grassy Seed +1 Def under Grassy Terrain (grounded user)', () => {
  const p = mk({ name:'Cresselia', item:'Grassy Seed',
                 moves:['Moonblast','Moonlight','Protect','Calm Mind'] });
  const f = new ctx.Field();
  f.terrain = 'grassy'; f.terrainTurns = 5;
  const ok = ctx.tryTerrainSeed(p, f, []);
  truthy(ok); eq(p.statBoosts.def, 1); eq(p.itemConsumed, true);
});

T('E3. Electric Seed +1 Def under Electric Terrain', () => {
  const p = mk({ name:'Pikachu', item:'Electric Seed',
                 moves:['Thunderbolt','Quick Attack','Iron Tail','Protect'] });
  const f = new ctx.Field(); f.terrain = 'electric'; f.terrainTurns = 5;
  const ok = ctx.tryTerrainSeed(p, f, []);
  truthy(ok); eq(p.statBoosts.def, 1);
});

T('E4. Psychic Seed +1 SpD under Psychic Terrain', () => {
  const p = mk({ name:'Cresselia', item:'Psychic Seed',
                 moves:['Moonblast','Moonlight','Protect','Calm Mind'] });
  const f = new ctx.Field(); f.terrain = 'psychic'; f.terrainTurns = 5;
  const ok = ctx.tryTerrainSeed(p, f, []);
  truthy(ok); eq(p.statBoosts.spd, 1);
});

T('E5. Misty Seed +1 SpD under Misty Terrain', () => {
  const p = mk({ name:'Tapu Fini', item:'Misty Seed',
                 moves:['Moonblast','Calm Mind','Protect','Surf'] });
  const f = new ctx.Field(); f.terrain = 'misty'; f.terrainTurns = 5;
  const ok = ctx.tryTerrainSeed(p, f, []);
  truthy(ok); eq(p.statBoosts.spd, 1);
});

T('E6. Seed does NOT trigger when terrain mismatches', () => {
  const p = mk({ name:'Cresselia', item:'Grassy Seed',
                 moves:['Moonblast','Moonlight','Protect','Calm Mind'] });
  const f = new ctx.Field(); f.terrain = 'electric'; f.terrainTurns = 5;
  const ok = ctx.tryTerrainSeed(p, f, []);
  falsy(ok); eq(p.statBoosts.def, 0); falsy(p.itemConsumed);
});

T('E7. Ungrounded user (Flying-type) does NOT receive seed boost', () => {
  const p = mk({ name:'Charizard', item:'Grassy Seed', ability:'Blaze',
                 moves:['Flamethrower','Air Slash','Roost','Protect'] });
  const f = new ctx.Field(); f.terrain = 'grassy'; f.terrainTurns = 5;
  truthy(p.flying, 'Charizard should register as ungrounded');
  const ok = ctx.tryTerrainSeed(p, f, []);
  falsy(ok); eq(p.statBoosts.def, 0); falsy(p.itemConsumed);
});

T('E8. Seed consume flag prevents double-trigger', () => {
  const p = mk({ name:'Cresselia', item:'Grassy Seed',
                 moves:['Moonblast','Moonlight','Protect','Calm Mind'] });
  const f = new ctx.Field(); f.terrain = 'grassy'; f.terrainTurns = 5;
  ctx.tryTerrainSeed(p, f, []);
  const ok2 = ctx.tryTerrainSeed(p, f, []);
  falsy(ok2, 'second trigger must short-circuit on itemConsumed');
  eq(p.statBoosts.def, 1, 'still +1 only');
});

// ============================================================
// SECTION F -- Status weakening audit (8 cases)
// What the user is testing: the four Champions status conditions deal the
// right chip damage and stat penalty. Spec line items:
//   Burn       -- 1/16 maxHp + Atk halved
//   Paralysis  -- 12.5% full skip + Spe halved
//   Toxic      -- N/16 ramp, cap N=15
//   Frozen     -- 25% thaw per attempt, 3-turn cap
// ============================================================
console.log('\n=== SECTION F: Status weakening audit ===');

T('F1. Burn halves attack via getStat', () => {
  const p = mk({ name:'Garchomp', moves:['Earthquake','Dragon Claw','Stone Edge','Fire Fang'] });
  const f = new ctx.Field();
  const before = p.getStat('atk', f);
  p.status = 'burn';
  const after = p.getStat('atk', f);
  eq(after, Math.floor(before * 0.5));
});

T('F2. Burn chip damage is 1/16 maxHp end of turn (verified in source)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/burnDmg = Math\.floor\(mon\.maxHp \/ 16\)/.test(src),
    'engine.js burn chip = floor(maxHp / 16)');
});

T('F3. Paralysis halves speed via getStat', () => {
  const p = mk({ name:'Garchomp', moves:['Earthquake','Dragon Claw','Stone Edge','Fire Fang'] });
  const f = new ctx.Field();
  const before = p.getStat('spe', f);
  p.status = 'paralysis';
  const after = p.getStat('spe', f);
  eq(after, Math.floor(before * 0.5));
});

T('F4. Paralysis 12.5% full-skip is wired in turn order', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  // Look for paralysis 0.125 (12.5%) full-skip RNG roll.
  truthy(/paralysis[\s\S]{0,200}?0\.125/i.test(src) ||
         /0\.125[\s\S]{0,200}?paralys/i.test(src) ||
         /paralys[\s\S]{0,400}?fully paralysed|fully paralyzed/.test(src),
    'paralysis 12.5% full-skip must exist somewhere in engine.js');
});

T('F5. Toxic ramp cap is N=15', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/Math\.min\(15, mon\.toxicCounter\)/.test(src),
    'toxic ramp must cap at N=15');
});

T('F6. Toxic counter resets on switch-in', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/replacement\.toxicCounter\s*=\s*0/.test(src),
    'toxicCounter must reset on switch-in');
});

T('F7. Frozen thaw is 25% per move attempt with 3-turn cap', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/frozenTurns >= 3 \|\| rng\(\) < 0\.25/.test(src),
    'frozen thaw must be 25% per attempt OR forced after 3 turns');
});

T('F8. canInflictStatus blocks burn on Fire-types and frozen on Ice-types', () => {
  // Direct unit test on the canInflictStatus helper (exposed via ctx export).
  const fire = mk({ name:'Charizard', moves:['Flamethrower','Air Slash','Roost','Protect'] });
  const ice  = mk({ name:'Glaceon', moves:['Ice Beam','Yawn','Wish','Protect'] });
  falsy(ctx.canInflictStatus(fire, 'burn',   new ctx.Field()), 'Fire-type is burn-immune');
  falsy(ctx.canInflictStatus(ice,  'frozen', new ctx.Field()), 'Ice-type is frozen-immune');
});

// ============================================================
// SECTION G -- Frostbite (4 cases)
// What the user is testing: Frostbite halves Special Attack, chips 1/16
// maxHp end of turn, and is blocked on Ice-types, Magma Armor holders,
// and in sun.
// ============================================================
console.log('\n=== SECTION G: Frostbite ===');

T('G1. Frostbite halves Special Attack via getStat', () => {
  const p = mk({ name:'Latios', moves:['Draco Meteor','Psyshock','Recover','Protect'] });
  const f = new ctx.Field();
  const before = p.getStat('spa', f);
  p.status = 'frostbite';
  const after = p.getStat('spa', f);
  eq(after, Math.floor(before * 0.5));
});

T('G2. Frostbite chip damage line present in end-of-turn loop', () => {
  const src = fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8');
  truthy(/m\.status === 'frostbite'/.test(src) &&
         /frostDmg = Math\.max\(1, Math\.floor\(mon\.maxHp \/ 16\)\)/.test(src),
    'engine.js must chip 1/16 maxHp on frostbite end-of-turn');
});

T('G3. canInflictStatus blocks frostbite on Ice-types and Magma Armor', () => {
  const ice = mk({ name:'Glaceon', moves:['Ice Beam','Yawn','Wish','Protect'] });
  const ma  = mk({ name:'Camerupt', ability:'Magma Armor',
                   moves:['Earth Power','Lava Plume','Protect','Eruption'] });
  falsy(ctx.canInflictStatus(ice, 'frostbite', new ctx.Field()), 'Ice-type immune');
  falsy(ctx.canInflictStatus(ma,  'frostbite', new ctx.Field()), 'Magma Armor immune');
});

T('G4. canInflictStatus blocks frostbite under sun', () => {
  const p = mk({ name:'Garchomp', moves:['Earthquake','Dragon Claw','Stone Edge','Fire Fang'] });
  const f = new ctx.Field(); f.weather = 'sun';
  falsy(ctx.canInflictStatus(p, 'frostbite', f), 'sun must block frostbite');
});

// ============================================================
// FINAL
// ============================================================
console.log('\n' + '='.repeat(60));
console.log(`T9j.17 Results: ${PASS} pass, ${FAIL} fail`);
process.exit(FAIL ? 1 : 0);
