// ============================================================
// BATTLE ENGINE — VGC Doubles Simulator
// Simulates VGC-style 4v4 doubles with priority, speed tiers,
// weather, Trick Room, Intimidate, and damage variance
// ============================================================

// ============================================================
// CHAMPIONS REG M-A MECHANICS REFERENCE (T10, verified April 2026)
// See docs/CHAMPIONS_MEGA_SYSTEM.md + docs/CHAMPIONS_LEGALITY.md +
// CHAMPIONS_MECHANICS_VERIFICATION.md + ENGINE_AUDIT_REPORT.md for
// full audit. Engine hooks for the behaviors below are DEFERRED;
// this block documents target behavior for future engine tickets.
//
// Stat formula (IMPLEMENTED in T1):
//   HP     = Base + SP + 75
//   Other  = floor((Base + SP + 20) * Alignment)
//   Alignment = 0.9 (lowered) | 1.0 (neutral) | 1.1 (raised)
//   All IVs fixed at 31.
//
// Status nerfs (IMPLEMENTED — see canInflictStatus + getStat + end-of-turn):
//   Paralysis full-para: 12.5%  (was 25%). Speed -50% unchanged.
//   Sleep:  max 3 turns  (T1 cant act, T2 33% wake, T3 guaranteed).
//   Freeze: 25% thaw/turn, guaranteed thaw T3. Sun thaws.
//   Frostbite (T9j.17): 1/16 chip, SpA halved, no action skip.
//     Cite: https://bulbapedia.bulbagarden.net/wiki/Frostbite_(status_condition)
//   Toxic ramp: N/16 escalating, capped at N=15.
//
// Doubles:
//   Spread modifier 0.75x; spread MUST hit all valid targets.
//   Fake Out (T9j.17 hard-gate): cannot be selected past first turn out;
//     resets on switch-in. Encore->Struggle handled in executeAction.
//   Protect PP halved 16 -> 8.
//
// Ability nerfs (flags in data.js::CHAMPIONS_UPDATED_ABILITIES):
//   Unseen Fist:   25% damage through Protect (was 100%).
//   Parental Bond: child hit 1/4 power (was 1/2). T9j.8 inline 2-strike loop.
//   Protean:       fires once per entry (was every move).
//
// New abilities (data.js::CHAMPIONS_NEW_ABILITIES):
//   Piercing Drill (Mega Excadrill): 25% miss chance on every move (T9j.17).
//     Cite: https://www.serebii.net/pokemonchampions/newabilities.shtml
//   Dragonize (Mega Feraligatr):     Normal -> Dragon, +20% BP.
//   Mega Sol (Mega Meganium):        personal sun, no weather set.
//   Spicy Spray (Mega Scovillain):   burn attacker on any damage taken.
//
// T9j.17 move/item additions:
//   Expanding Force x Psychic Terrain: grounded user spreads to all foes
//     and gains 1.5x BP. Cite: https://bulbapedia.bulbagarden.net/wiki/Expanding_Force_(move)
//   Terrain Seeds (Grassy/Electric +1 Def, Psychic/Misty +1 SpD): consume
//     on switch-in to matching terrain. Cite: https://bulbapedia.bulbagarden.net/wiki/Grassy_Seed
//
// Items NOT in Champions (enforced in legality.js::CHAMPIONS_BANNED_ITEMS):
//   Life Orb, Choice Band/Specs, Assault Vest, Rocky Helmet, HDB,
//   Black Sludge, Eviolite, Light Clay, weather rocks, Terrain Extender,
//   Toxic Orb, Flame Orb.
//
// Sources:
//   https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml
//   https://www.serebii.net/pokemonchampions/statusconditions.shtml
//   https://www.serebii.net/pokemonchampions/newabilities.shtml
//   https://www.serebii.net/pokemonchampions/updatedabilities.shtml
//   https://bulbapedia.bulbagarden.net/wiki/Stat_point
//   https://game8.co/games/Pokemon-Champions/archives/588871
//   https://victoryroad.pro/champions-regulations/
// ============================================================

var CHAMPIONS_FORMAT_ID = 'champions-vgc-2026-regma';
var CHAMPIONS_FORMAT_LABEL = 'Champions Reg M-A (Apr 8 - Jun 17, 2026)';

// ============================================================
// SEEDED PRNG — Issue #2 FIX
// Mulberry32: fast, deterministic, browser-safe.
// All battle randomness goes through rng() — never Math.random().
// Seed is a 4-number array [a,b,c,d] passed via opts.seed to
// simulateBattle(). runSimulation() auto-generates seeds per battle
// so each battle is independently reproducible.
// ============================================================
function makePRNG(seed) {
  // seed: [a, b, c, d] — four 32-bit integers
  let [a, b, c, d] = seed.map(n => n >>> 0);
  return function rng() {
    let t = b << 9;
    let r = a * 5; r = (r << 7 | r >>> 25) * 9;
    c ^= a; d ^= b; b ^= c; a ^= d; c ^= t;
    d = d << 11 | d >>> 21;
    return (r >>> 0) / 4294967296;
  };
}

// Generate a random seed array (for external callers who don't supply one)
function makeSeed() {
  return [
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF),
    Math.floor(Math.random() * 0xFFFFFFFF),
  ];
}

// ============================================================
// TEAM LEGALITY VALIDATOR — Issue #5 + #T2
// Called before every simulateBattle() invocation.
// Blocks on errors, warns on warnings.
//
// #T2 updates:
//   - Dual-format stat caps: Champions SP (<=32/stat, <=66 total)
//     vs SV EV (<=252/stat, <=510 total). Detects per team.
//   - Species Clause and Item Clause upgraded from warning -> ERROR
//     (VGC/Champions rules: both are hard bans, not soft recommendations).
//   - Optional Champions legality layer (ban list, fakemon) wired in
//     via validateChampionsLegality() if legality.js is loaded.
// ============================================================
function validateTeam(team, format = 'vgc') {
  const errors = [];
  const warnings = [];
  if (!team || !team.members || team.members.length === 0) {
    errors.push('Team has no members.');
    return { valid: false, errors, warnings };
  }

  // Determine stat-point format per team. Priority:
  //   team.format === 'champions' -> SP caps
  //   team.format === 'sv'        -> SV caps
  //   otherwise                   -> auto-detect by spread shape
  function detectFormat(mon) {
    if (team.format === 'champions' || mon.format === 'champions') return 'champions';
    if (team.format === 'sv' || mon.format === 'sv') return 'sv';
    const vals = Object.values(mon.evs || {});
    if (vals.length === 0) return 'sv';
    const total = vals.reduce((a, b) => a + b, 0);
    const max = Math.max(...vals);
    if (total > 0 && max <= 32 && total <= 66) return 'champions';
    return 'sv';
  }

  for (const mon of team.members) {
    const name = mon.name || 'Unknown';
    const fmt = detectFormat(mon);
    const caps = fmt === 'champions'
      ? { perStat: 32, total: 66, label: 'SP' }
      : { perStat: 252, total: 510, label: 'EV' };

    // Total cap
    const totalPoints = Object.values(mon.evs || {}).reduce((a, b) => a + b, 0);
    if (totalPoints > caps.total) {
      errors.push(`${name}: ${caps.label}s exceed ${caps.total} (got ${totalPoints}) [${fmt} format]`);
    }
    // Individual cap
    for (const [stat, val] of Object.entries(mon.evs || {})) {
      if (val > caps.perStat) errors.push(`${name}: ${stat} ${caps.label} exceeds ${caps.perStat} (got ${val}) [${fmt} format]`);
      if (val < 0)            errors.push(`${name}: ${stat} ${caps.label} is negative (got ${val})`);
    }
    // Move count
    if (!mon.moves || mon.moves.length === 0) errors.push(`${name}: no moves defined`);
    if (mon.moves && mon.moves.length > 4)    errors.push(`${name}: more than 4 moves (got ${mon.moves.length})`);
    // VGC level
    if (format === 'vgc') {
      const lvl = mon.level || 50;
      if (lvl !== 50) warnings.push(`${name}: level should be 50 for VGC (got ${lvl})`);
    }
  }

  // #T2: Species Clause is a hard ban in VGC/Champions, not a warning.
  // Same National Dex # (and regional forms share dex #s) not allowed twice.
  const names = team.members.map(m => m.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  if (dupes.length > 0) errors.push(`Species Clause violation: duplicate Pokemon: ${[...new Set(dupes)].join(', ')}`);

  // #T2: Item Clause is also a hard ban ("no two Pokemon may hold the same item").
  const items = team.members.map(m => m.item).filter(Boolean);
  const dupeItems = items.filter((it, i) => items.indexOf(it) !== i);
  if (dupeItems.length > 0) errors.push(`Item Clause violation: duplicate items: ${[...new Set(dupeItems)].join(', ')}`);

  // #T2: Optional Champions-specific legality (ban list + fakemon) — only
  // runs if legality.js has been loaded and team is declared Champions format.
  if ((team.format === 'champions' || format === 'champions')
      && typeof validateChampionsLegality === 'function') {
    const champ = validateChampionsLegality(team);
    if (champ && Array.isArray(champ.violations)) {
      for (const v of champ.violations) {
        if (v.severity === 'error') errors.push(v.message);
        else                        warnings.push(v.message);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================
// T9j.8 — CRITICAL HITS, FLINCH, AND ABILITIES FRAMEWORK
// Refs #27 (crits), #19 (flinch), #30 (abilities).
// All tables are `var` for TDZ-safety (referenced from Pokemon methods).
//
// CRIT_STAGES: Gen 9 crit probability ladder.
//   Stage 0 = 1/24 ≈ 4.17%, Stage 1 = 1/8 = 12.5%, Stage 2 = 1/2, Stage 3+ = always.
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Critical_hit
// HIGH_CRIT_MOVES: moves that START at stage 1 instead of 0. Narrow Champions list.
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Critical_hit#High_critical-hit_ratio_moves
// ALWAYS_CRIT_MOVES: +3 stage floor (always crit). Frost Breath / Storm Throw.
//
// CRIT BYPASS RULES (applied in calcDamage when crit lands):
//   - Attacker's NEGATIVE Atk/SpA stages ignored (taken as 0).
//   - Defender's POSITIVE Def/SpD stages ignored (taken as 0).
//   - Screens (Reflect/Light Screen/Aurora Veil) bypassed — screenMod = 1.
//   - Burn STILL halves physical Atk on crit (Gen 6+ rule — verified Bulbapedia).
//   - Final damage × 1.5 (Gen 6+; was × 2 in earlier gens).
//
// FLINCH_MOVES: secondary-effect flinch chances. Data-driven per Bulbapedia
// per-move pages and Pokemon Champions nerfs:
//   Iron Head: 20% in Champions (nerfed from Gen 9's 30%).
//     Cite: https://www.serebii.net/pokemonchampions/updatedattacks.shtml
//     Cite: https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Champions
//   Rock Slide / Air Slash / Bite: 30% (unchanged).
//   Zen Headbutt: 20%. Fire/Ice/Thunder Fang: 10% flinch (+10% independent status).
//   Dark Pulse / Twister / Icicle Crash / Waterfall: secondary flinch retained.
//   Cite: https://game8.co/games/Pokemon-Champions/archives/590527 (move list)
// ============================================================
var CRIT_STAGES = [1/24, 1/8, 1/2, 1, 1]; // index by clamped stage
var HIGH_CRIT_MOVES = new Set([
  // Gen 9 +1 stage list. Champions retains standard list per Game8 move pages.
  'Night Slash','Cross Poison','Drill Run','Stone Edge','Leaf Blade',
  'Psycho Cut','Slash','Shadow Claw','Attack Order','Spacial Rend','Blaze Kick'
]);
var ALWAYS_CRIT_MOVES = new Set(['Frost Breath','Storm Throw','Surging Strikes']);
var FLINCH_MOVES = {
  'Rock Slide':   { chance: 0.30 },
  'Iron Head':    { chance: 0.20 }, // Champions nerf (30% -> 20%)
  'Air Slash':    { chance: 0.30 },
  'Bite':         { chance: 0.30 },
  'Zen Headbutt': { chance: 0.20 },
  'Fire Fang':    { chance: 0.10 },
  'Ice Fang':     { chance: 0.10 },
  'Thunder Fang': { chance: 0.10 },
  'Dark Pulse':   { chance: 0.20 },
  'Twister':      { chance: 0.20 },
  'Icicle Crash': { chance: 0.30 },
  'Waterfall':    { chance: 0.20 },
  'Astonish':     { chance: 0.30 },
  'Extrasensory': { chance: 0.10 },
  'Heart Stamp':  { chance: 0.30 },
  'Needle Arm':   { chance: 0.30 },
  'Bone Club':    { chance: 0.10 },
  'Headbutt':     { chance: 0.30 },
  'Rolling Kick': { chance: 0.30 },
  'Stomp':        { chance: 0.30 }
};

// Contact moves — Champions/Gen 9 contact list used by Piercing Drill,
// Unseen Fist, and future contact-triggered hooks (Rough Skin, Iron Barbs).
// Cite: https://bulbapedia.bulbagarden.net/wiki/Contact
// Conservative: every physical contact move present in the engine's move set.
var CONTACT_MOVES = new Set([
  'Fake Out','Flare Blitz','Head Smash','Extreme Speed','Wave Crash',
  'Iron Head','Close Combat','Dire Claw','Ice Punch','Knock Off',
  'Dragon Claw','Phantom Force','Fire Fang','Ice Fang','Thunder Fang',
  'Aqua Jet','Foul Play','Shadow Sneak','Flip Turn','U-turn',
  'First Impression','Trop Kick','Sucker Punch','Kowtow Cleave',
  'Crunch','Stomping Tantrum','Liquidation','Fire Punch','Thunder Punch',
  'Psyshield Bash','High Horsepower','Body Press','Zen Headbutt',
  'Bite','Waterfall','Headbutt','Rolling Kick','Stomp','Needle Arm',
  'Heart Stamp','Bone Club','Heracross','Wicked Blow','Surging Strikes',
  'Low Kick','Throat Chop','Scale Shot','Darkest Lariat','Tackle',
  'Beak Blast'
]);

// ============================================================
// ABILITIES REGISTRY — T9j.8
// Each entry declares the hooks an ability participates in. Handlers return
// a mutation object (or undefined for no-op). The engine calls the relevant
// hook at the canonical trigger points documented below.
//
// Hook signatures:
//   onModifyMove({move, attacker, field}) -> {move?, bpMult?, typeOverride?}
//     Fires at the top of calcDamage so type/STAB/type-chart all see the change.
//   onProtectResolve({attacker, defender, move, moveType, isContact}) -> {damageMult}
//     Fires when a target's Protect flag is up; default is 0 (full block). A
//     positive damageMult lets the attacker deal dmg * mult through Protect.
//     Piercing Drill / Unseen Fist use this shared 25% path.
//   onDamageTaken({attacker, defender, move, moveType, damage, field, log})
//     Fires AFTER applyDamage writes HP, iff damage > 0 AND defender still alive.
//     Used by Spicy Spray (burn attacker).
//   onWeatherCheck({mon, moveType, field}) -> {effectiveWeather}
//     Fires inside calcDamage's weather branch. Mega Sol provides personal sun
//     for the holder's Fire-typed moves even if field weather is 'none'.
//
// Sources cited per-ability.
// ============================================================
var ABILITIES = {
  'Dragonize': {
    // Normal moves become Dragon-type and gain 20% BP. Mirrors -ate ability
    // family (Pixilate/Aerilate/Refrigerate) with Dragon as the target type.
    // Cite: https://www.serebii.net/pokemonchampions/newabilities.shtml
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Champions
    onModifyMove: function(ctx) {
      var baseType = (typeof MOVE_TYPES !== 'undefined' && MOVE_TYPES[ctx.move]) || 'Normal';
      if (baseType === 'Normal') return { typeOverride: 'Dragon', bpMult: 1.20 };
      return null;
    }
  },
  'Piercing Drill': {
    // T9j.17 (Refs #101) -- Champions Piercing Drill: 25% miss chance on every move.
    // The previous T9j.8 implementation (25% Protect bypass on contact) was
    // incorrect for Champions Reg M-A. Rewritten per user-confirmed spec.
    // The 25% miss roll fires inside executeMove right after the standard
    // accuracy check; this entry is intentionally hookless (no onProtectResolve)
    // so Mega Excadrill obeys default full-block Protect rules.
    // Cite: https://www.serebii.net/pokemonchampions/newabilities.shtml
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Piercing_Drill_(Ability)
  },
  'Unseen Fist': {
    // Champions: 25% damage through Protect on contact moves (nerfed from 100%).
    // Cite: https://www.serebii.net/pokemonchampions/updatedabilities.shtml
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Unseen_Fist_(Ability)
    onProtectResolve: function(ctx) {
      if (ctx.isContact) return { damageMult: 0.25 };
      return null;
    }
  },
  'Spicy Spray': {
    // 100% burn attacker when holder takes any damage (except Fire attackers,
    // attackers already statused, or if holder is behind a Substitute).
    // Cite: https://www.serebii.net/pokemonchampions/newabilities.shtml
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Spicy_Spray_(Ability)
    onDamageTaken: function(ctx) {
      var attacker = ctx.attacker, defender = ctx.defender;
      if (!attacker || !attacker.alive) return;
      if (defender.substituteHp > 0) return;     // holder behind Sub blocks
      if (attacker.status) return;               // already statused
      if (attacker.types && attacker.types.indexOf('Fire') !== -1) return;
      attacker.status = 'burn';
      attacker.statusTurns = 0;
      if (ctx.log) ctx.log.push(defender.name + "'s Spicy Spray burned " + attacker.name + '!');
    }
  },
  'Mega Sol': {
    // Personal sun — treats Fire moves as if sun is up when computing the
    // weather multiplier, but does NOT set field weather. Water 0.5x penalty
    // and Fire 1.5x bonus apply only for the holder's own move resolution.
    // Cite: https://www.serebii.net/pokemonchampions/newabilities.shtml
    onWeatherCheck: function(ctx) {
      if (ctx.field.weather === 'none' || !ctx.field.weather) {
        return { effectiveWeather: 'sun' };
      }
      return null;
    }
  }
  // Parental Bond handled inline in executeMove (2-strike loop with BP override)
};

// ============================================================
// T9j.17 (Refs #44) -- TERRAIN SEEDS
// One-shot consumable items that boost the holder by +1 to a defensive stat
// when present in matching terrain at switch-in. Standard mainline behavior
// per Bulbapedia. Champions inherits this verbatim (no nerfs).
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Grassy_Seed
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Electric_Seed
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Psychic_Seed
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Misty_Seed
// In-engine, the trigger fires inside applyEntryAbility when the holder
// switches into a matching terrain. Trigger on terrain-set (e.g. a partner
// uses Grassy Terrain mid-match) is wired in via the same helper called
// from terrain-setting hooks; until terrain-setting moves are added to the
// engine, only the switch-in path activates in real battles. Tests cover
// both paths via direct helper invocation.
// ============================================================
var TERRAIN_SEEDS = {
  'Grassy Seed':  { terrain: 'grassy',   stat: 'def', stages: 1 },
  'Electric Seed':{ terrain: 'electric', stat: 'def', stages: 1 },
  'Psychic Seed': { terrain: 'psychic',  stat: 'spd', stages: 1 },
  'Misty Seed':   { terrain: 'misty',    stat: 'spd', stages: 1 },
};

// T9j.17 helper -- triggered from applyEntryAbility (switch-in) and from any
// future terrain-set hook. Returns true iff the seed activated. Boosts cap
// at +6, item is consumed (sets itemConsumed flag for Unburden).
//   Cite: https://bulbapedia.bulbagarden.net/wiki/Grassy_Seed (mechanics box)
function tryTerrainSeed(mon, field, log) {
  if (!mon || !mon.alive) return false;
  if (mon.itemConsumed) return false;
  var seed = TERRAIN_SEEDS[mon.item];
  if (!seed) return false;
  if (!field || field.terrain !== seed.terrain) return false;
  // Ungrounded mons (Flying / Levitate) do NOT receive terrain effects, so
  // their seed should not consume either. Cite: Bulbapedia Terrain.
  if (mon.flying) return false;
  if (!mon.statBoosts) mon.statBoosts = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
  var prev = mon.statBoosts[seed.stat] || 0;
  mon.statBoosts[seed.stat] = Math.min(6, prev + seed.stages);
  mon.itemConsumed = true;
  var prettyStat = (seed.stat === 'def') ? 'Defense' : 'Special Defense';
  if (log) log.push(mon.name + "'s " + mon.item + ' raised its ' + prettyStat + '!');
  return true;
}

// T9j.8 — Ability hook dispatcher. Safe call: returns null when no ability or
// no matching hook. Invoked from engine trigger points.
function callAbilityHook(mon, hookName, ctx) {
  if (!mon || !mon.ability) return null;
  var ability = ABILITIES[mon.ability];
  if (!ability || typeof ability[hookName] !== 'function') return null;
  try {
    return ability[hookName](ctx);
  } catch (e) {
    // Ability hooks must never crash the engine. Log and continue.
    if (ctx && ctx.log) ctx.log.push('[ability-error] ' + mon.ability + '.' + hookName + ': ' + e.message);
    return null;
  }
}

// T9j.7 — Mega trigger policy enum. `var` for TDZ-safety (referenced from
// Pokemon constructor before top-of-file const binding would be reached).
var MEGA_TRIGGER_POLICY = {
  FIRST_ELIGIBLE: 'first_eligible',   // default — AI Megas on first legal turn
  AT_TURN:        'at_turn',           // sweep mode — triggers on mon.megaTriggerTurn
  NEVER:          'never'              // sweep baseline — skip Mega this battle
};

// T9j.7 — Trigger decision helper. Consulted at start of each turn by
// simulateBattle's Mega Evolution phase.
function shouldMegaThisTurn(mon, currentTurn) {
  if (!mon || !mon.megaForm || mon.hasMegaEvolved || !mon.alive) return false;
  var p = mon.megaPolicy || MEGA_TRIGGER_POLICY.FIRST_ELIGIBLE;
  if (p === MEGA_TRIGGER_POLICY.NEVER) return false;
  if (p === MEGA_TRIGGER_POLICY.FIRST_ELIGIBLE) return true;
  if (p === MEGA_TRIGGER_POLICY.AT_TURN) return currentTurn >= (mon.megaTriggerTurn || 1);
  return false;
}

class Pokemon {
  constructor(data, teamStyle, teamFormat) {
    this.name = data.name;
    this.item = data.item;
    this.ability = data.ability;
    this.nature = data.nature;
    this.evs = data.evs || { hp:0,atk:0,def:0,spa:0,spd:0,spe:0 };
    this.moves = [...data.moves];
    this.role = data.role || '';
    this.teamStyle = teamStyle;
    this.tera = data.tera || null;
    // Issue #T1: Champions Stat Point (SP) system support.
    // Champions replaced SV-style EVs with Stat Points:
    //   - Per-stat cap 32 (SV: 252), total cap 66 (SV: 510)
    //   - IVs fixed at 31 and removed from formula
    //   - HP = Base + SP + 75 ; Other = floor((Base + SP + 20) * Alignment)
    // Source: https://bulbapedia.bulbagarden.net/wiki/Stat_point
    // Format resolution order: explicit teamFormat > auto-detect from spread shape > 'sv'.
    //
    // T9j.13 (Refs #42) — Format-mismatch guard.
    // If the team is declared 'champions' but the spread is SV-scale (total > 66
    // OR any stat > 32), fall back to SV-scale to prevent god-tier stats from the
    // Champions HP formula (Base + SP + 75) being applied to a 252 SP value.
    // This was the root cause of Cofagrigus / Aurora Veil teams hitting 100% WR
    // in the 5070-battle audit (#42). Non-breaking for legitimate Champions
    // teams because they already satisfy the cap; only misdeclared teams shift.
    //   Cite: https://bulbapedia.bulbagarden.net/wiki/Stat_point
    //   Cite: https://game8.co/games/Pokemon-Champions/archives/538683
    var _declaredFmt = teamFormat || data.format || null;
    if (_declaredFmt === 'champions' && !Pokemon._spreadFitsChampions(this.evs)) {
      this.statFormat = 'sv';
      this.formatMismatch = true;
    } else {
      this.statFormat = _declaredFmt || this._detectStatFormat(this.evs);
      this.formatMismatch = false;
    }

    // T9j.7 — Mega form resolution.
    // If this is a -Mega name and we have a CHAMPIONS_MEGAS entry AND the
    // correct Mega Stone is held, enter battle in BASE form. Store Mega form
    // for later trigger during simulateBattle. Backward-compat: no stone held
    // means legacy behavior (name unchanged, Mega stats from turn 1).
    const _megaInfo = (typeof CHAMPIONS_MEGAS !== 'undefined' && CHAMPIONS_MEGAS[data.name]) || null;
    if (_megaInfo && _megaInfo.baseSpecies && data.item === _megaInfo.megaStone) {
      this.megaForm = {
        megaName:    data.name,
        megaStats:   _megaInfo.megaBaseStats,
        megaTypes:   _megaInfo.types,
        megaAbility: _megaInfo.ability,
        stone:       _megaInfo.megaStone
      };
      this.displayName = data.name;                 // keep Mega name for UI
      this.name        = _megaInfo.baseSpecies;     // engine reads base stats
      this.ability     = (typeof CHAMPIONS_BASE_ABILITIES !== 'undefined'
                         && CHAMPIONS_BASE_ABILITIES[_megaInfo.baseSpecies])
                         || this.ability;
      this.hasMegaEvolved = false;
    } else {
      this.megaForm       = null;
      this.hasMegaEvolved = false;
      this.displayName    = data.name;
    }
    // Default Mega trigger policy (overridden by sweep driver).
    this.megaPolicy      = (typeof MEGA_TRIGGER_POLICY !== 'undefined'
                           ? MEGA_TRIGGER_POLICY.FIRST_ELIGIBLE : 'first_eligible');
    this.megaTriggerTurn = 1;

    const _baseStats = BASE_STATS[this.name] || { hp:80,atk:80,def:80,spa:80,spd:80,spe:80, types:['Normal'] };
    // Use POKEMON_TYPES_DB for more accurate type coverage on imported Pokémon
    const _types = (typeof POKEMON_TYPES_DB !== 'undefined' && POKEMON_TYPES_DB[this.name])
      ? POKEMON_TYPES_DB[this.name]
      : _baseStats.types;
    this._base = Object.assign({}, _baseStats, { types: _types });
    this.types = [...this._base.types];
    this.level = data.level || 50;
    this._calcStats();
    this.hp = this.maxHp;
    this.status = null; // burn, paralysis, sleep, poison, toxic, frozen
    this.statusTurns = 0;
    // T9j.4 (#41) — status residual counters.
    // toxicCounter: N in the N/16 Bad Poison formula. Starts at 1 on inflict,
    //   increments post-tick, caps at 15, resets on switch-out.
    // frozenTurns: turns spent frozen. Champions: 25% thaw per move attempt;
    //   guaranteed thaw on turn 3 (3-turn maximum).
    // sleepTurns: turns-asleep counter for 33% turn-2 wake and 3-turn cap.
    // Cite: Bulbapedia Freeze (Pokemon Champions section); Bulbapedia Status.
    this.toxicCounter = 0;
    this.frozenTurns  = 0;
    this.sleepTurns   = 0;
    // T9j.17 (Refs #101) -- Fake Out hard-gate flag. Initialized false so first
    // turn out is the only legal use. Reset on every switch-in (replaceOnField).
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Fake_Out_(move)
    this._fakeDone    = false;
    // T9j.6 (#18) — Choice Scarf move lock. Set to move name after first use,
    // cleared on switch in. Champions only has Choice Scarf (Band/Specs absent).
    this.choiceLock   = null;
    this.statBoosts = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
    this.alive = true;
    this.hasActed = false;
    this.teraActivated = false;
    this.itemConsumed = false;
    this.substituteHp = 0;
    // Sinistcha Hospitality: restores ally HP on switch
    this.hospitality = (this.ability === 'Hospitality');
    // Multiscale: halves first hit if full HP
    this.multiscaleActive = (this.ability === 'Multiscale');
    // T9j.1 (Issue #25) — side-state plumbing.
    // this.side is assigned by simulateBattle once the mon is placed on a side.
    // Points to the field's side object ({tailwind, tailwindTurns, reflect,
    // lightScreen, auroraVeil, fainted}). Reads of target.side.X in calcDamage
    // (screens, Last Respects ramp) rely on this.
    this.side = null;
    // T9j.1 — grounded check for terrain immunity and Ground-type immunity.
    // Mon is 'flying' (ungrounded) if Flying type OR Levitate ability.
    // Iron Ball, Gravity, Thousand Arrows, Roost mid-turn can override this —
    // not modeled yet (tracked separately).
    this.flying = this.types.includes('Flying') || this.ability === 'Levitate';
  }

  // Issue #T1: Auto-detect SP vs SV spreads.
  // Champions spreads: every stat ≤32 AND total ≤66 AND total > 0.
  // All-zero or anything exceeding the SP caps → SV (preserves legacy behavior).
  _detectStatFormat(evs) {
    const vals = Object.values(evs || {});
    if (vals.length === 0) return 'sv';
    const total = vals.reduce((a, b) => a + b, 0);
    const max = Math.max(...vals);
    if (total === 0) return 'sv'; // empty spread → SV default
    if (max <= 32 && total <= 66) return 'champions';
    return 'sv';
  }

  // T9j.13 (Refs #42) — static shape check. Returns true iff the spread
  // satisfies the Champions SP caps (per-stat ≤32, total ≤66).
  //   Cite: https://bulbapedia.bulbagarden.net/wiki/Stat_point
  //   Cite: https://pokeos.com/p/champions/stats
  static _spreadFitsChampions(evs) {
    const vals = Object.values(evs || {});
    if (vals.length === 0) return true; // empty spread is trivially valid
    const total = vals.reduce((a, b) => a + b, 0);
    const max = Math.max(...vals);
    return max <= 32 && total <= 66;
  }

  // Issue #4 FIX: _stat() is HP-only. Removed broken nature logic that
  // compared a stat-key string to a numeric base value (always returned nm=1).
  // Natures do not apply to HP — no nature logic needed here.
  // Issue #T1: Dual-mode formula for Champions Stat Points.
  _stat(base, ev, nature, isHp) {
    if (this.statFormat === 'champions') {
      // Champions HP: Base + SP + 75 (no IV, L50 fixed)
      if (isHp) return base + (ev || 0) + 75;
      // Non-HP fallback (should not be called — _statRaw() handles all non-HP stats)
      return Math.floor(base + (ev || 0) + 20);
    }
    // SV formula (unchanged)
    const iv = 31;
    if (isHp) return Math.floor(((2*base + iv + Math.floor(ev/4)) * this.level / 100) + this.level + 10);
    // Non-HP fallback (should not be called — _statRaw() handles all non-HP stats)
    return Math.floor(Math.floor((2*base + iv + Math.floor(ev/4)) * this.level / 100 + 5));
  }

  _calcStats() {
    const b = this._base, e = this.evs;
    this.maxHp = this._stat(b.hp, e.hp||0, null, true);
    this.baseAtk = this._statRaw(b.atk, e.atk||0, 'atk');
    this.baseDef = this._statRaw(b.def, e.def||0, 'def');
    this.baseSpa = this._statRaw(b.spa, e.spa||0, 'spa');
    this.baseSpd = this._statRaw(b.spd, e.spd||0, 'spd');
    this.baseSpe = this._statRaw(b.spe, e.spe||0, 'spe');
  }

  // T9j.7 — Perform Mega Evolution at start of turn.
  // Swaps stats, types, ability. Preserves HP%, stat boosts, status, item,
  // side-state, turn counters, PP. Idempotent — returns false if already
  // evolved or not Mega-capable.
  megaEvolve(log) {
    if (!this.megaForm || this.hasMegaEvolved) return false;
    const m = this.megaForm;
    const hpFrac = (this.maxHp > 0) ? (this.hp / this.maxHp) : 1;
    // Swap base stats + types
    this._base = Object.assign({}, m.megaStats, { types: m.megaTypes.slice() });
    this.types = m.megaTypes.slice();
    this.name = m.megaName;
    this.displayName = m.megaName;
    this.ability = m.megaAbility;
    // Recalculate derived stats
    this._calcStats();
    this.hp = Math.max(1, Math.round(this.maxHp * hpFrac));
    // Re-evaluate derived flags that depend on ability/types.
    this.multiscaleActive = (this.ability === 'Multiscale') && this.hp === this.maxHp;
    this.flying = this.types.includes('Flying') || this.ability === 'Levitate';
    this.hasMegaEvolved = true;
    if (log) log.push(`${m.megaName} Mega Evolved!`);
    return true;
  }

  _statRaw(base, ev, stat) {
    // Nature / Stat Alignment table is identical in both systems (0.9 / 1.0 / 1.1).
    const natureBonus = {
      Adamant:{atk:1.1,spa:0.9}, Modest:{spa:1.1,atk:0.9}, Jolly:{spe:1.1,spa:0.9},
      Timid:{spe:1.1,atk:0.9}, Bold:{def:1.1,atk:0.9}, Calm:{spd:1.1,atk:0.9},
      Careful:{spd:1.1,spa:0.9}, Quiet:{spa:1.1,spe:0.9}, Relaxed:{def:1.1,spe:0.9},
      Sassy:{spd:1.1,spe:0.9}, Serious:{}, Hasty:{spe:1.1,def:0.9},
      Naive:{spe:1.1,spd:0.9}, Hardy:{}
    };
    const nm = (natureBonus[this.nature] || {})[stat] || 1;
    if (this.statFormat === 'champions') {
      // Champions: floor((Base + SP + 20) × Alignment)
      return Math.floor((base + (ev || 0) + 20) * nm);
    }
    // SV (unchanged)
    const iv = 31;
    return Math.floor(Math.floor((2*base + iv + Math.floor(ev/4)) * this.level / 100 + 5) * nm);
  }

  getStat(stat, field) {
    const boostTable = [1, 1.5, 2, 2.5, 3, 3.5, 4];
    const base = { atk:this.baseAtk, def:this.baseDef, spa:this.baseSpa, spd:this.baseSpd, spe:this.baseSpe }[stat];
    const boost = this.statBoosts[stat] || 0;
    let val = boost >= 0 ? base * boostTable[boost] : base / boostTable[-boost];
    // Burn halves attack
    if (stat === 'atk' && this.status === 'burn') val *= 0.5;
    // T9j.17 (Refs #101) -- Frostbite halves Special Attack (mirrors burn -> Atk).
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Frostbite_(status_condition)
    if (stat === 'spa' && this.status === 'frostbite') val *= 0.5;
    // Paralysis halves speed (Gen 9 — no action skip, speed only)
    if (stat === 'spe' && this.status === 'paralysis') val *= 0.5;
    // Sand Rush doubles speed in sand
    if (stat === 'spe' && this.ability === 'Sand Rush' && field.weather === 'sand') val *= 2;
    // Unburden doubles speed after item consumed
    if (stat === 'spe' && this.ability === 'Unburden' && this.itemConsumed) val *= 2;
    // Intimidate already applied to statBoosts.atk
    // Eviolite for Dusclops
    if ((stat === 'def' || stat === 'spd') && this.item === 'Eviolite') val *= 1.5;
    // T9j.6 (#18) — Choice Scarf +50% Spe (confirmed in Champions). Band/Specs
    // absent from Champions launch (IGN Changes, games.gg); kept here as no-op
    // safe: if user imports a legacy set with Band/Specs, they simply have no
    // effect (matches in-game reality until items are added).
    if (stat === 'spe' && this.item === 'Choice Scarf') val *= 1.5;
    // (Choice Band / Choice Specs multipliers removed — #11 WONTFIX pattern.)
    // T9j.6 (#11 WONTFIX) — Assault Vest absent from Champions launch item pool
    // (Game8 Champions item list; IGN Champions Changes). No effect applied.
    // Trick Room inverts speed (handled in turn order)
    return Math.floor(val);
  }

  getEffSpeed(field) {
    let spe = this.getStat('spe', field);
    // T9j.1 (Issue #28) — Tailwind doubles effective speed for the side that set it.
    // Champions: Tailwind lasts 4 turns (turns active + 3 more) per Game8 page;
    // counter handled in Field.endTurn().
    if (this.side && this.side.tailwind) spe *= 2;
    // Weather speed abilities consolidated here so they compound correctly with Tailwind.
    if (this.ability === 'Swift Swim'   && field.weather === 'rain') spe *= 2;
    if (this.ability === 'Chlorophyll'  && field.weather === 'sun')  spe *= 2;
    if (this.ability === 'Slush Rush'   && field.weather === 'snow') spe *= 2;
    if (field.trickRoom) spe = 10000 - spe; // lower is faster under TR (applied last)
    return spe;
  }

  // Issue #2 FIX: calcDamage now receives rng from simulateBattle scope
  // T9j.8 (Refs #27): crit roll + bypass rules applied inline when crit lands.
  // T9j.8 (Refs #30): Dragonize (type override + BP mult) and Mega Sol
  //   (personal-sun effective weather) consulted via onModifyMove / onWeatherCheck.
  calcDamage(move, target, field, partner, rng) {
    // --- T9j.8 (Refs #30) Dragonize onModifyMove: Normal -> Dragon + 20% BP ---
    let _typeOverride = null;
    let _bpMult = 1;
    const _modRes = callAbilityHook(this, 'onModifyMove', { move: move, attacker: this, field: field });
    if (_modRes) {
      if (_modRes.typeOverride) _typeOverride = _modRes.typeOverride;
      if (_modRes.bpMult) _bpMult = _modRes.bpMult;
    }
    const moveType = _typeOverride || (MOVE_TYPES[move] || 'Normal');

    // --- T9j.9 (Refs #3) Physical/Special classifier ---
    // Data-driven: MOVE_CATEGORY from data.js is the canonical source of truth.
    // Fallback: legacy type-heuristic if the move is missing from the table,
    // with a one-shot console warning so gaps are visible in the test log.
    //   Cite: https://game8.co/games/Pokemon-Champions/archives/590527
    //   Cite: https://bulbapedia.bulbagarden.net/wiki/Damage_category
    let isPhysical;
    if (typeof MOVE_CATEGORY !== 'undefined' && MOVE_CATEGORY[move]) {
      isPhysical = MOVE_CATEGORY[move] === 'physical';
    } else {
      // Fallback: Gen 1-3 style type-based physical/special split.
      const _physTypes = ['Normal','Fighting','Flying','Poison','Ground','Rock','Bug','Ghost','Steel'];
      isPhysical = _physTypes.includes(moveType);
      if (typeof _WARNED_MOVE_CAT === 'undefined') { globalThis._WARNED_MOVE_CAT = new Set(); }
      if (!globalThis._WARNED_MOVE_CAT.has(move)) {
        globalThis._WARNED_MOVE_CAT.add(move);
        if (typeof console !== 'undefined') console.warn('[MOVE_CATEGORY] missing classification for', move, '- using type fallback');
      }
    }

    // --- T9j.8 (Refs #27) Crit roll ---
    // Stage ladder: base 0, +1 HIGH_CRIT, +3 ALWAYS_CRIT. Force-crit via field._ctx.forceCrit (tests).
    let _critStage = 0;
    if (HIGH_CRIT_MOVES.has(move)) _critStage += 1;
    if (ALWAYS_CRIT_MOVES.has(move)) _critStage += 3;
    const _critProb = CRIT_STAGES[Math.min(_critStage, CRIT_STAGES.length - 1)];
    const _forceCrit = !!(field && field._ctx && field._ctx.forceCrit);
    const _forceNoCrit = !!(field && field._ctx && field._ctx.forceNoCrit);
    const _isCrit = _forceCrit || (!_forceNoCrit && rng() < _critProb);
    if (_isCrit && field && field._ctx) field._ctx.lastWasCrit = true;

    // Atk / Def with crit bypass.
    //   Crit: attacker ignores negative Atk/SpA stages (takes 0 instead).
    //         defender ignores positive Def/SpD stages (takes 0 instead).
    //         Burn still halves physical Atk (Gen 6+).
    let atk, def;
    if (_isCrit) {
      const aStatKey = isPhysical ? 'atk' : 'spa';
      const dStatKey = isPhysical ? 'def' : 'spd';
      const aBoost = this.statBoosts[aStatKey] || 0;
      const dBoost = target.statBoosts[dStatKey] || 0;
      const _aSaved = aBoost, _dSaved = dBoost;
      if (aBoost < 0) this.statBoosts[aStatKey] = 0;
      if (dBoost > 0) target.statBoosts[dStatKey] = 0;
      atk = isPhysical ? this.getStat('atk', field) : this.getStat('spa', field);
      def = isPhysical ? target.getStat('def', field) : target.getStat('spd', field);
      this.statBoosts[aStatKey] = _aSaved;
      target.statBoosts[dStatKey] = _dSaved;
    } else {
      atk = isPhysical ? this.getStat('atk', field) : this.getStat('spa', field);
      def = isPhysical ? target.getStat('def', field) : target.getStat('spd', field);
    }

    // Base power
    // T9j.9 (Refs #24): BP lookup promoted to data.js MOVE_BP table.
    // Legacy inline BP_MAP kept as secondary fallback for any engine-only
    // Champions additions not yet migrated. Missing moves warn once and use 60.
    //   Cite: https://www.serebii.net/pokemonchampions/updatedattacks.shtml
    //   Cite: https://bulbapedia.bulbagarden.net/wiki/Base_power
    const BP_MAP = {
      'Fake Out':40,'Flare Blitz':120,'Parting Shot':0,'Knock Off':65,'Power Gem':80,
      'Head Smash':150,'Extreme Speed':80,'Will-O-Wisp':0,'Earthquake':100,'Dragon Claw':80,
      'Rock Slide':75,'Protect':0,'Tailwind':0,'Sunny Day':0,'Moonblast':95,'Thunderbolt':90,
      'Hydro Pump':110,'Fire Fang':65,'Eruption':150,'Heat Wave':95,'Focus Blast':120,
      'Shadow Ball':80,'Flamethrower':90,'Hyper Voice':90,'Roost':0,'Trick Room':0,
      'Life Dew':0,'Rage Powder':0,'Matcha Gotcha':80,'Ice Beam':90,'Thunder':110,
      'Hurricane':110,'Wave Crash':120,'Aqua Jet':40,'Flip Turn':60,'Last Respects':50,
      'Rain Dance':0,'Thunder Wave':0,'Foul Play':95,'Flash Cannon':80,'Dragon Pulse':85,
      'Electro Shot':130,'Weather Ball':50,'U-turn':70,'Helping Hand':0,'Shed Tail':0,
      'Iron Head':80,'Scorching Sands':70,'Dark Pulse':80,'Psychic Noise':75,'Draco Meteor':130,
      'Close Combat':120,'Dire Claw':60,'Ice Punch':75,'High Horsepower':95,
      'Dragon Darts':50,'Phantom Force':90,'Solar Beam':120,'Dazzling Gleam':80,'Air Slash':75,
      'Energy Ball':90,'Sludge Bomb':90,'Sleep Powder':0,
      // Issue #T3: Champions-specific additions
      'Night Daze':90,'Spirit Shackle':90,'Trop Kick':85,'Psyshield Bash':90,
      'Beak Blast':120,'Mountain Gale':120,'First Impression':100,
      'Infernal Parade':65,'Bone Rush':30
    };
    let bp;
    if (typeof MOVE_BP !== 'undefined' && MOVE_BP[move] !== undefined) {
      bp = MOVE_BP[move];
    } else if (BP_MAP[move] !== undefined) {
      bp = BP_MAP[move];
    } else {
      bp = 60;
      if (typeof _WARNED_MOVE_BP === 'undefined') { globalThis._WARNED_MOVE_BP = new Set(); }
      if (!globalThis._WARNED_MOVE_BP.has(move)) {
        globalThis._WARNED_MOVE_BP.add(move);
        if (typeof console !== 'undefined') console.warn('[MOVE_BP] missing base power for', move, '- defaulting to 60');
      }
    }
    // T9j.8 Dragonize BP multiplier applied after base lookup so spread / screens
    // all see the boosted value.
    if (_bpMult !== 1) bp = Math.floor(bp * _bpMult);
    // T9j.8 Parental Bond child strike: field._ctx.bpMult forces second-hit BP
    // multiplier (0.25). Cleared by executeAction after the second call.
    if (field && field._ctx && field._ctx.bpMult && field._ctx.bpMult !== 1) {
      bp = Math.max(1, Math.floor(bp * field._ctx.bpMult));
    }

    // Weather Ball doubles in active weather
    if (move === 'Weather Ball' && field.weather !== 'none') bp = 100;
    // Electro Shot: 130 in rain (one-turn), else still 130 after charge
    if (move === 'Electro Shot' && field.weather === 'rain') bp = 130;
    // Last Respects: +50 per fainted ally (max +300)
    if (move === 'Last Respects') {
      const fainted = target.side?.fainted || 0;
      bp = 50 + Math.min(fainted, 5) * 50;
    }
    // Eruption: scales with user HP
    if (move === 'Eruption') {
      bp = Math.max(1, Math.floor(150 * this.hp / this.maxHp));
    }

    if (bp === 0) return 0; // Status move

    // Type effectiveness
    const TYPE_CHART = {
      Normal:   { Rock:0.5, Ghost:0, Steel:0.5 },
      Fire:     { Fire:0.5, Water:0.5, Rock:0.5, Dragon:0.5, Grass:2, Ice:2, Bug:2, Steel:2 },
      Water:    { Water:0.5, Grass:0.5, Dragon:0.5, Fire:2, Ground:2, Rock:2 },
      Electric: { Electric:0.5, Grass:0.5, Dragon:0.5, Ground:0, Flying:2, Water:2 },
      Grass:    { Fire:0.5, Grass:0.5, Poison:0.5, Flying:0.5, Bug:0.5, Dragon:0.5, Steel:0.5, Water:2, Ground:2, Rock:2 },
      Ice:      { Water:0.5, Ice:0.5, Fire:0.5, Steel:0.5, Grass:2, Ground:2, Flying:2, Dragon:2 },
      Fighting: { Normal:2, Ice:2, Rock:2, Dark:2, Steel:2, Poison:0.5, Bug:0.5, Psychic:0.5, Flying:0.5, Ghost:0, Fairy:0.5 },
      Poison:   { Grass:2, Fairy:2, Poison:0.5, Ground:0.5, Rock:0.5, Ghost:0.5, Steel:0 },
      Ground:   { Electric:2, Fire:2, Poison:2, Rock:2, Steel:2, Grass:0.5, Bug:0.5, Flying:0 },
      Flying:   { Grass:2, Fighting:2, Bug:2, Rock:0.5, Steel:0.5, Electric:0.5 },
      Psychic:  { Fighting:2, Poison:2, Psychic:0.5, Steel:0.5, Dark:0 },
      Bug:      { Grass:2, Psychic:2, Dark:2, Fire:0.5, Fighting:0.5, Flying:0.5, Ghost:0.5, Steel:0.5, Fairy:0.5 },
      Rock:     { Fire:2, Ice:2, Flying:2, Bug:2, Fighting:0.5, Ground:0.5, Steel:0.5 },
      Ghost:    { Ghost:2, Psychic:2, Normal:0, Dark:0.5 },
      Dragon:   { Dragon:2, Steel:0.5, Fairy:0 },
      Dark:     { Ghost:2, Psychic:2, Fighting:0.5, Dark:0.5, Fairy:0.5 },
      Steel:    { Ice:2, Rock:2, Fairy:2, Fire:0.5, Water:0.5, Electric:0.5, Steel:0.5 },
      Fairy:    { Fighting:2, Dragon:2, Dark:2, Fire:0.5, Poison:0.5, Steel:0.5 },
    };

    // Use Tera type if activated
    const targetTypes = (this.teraActivated && target.tera)
      ? [target.tera]
      : target.types;

    let typeEff = 1;
    const chart = TYPE_CHART[moveType] || {};
    for (const t of targetTypes) {
      typeEff *= (chart[t] !== undefined ? chart[t] : 1);
    }
    if (typeEff === 0) return 0;

    // STAB — include Tera STAB
    const attackerTypes = (this.teraActivated && this.tera) ? [this.tera] : this.types;
    const stab = attackerTypes.includes(moveType) ? 1.5 : 1;

    // T9j.2 (Issue #26) — spread 0.75× applied by executeMove when >1 valid
    // target AND format is doubles. Pulled from field._ctx.isSpread so we have
    // access to runtime target-count and format state (set by executeMove,
    // cleared after each per-target calcDamage call).
    const spreadMod = (field && field._ctx && field._ctx.isSpread) ? 0.75 : 1;

    // Weather bonus
    // T9j.8 (Refs #30) Mega Sol: personal sun when field weather is 'none'.
    let _effWeather = field.weather;
    const _wxRes = callAbilityHook(this, 'onWeatherCheck', { mon: this, moveType: moveType, field: field });
    if (_wxRes && _wxRes.effectiveWeather) _effWeather = _wxRes.effectiveWeather;
    let weatherMod = 1;
    if (_effWeather === 'sun')  { if (moveType === 'Fire') weatherMod = 1.5; if (moveType === 'Water') weatherMod = 0.5; }
    if (_effWeather === 'rain') { if (moveType === 'Water') weatherMod = 1.5; if (moveType === 'Fire') weatherMod = 0.5; }
    if (_effWeather === 'sand') { if (moveType === 'Rock') weatherMod = 1.5; }

    // Terrain bonus
    let terrainMod = 1;
    if (field.terrain === 'electric' && moveType === 'Electric' && !target.flying) terrainMod = 1.3;
    if (field.terrain === 'grassy'   && moveType === 'Grass'    && !target.flying) terrainMod = 1.3;
    if (field.terrain === 'psychic'  && moveType === 'Psychic'  && !target.flying) terrainMod = 1.3;
    if (field.terrain === 'misty'    && moveType === 'Dragon')                     terrainMod = 0.5;

    // T9j.3 Screens modifier — exact Gen 9 fractions.
    // Singles: 2048/4096 = 0.5. Doubles: 2732/4096 ≈ 0.6670.
    // Aurora Veil: applies to BOTH physical and special (does not stack w/ R/LS).
    // T9j.8 (Refs #27) Crits bypass screens entirely — screenMod forced to 1 on crit.
    const _fmt = (field && field._format) || 'doubles';
    const _screenBase = (_fmt === 'doubles') ? (2732 / 4096) : (2048 / 4096);
    let screenMod = 1;
    const _tSide = target.side;
    if (_tSide && !_isCrit) {
      if (_tSide.auroraVeil) {
        screenMod = _screenBase;
      } else if (isPhysical && _tSide.reflect) {
        screenMod = _screenBase;
      } else if (!isPhysical && _tSide.lightScreen) {
        screenMod = _screenBase;
      }
    }

    // Helping Hand boost
    const hhMod = (this.helpingHand) ? 1.5 : 1;

    // T9j.6 (#11 WONTFIX) — Life Orb absent from Champions launch (games.gg,
    // IGN Champions Changes, Game8 item list). No multiplier.
    const loMod = 1;

    // Choice Specs/Band handled in getStat
    // Burn handled in getStat

    // Base damage formula (Gen 9)
    const raw = Math.floor(Math.floor(Math.floor(2 * this.level / 5 + 2) * bp * atk / def) / 50) + 2;
    // T9j.8 (Refs #27) Crit multiplier 1.5x (Gen 6+).
    const critMod = _isCrit ? 1.5 : 1;
    const dmg = Math.floor(raw * stab * typeEff * spreadMod * weatherMod * terrainMod * screenMod * hhMod * loMod * critMod);

    // Random roll 85–100%
    const roll = 0.85 + rng() * 0.15;
    return Math.max(1, Math.floor(dmg * roll));
  }

  applyItem(trigger, field) {
    if (this.itemConsumed) return;
    // Lum Berry: clears status
    if (this.item === 'Lum Berry' && trigger === 'status') {
      this.status = null; this.statusTurns = 0; this.itemConsumed = true;
      return `${this.name}'s Lum Berry cured its status!`;
    }
    // Sitrus Berry: restores 25% HP
    if (this.item === 'Sitrus Berry' && trigger === 'damage' && this.hp <= this.maxHp * 0.5) {
      const heal = Math.floor(this.maxHp * 0.25);
      this.hp = Math.min(this.maxHp, this.hp + heal);
      this.itemConsumed = true;
      return `${this.name}'s Sitrus Berry restored HP!`;
    }
    // Oran Berry: restores 10 HP
    if (this.item === 'Oran Berry' && trigger === 'damage' && this.hp <= this.maxHp * 0.5) {
      this.hp = Math.min(this.maxHp, this.hp + 10);
      this.itemConsumed = true;
      return `${this.name}'s Oran Berry restored HP!`;
    }
    // Mental Herb: clears taunt etc (placeholder)
    if (this.item === 'Mental Herb' && trigger === 'taunt') {
      this.itemConsumed = true;
      return `${this.name}'s Mental Herb removed the effect!`;
    }
  }
}

// ============================================================
// STATUS INFLICT GATE (T9j.4 #41)
// ============================================================
// Central gate for status inflict attempts. Returns false if the target is
// type-immune, already statused, under weather protection, or has a blocking
// ability. Cite: Bulbapedia Status; Bulbapedia Freeze.
function canInflictStatus(mon, status, field) {
  if (!mon || !mon.alive) return false;
  if (mon.status) return false; // one major status at a time
  const types = mon.types || [];
  if (status === 'burn'      && (types.includes('Fire')     || mon.ability === 'Water Veil')) return false;
  if (status === 'paralysis' &&  types.includes('Electric')) return false;
  if ((status === 'poison' || status === 'toxic') &&
      (types.includes('Poison') || types.includes('Steel'))) return false;
  if (status === 'frozen'    &&  types.includes('Ice')) return false;
  if (status === 'frozen'    && field && field.weather === 'sun') return false;
  if (status === 'sleep'     && mon.ability === 'Sweet Veil')   return false;
  if (status === 'frozen'    && mon.ability === 'Magma Armor')  return false;
  // T9j.17 (Refs #101) -- Frostbite gates. Ice types and Magma Armor block,
  // mirroring Champions' Freeze immunity rules. Sun thaws/prevents same as freeze.
  // Cite: https://bulbapedia.bulbagarden.net/wiki/Frostbite_(status_condition)
  if (status === 'frostbite' && types.includes('Ice')) return false;
  if (status === 'frostbite' && mon.ability === 'Magma Armor') return false;
  if (status === 'frostbite' && field && field.weather === 'sun') return false;
  return true;
}

// ============================================================
// FIELD STATE
// ============================================================
class Field {
  constructor() {
    this.weather      = 'none'; // 'sun','rain','sand','snow' (Hail does not exist in Champions; Snow replaces it)
    this.weatherTurns = 0;
    this.trickRoom    = false;
    this.trickRoomTurns = 0;
    this.trickRoomActive = 0;   // T9j.3 (#37): cumulative turns TR was active
    this.terrain      = 'none';
    this.terrainTurns = 0;
    // T9j.3 (#38, screens): tailwind + 3 screens w/ remaining turns AND cumulative active counters.
    this.playerSide = {
      tailwind:false, tailwindTurns:0, tailwindActive:0,
      reflect:false, reflectTurns:0, reflectActive:0,
      lightScreen:false, lightScreenTurns:0, lightScreenActive:0,
      auroraVeil:false, auroraVeilTurns:0, auroraVeilActive:0,
      // T9j.2 (#31/#32) — Wide Guard turn flag + chain counter, redirect target
      wideGuard:false, wideGuardChain:0, redirectTo:null, redirectType:null,
      fainted:0
    };
    this.oppSide = {
      tailwind:false, tailwindTurns:0, tailwindActive:0,
      reflect:false, reflectTurns:0, reflectActive:0,
      lightScreen:false, lightScreenTurns:0, lightScreenActive:0,
      auroraVeil:false, auroraVeilTurns:0, auroraVeilActive:0,
      wideGuard:false, wideGuardChain:0, redirectTo:null, redirectType:null,
      fainted:0
    };
    // T9j.2 (#26) — spread context sidecar. Set per-hit by executeMove, read by calcDamage.
    // T9j.8 (Refs #27/#30): lastWasCrit (for log/test assertion), bpMult
    // (Parental Bond 2nd hit), forceCrit/forceNoCrit (test harness overrides).
    this._ctx = { isSpread:false, lastWasCrit:false, bpMult:1, forceCrit:false, forceNoCrit:false };
    // T9j.7 — One Mega per team per match flags. Once set, no further Megas
    // fire for that side for the remainder of the battle.
    this.playerMegaUsed = false;
    this.oppMegaUsed    = false;
    // T9j.3 (#39) — timer state. Standard VGC: 7 min team, 45s turn. Batch sim
    // uses 15s/turn deterministic proxy → ~28-turn cap. Draw tiebreaker cascade:
    // Pokemon alive > total HP > true draw.
    this.clockPlayer = 7 * 60 * 1000;
    this.clockOpp    = 7 * 60 * 1000;
    this._format     = 'doubles';  // set by simulateBattle from opts.format
  }

  tick(logs) {
    // T9j.2 — clear per-turn Wide Guard + redirect flags at end of turn.
    // Chain counter only resets on non-WG move use (handled in executeAction).
    this.playerSide.wideGuard = false;
    this.oppSide.wideGuard    = false;
    this.playerSide.redirectTo = null;
    this.oppSide.redirectTo    = null;
    this.playerSide.redirectType = null;
    this.oppSide.redirectType    = null;
    // Weather countdown
    if (this.weather !== 'none' && this.weatherTurns > 0) {
      this.weatherTurns--;
      if (this.weatherTurns === 0) { logs.push(`The ${this.weather} subsided.`); this.weather = 'none'; }
    }
    // Trick Room countdown — T9j.3 (#37): increment cumulative BEFORE decrement
    if (this.trickRoom) {
      this.trickRoomActive++;
      this.trickRoomTurns--;
      if (this.trickRoomTurns <= 0) { this.trickRoom = false; logs.push('Trick Room returned to NORMAL!'); }
    }
    // Terrain countdown
    if (this.terrain !== 'none' && this.terrainTurns > 0) {
      this.terrainTurns--;
      if (this.terrainTurns === 0) { this.terrain = 'none'; logs.push('The terrain returned to normal.'); }
    }
    // Tailwind + Screens countdowns — T9j.3 (#38, screens): cumulative active + 5-turn countdown for both sides.
    for (const [label, side] of [['Player', this.playerSide], ['Opponent', this.oppSide]]) {
      if (side.tailwind) {
        side.tailwindActive++;
        side.tailwindTurns--;
        if (side.tailwindTurns <= 0) { side.tailwind = false; logs.push(`${label}'s Tailwind ended.`); }
      }
      if (side.reflect) {
        side.reflectActive++;
        side.reflectTurns--;
        if (side.reflectTurns <= 0) { side.reflect = false; logs.push(`${label}'s Reflect wore off.`); }
      }
      if (side.lightScreen) {
        side.lightScreenActive++;
        side.lightScreenTurns--;
        if (side.lightScreenTurns <= 0) { side.lightScreen = false; logs.push(`${label}'s Light Screen wore off.`); }
      }
      if (side.auroraVeil) {
        side.auroraVeilActive++;
        side.auroraVeilTurns--;
        if (side.auroraVeilTurns <= 0) { side.auroraVeil = false; logs.push(`${label}'s Aurora Veil wore off.`); }
      }
    }
  }
}

// ============================================================
// TEAM BUILDER — builds active battlers from team definition
// ============================================================
function buildTeam(teamDef) {
  if (!teamDef || !teamDef.members) return [];
  const style = teamDef.style || '';
  // Issue #T1: propagate team.format so Pokemon uses correct stat math.
  return teamDef.members.map(m => new Pokemon(m, style, teamDef.format));
}

// ============================================================
// SIMULATE BATTLE
// ============================================================
function simulateBattle(playerTeam, oppTeam, opts = {}) {
  const seed = opts.seed || makeSeed();
  const rng  = makePRNG(seed);
  const log  = [];
  const field = new Field();
  // T9j.3 (#39) — stamp format on field so calcDamage can pick singles vs doubles screen fraction.
  field._format = (opts.format === 'singles') ? 'singles' : 'doubles';
  const DECISION_TIME_MS = 15 * 1000;  // deterministic 15s/turn proxy for timer-draw

  // #5 — Legality validation (non-blocking by default).
  // validateTeam detects stat-point caps (SP or EV), move count, Species/Item
  // Clause, Champions ban list. Errors are logged to battle log and attached
  // to the result so UI / PDF report can surface them. Pass opts.strict=true
  // to abort before rolling seeds (for CI / golden tests).
  const fmt = opts.format === 'singles' ? 'singles' : 'vgc';
  const playerLegality = validateTeam(playerTeam, fmt);
  const oppLegality    = validateTeam(oppTeam, fmt);
  if (!playerLegality.valid) {
    log.push(`[LEGALITY] Player team errors: ${playerLegality.errors.join('; ')}`);
  }
  for (const w of playerLegality.warnings) log.push(`[LEGALITY] Player warning: ${w}`);
  if (!oppLegality.valid) {
    log.push(`[LEGALITY] Opponent team errors: ${oppLegality.errors.join('; ')}`);
  }
  for (const w of oppLegality.warnings) log.push(`[LEGALITY] Opponent warning: ${w}`);
  if (opts.strict && (!playerLegality.valid || !oppLegality.valid)) {
    return {
      result: 'error', turns: 0, trTurns: 0,
      twTurns: 0, twTurnsPlayer: 0, twTurnsOpp: 0,
      timerExpired: false, clockPlayer: 0, clockOpp: 0, pHpSum: 0, oHpSum: 0,
      screens: { playerReflect:0, playerLightScreen:0, playerAuroraVeil:0, oppReflect:0, oppLightScreen:0, oppAuroraVeil:0 },
      log,
      winCondition: 'Illegal team — simulation aborted (strict mode)',
      seed, playerSurvivors: 0, oppSurvivors: 0,
      legality: { player: playerLegality, opp: oppLegality },
    };
  }

  const playerPokemon = buildTeam(playerTeam);
  const oppPokemon    = buildTeam(oppTeam);

  // T9j.10 (Refs #16) — Team Preview / bring-N-of-6.
  //   Doubles: bring 4 of 6 (leads 1-2, bench 3-4)
  //   Singles: bring 3 of 6 (lead 1, bench 2-3)
  // Caller passes opts.playerBring / opts.opponentBring — arrays of Pokemon
  // names in picked order. Names not in bring list are EXCLUDED from battle.
  // Legacy opts.playerLeads / opts.opponentLeads still supported: leads occupy
  // indices 0-1 and the rest of the team fills remaining slots in original order.
  //   Cite: https://bulbapedia.bulbagarden.net/wiki/Team_Preview
  //   Cite: https://bulbapedia.bulbagarden.net/wiki/VGC
  const _bringCount = (field._format === 'singles') ? 3 : 4;
  function _applyBring(pokemonArr, bringNames, leadNames) {
    // Prefer explicit bring list. Falls back to lead list (legacy T9j.10 early rev).
    const useBring = Array.isArray(bringNames) && bringNames.length > 0;
    const names = useBring ? bringNames : (Array.isArray(leadNames) ? leadNames : []);
    if (names.length === 0) return pokemonArr.slice(); // no override — use team order as-is (return copy; caller clears original)
    const picked = [];
    const rest = pokemonArr.slice();
    for (const name of names) {
      if (picked.length >= _bringCount) break;
      const idx = rest.findIndex(p => p.name === name);
      if (idx >= 0) picked.push(rest.splice(idx, 1)[0]);
    }
    // When explicit bring list is given, unbrought mons DO NOT enter battle.
    // When only leads given (legacy), keep the rest as bench so teams still have switches.
    if (useBring) {
      // Pad with original-order filler only if picks are short (invalid names etc).
      while (picked.length < _bringCount && rest.length) picked.push(rest.shift());
      return picked;
    }
    return picked.concat(rest);
  }
  const _orderedPlayer = _applyBring(playerPokemon, opts.playerBring,   opts.playerLeads);
  const _orderedOpp    = _applyBring(oppPokemon,    opts.opponentBring, opts.opponentLeads);
  // Replace the array contents in place so any downstream references still work.
  playerPokemon.length = 0; for (const p of _orderedPlayer) playerPokemon.push(p);
  oppPokemon.length    = 0; for (const p of _orderedOpp)    oppPokemon.push(p);

  // T9j.7 — apply Mega trigger policy override from sweep driver.
  // When runMegaTriggerSweep() calls simulateBattle with _megaPolicyOverride,
  // we stamp every Mega-capable mon on the target side with the requested
  // policy and trigger turn. Only affects mons with megaForm set.
  if (opts._megaPolicyOverride) {
    const ov = opts._megaPolicyOverride;
    const targets = (ov.side === 'opp') ? oppPokemon : playerPokemon;
    for (const m of targets) {
      if (!m.megaForm) continue;
      m.megaPolicy      = ov.policy || m.megaPolicy;
      m.megaTriggerTurn = (typeof ov.triggerTurn === 'number') ? ov.triggerTurn : m.megaTriggerTurn;
    }
  }

  // Active battlers (doubles: 2 per side)
  let playerActive = [playerPokemon[0], playerPokemon[1]].filter(Boolean);
  let oppActive    = [oppPokemon[0],    oppPokemon[1]   ].filter(Boolean);
  let playerBench  = playerPokemon.slice(2);
  let oppBench     = oppPokemon.slice(2);

  // T9j.1 (Issue #25) — wire every Pokemon to its side object so that
  // screens, Tailwind speed, and Last Respects fainted count all work.
  for (const m of playerPokemon) m.side = field.playerSide;
  for (const m of oppPokemon)    m.side = field.oppSide;
  // Expose fainted count on side objects so calcDamage's Last Respects
  // lookup (target.side.fainted) reads real state.
  field.playerSide.fainted = 0;
  field.oppSide.fainted    = 0;

  // Track fainted counts per side for Last Respects
  const sideFainted = { player: 0, opp: 0 };

  // Apply on-entry abilities
  function applyEntryAbility(mon, side, field, log) {
    if (mon.ability === 'Intimidate') {
      const targets = side === 'player' ? oppActive : playerActive;
      for (const t of targets) {
        if (t.alive && t.ability !== 'Inner Focus' && t.ability !== 'Own Tempo' && t.ability !== 'Oblivious') {
          t.statBoosts.atk = Math.max(-6, t.statBoosts.atk - 1);
          log.push(`${mon.name}'s Intimidate lowered ${t.name}'s Attack!`);
        }
      }
    }
    if (mon.ability === 'Drought')       { field.weather = 'sun';  field.weatherTurns = 5; log.push(`${mon.name} summoned harsh sunlight!`); }
    if (mon.ability === 'Drizzle')       { field.weather = 'rain'; field.weatherTurns = 5; log.push(`${mon.name} summoned rain!`); }
    if (mon.ability === 'Sand Stream')   { field.weather = 'sand'; field.weatherTurns = 5; log.push(`${mon.name} summoned a sandstorm!`); }
    if (mon.ability === 'Snow Warning')  { field.weather = 'snow'; field.weatherTurns = 5; log.push(`${mon.name} summoned snow!`); }
    if (mon.ability === 'Hospitality' && side === 'player') {
      const ally = playerActive.find(a => a !== mon && a.alive);
      if (ally) { ally.hp = Math.min(ally.maxHp, ally.hp + Math.floor(ally.maxHp * 0.25)); log.push(`${mon.name}'s Hospitality restored ${ally.name}'s HP!`); }
    }
    // T9j.17 (Refs #44) -- Terrain Seed switch-in trigger.
    // Grassy/Electric/Misty/Psychic Seed give +1 Def or +1 SpD when the
    // matching terrain is already active as the holder switches in. Item is
    // consumed in the process. Helper handles ungrounded skip + match logic.
    if (typeof tryTerrainSeed === 'function') tryTerrainSeed(mon, field, log);
  }

  for (const m of playerActive) applyEntryAbility(m, 'player', field, log);
  for (const m of oppActive)    applyEntryAbility(m, 'opp', field, log);

  // ============================================================
  // GREEDY MOVE SELECTION
  // Scores moves by expected damage or utility value.
  // ============================================================
  function selectMove(attacker, allies, enemies, field) {
    // T9j.6 (#18) — Choice Scarf lock enforcement. If holder already used a move
    // and still has it legal, must use same move. Cite: Bulbapedia Choice Scarf.
    if (attacker.item === 'Choice Scarf' && attacker.choiceLock &&
        attacker.moves.includes(attacker.choiceLock)) {
      const liveEnemies = enemies.filter(e => e.alive);
      const target = liveEnemies[0] || allies.find(a => a !== attacker && a.alive) || null;
      return { move: attacker.choiceLock, target };
    }
    const STATUS_MOVES = new Set(['Will-O-Wisp','Thunder Wave','Taunt','Sleep Powder',
      'Tailwind','Sunny Day','Trick Room','Life Dew','Rage Powder','Roost','Parting Shot','Shed Tail',
      // T9j.3 Screens setters
      'Light Screen','Reflect','Aurora Veil']);
    const PRIORITY_MOVES = new Set(['Fake Out','Aqua Jet','Extreme Speed','Shadow Sneak']);

    let best = { move: null, target: null, score: -Infinity };

    const liveEnemies = enemies.filter(e => e.alive);
    const liveAllies  = allies.filter(a => a !== attacker && a.alive);

    for (const move of attacker.moves) {
      const moveType = MOVE_TYPES[move] || 'Normal';

      // Status/utility scoring
      if (STATUS_MOVES.has(move)) {
        let score = 0;
        if (move === 'Trick Room' && !field.trickRoom) score = 55;
        if (move === 'Tailwind'   && !field[attacker.side === 'player' ? 'playerSide' : 'oppSide']?.tailwind) score = 50;
        // T9j.3 Screens scoring — value them when not already up.
        const _selfSide = field[attacker.side === 'player' ? 'playerSide' : 'oppSide'];
        if (move === 'Light Screen' && _selfSide && !_selfSide.lightScreen) score = 42;
        if (move === 'Reflect'      && _selfSide && !_selfSide.reflect)     score = 42;
        if (move === 'Aurora Veil' && _selfSide && !_selfSide.auroraVeil
            && (field.weather === 'hail' || field.weather === 'snow')) score = 52;
        if (move === 'Will-O-Wisp' && liveEnemies.length) {
          const target = liveEnemies.find(e => !e.status) || liveEnemies[0];
          if (target && !target.status && target.types.every(t => t !== 'Fire')) {
            if (best.score < 45) { best = { move, target, score: 45 }; }
          }
          continue;
        }
        if (move === 'Life Dew' && liveAllies.some(a => a.hp < a.maxHp * 0.6)) score = 40;
        if (move === 'Rage Powder' && liveAllies.some(a => !a.alive)) score = 35;
        if (move === 'Roost' && attacker.hp < attacker.maxHp * 0.5) score = 45;
        if (score > best.score) best = { move, target: liveEnemies[0] || null, score };
        continue;
      }

      // Priority move logic
      if (PRIORITY_MOVES.has(move)) {
        // T9j.17 (Refs #101) -- Fake Out hard-gate: skip selection entirely past
        // first turn out. Previously it fell through to the damage-scoring loop
        // below, which let the AI "select" Fake Out turn 2+ as a 40-BP attack.
        // Champions rule: Fake Out is only legal on the user's first turn out.
        // Cite: https://bulbapedia.bulbagarden.net/wiki/Fake_Out_(move)
        if (move === 'Fake Out') {
          if (attacker._fakeDone) continue; // illegal selection -- skip entirely
          const target = liveEnemies[0];
          if (target) {
            const dmg = attacker.calcDamage(move, target, field, null, rng);
            const score = dmg / target.maxHp * 100 + 25;
            if (score > best.score) best = { move, target, score };
          }
          continue;
        }
      }

      // Damage scoring — pick highest damage target
      for (const target of liveEnemies) {
        const dmg = attacker.calcDamage(move, target, field, null, rng);
        // Score: damage fraction + KO bonus + priority bonus
        let score = dmg / target.maxHp * 100;
        if (dmg >= target.hp) score += 50; // KO bonus
        if (PRIORITY_MOVES.has(move)) score += 10;
        if (score > best.score) best = { move, target, score };
      }
    }

    // Fallback
    if (!best.move) {
      best.move   = attacker.moves[0] || 'Tackle';
      best.target = liveEnemies[0] || allies[0];
    }
    return best;
  }

  // ============================================================
  // EXECUTE ACTION
  // ============================================================
  function executeAction(attacker, move, target, allies, enemies, field, log, rng) {
    if (!attacker.alive) return;
    if (!move) return;

    // T9j.6 (#18) — Choice Scarf lock SET on first move used. Exempt utility
    // moves that break/transfer the lock per Bulbapedia (Trick, Switcheroo).
    if (attacker.item === 'Choice Scarf' && !attacker.choiceLock &&
        move !== 'Trick' && move !== 'Switcheroo' && move !== 'Struggle') {
      attacker.choiceLock = move;
    }

    // T9j.2 (#31) — if side uses ANY non-Wide-Guard move this turn, reset chain.
    if (move !== 'Wide Guard') {
      const wgSide = (allies === playerActive) ? field.playerSide : field.oppSide;
      if (wgSide && wgSide.wideGuardChain > 0) wgSide.wideGuardChain = 0;
    }

    const moveType = MOVE_TYPES[move] || 'Normal';
    const PROTECT_MOVES = new Set(['Protect','Wide Guard','Quick Guard']);
    const STATUS_MOVES  = new Set(['Will-O-Wisp','Thunder Wave','Taunt','Sleep Powder',
      'Tailwind','Sunny Day','Trick Room','Life Dew','Rage Powder','Roost','Parting Shot','Shed Tail',
      // T9j.2 additions — side-state setters
      'Wide Guard','Follow Me','Quick Guard',
      // T9j.3 Screens setters
      'Light Screen','Reflect','Aurora Veil']);

    // Attacker must be alive
    if (!attacker.alive) return;

    // Handle Protect (self only — Wide Guard/Quick Guard handled in status branch below)
    if (move === 'Protect' || move === 'Detect') {
      attacker.protected = true;
      log.push(`${attacker.name} used ${move}!`);
      return;
    }

    // Status moves
    if (STATUS_MOVES.has(move)) {
      log.push(`${attacker.name} used ${move}!`);
      if (move === 'Trick Room') {
        if (field.trickRoom) {
          field.trickRoom = false;
          field.trickRoomTurns = 0;
          log.push('Trick Room returned to NORMAL!');
        } else {
          field.trickRoom = true;
          field.trickRoomTurns = 5;
          log.push('Trick Room was set! Slower Pokémon go first!');
        }
      }
      if (move === 'Tailwind') {
        const side = allies === playerActive ? field.playerSide : field.oppSide;
        side.tailwind = true;
        side.tailwindTurns = 4;
        log.push(`${attacker.name}'s Tailwind is blowing!`);
      }
      // T9j.3 Screens setters. Duration fixed at 5 turns. Light Clay absent
      // from Champions (games.gg, Game8); T9j.6 closed #43 as WONTFIX — no
      // 5→8 extension applies.
      //    Cite: https://games.gg/news/pokemon-champions-items-list-meta/
      if (move === 'Light Screen') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        side.lightScreen = true;
        side.lightScreenTurns = 5;
        log.push(`${attacker.name} raised a Light Screen!`);
        return;
      }
      if (move === 'Reflect') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        side.reflect = true;
        side.reflectTurns = 5;
        log.push(`${attacker.name} raised a Reflect!`);
        return;
      }
      if (move === 'Aurora Veil') {
        // Gated: Aurora Veil only succeeds if hail/snow active at cast time.
        const wx = field.weather;
        if (wx !== 'hail' && wx !== 'snow') {
          log.push(`${attacker.name} used Aurora Veil! But it failed (no hail/snow).`);
          return;
        }
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        side.auroraVeil = true;
        side.auroraVeilTurns = 5;
        log.push(`${attacker.name} activated Aurora Veil!`);
        return;
      }
      // T9j.2 (#31) — Wide Guard with 1/3 consecutive-use diminishing returns.
      if (move === 'Wide Guard') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        const chainChance = (side.wideGuardChain === 0) ? 1.0 : Math.pow(1/3, side.wideGuardChain);
        if (rng() < chainChance) {
          side.wideGuard = true;
          side.wideGuardChain++;
          log.push(`${attacker.name} protected its team with Wide Guard!`);
        } else {
          side.wideGuardChain = 0;
          log.push(`${attacker.name}'s Wide Guard failed!`);
        }
        return;
      }
      if (move === 'Quick Guard') {
        attacker.protected = true;  // minimal: treat as self-protect for now (Refs: separate priority-only QG ticket)
        log.push(`${attacker.name} used Quick Guard!`);
        return;
      }
      // T9j.2 (#32) — Follow Me / Rage Powder set side redirect flag.
      if (move === 'Follow Me') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        side.redirectTo = attacker;
        side.redirectType = 'followMe';
        log.push(`${attacker.name} became the center of attention!`);
        return;
      }
      if (move === 'Rage Powder') {
        const side = (allies === playerActive) ? field.playerSide : field.oppSide;
        side.redirectTo = attacker;
        side.redirectType = 'ragePowder';
        log.push(`${attacker.name} became the center of attention!`);
        return;
      }
      if (move === 'Sunny Day') { field.weather = 'sun'; field.weatherTurns = 5; log.push('The sunlight turned harsh!'); }
      if (move === 'Rain Dance') { field.weather = 'rain'; field.weatherTurns = 5; log.push('It started to rain!'); }
      if (move === 'Will-O-Wisp' && target && target.alive && !target.status && !target.types.includes('Fire')) {
        // Miss chance 15%
        if (rng() < 0.15) { log.push(`${attacker.name}'s Will-O-Wisp missed!`); return; }
        target.status = 'burn'; log.push(`${target.name} was burned by ${attacker.name}'s Will-O-Wisp!`);
        target.applyItem('status', field);
      }
      if (move === 'Thunder Wave' && target && target.alive && !target.status && !target.types.includes('Electric') && !target.types.includes('Ground')) {
        target.status = 'paralysis'; log.push(`${target.name} is paralysed! It may be unable to move!`);
      }
      // T9j.4 (#41) — Toxic / Poison Powder inflict paths. Gate via canInflictStatus.
      if (move === 'Toxic' && target && target.alive &&
          canInflictStatus(target, 'toxic', field)) {
        if (rng() < 0.10) { log.push(`${attacker.name}'s Toxic missed!`); return; }
        target.status = 'toxic';
        target.toxicCounter = 1;
        log.push(`${target.name} was badly poisoned!`);
      }
      if (move === 'Poison Powder' && target && target.alive &&
          canInflictStatus(target, 'poison', field) && !target.types.includes('Grass')) {
        if (rng() < 0.25) { log.push(`${attacker.name}'s Poison Powder missed!`); return; }
        target.status = 'poison';
        log.push(`${target.name} was poisoned!`);
      }
      if (move === 'Sleep Powder' && target && target.alive && !target.status) {
        if (rng() < 0.25) { log.push(`${attacker.name}'s Sleep Powder missed!`); return; }
        target.status = 'sleep'; target.statusTurns = 2 + Math.floor(rng() * 2);
        target.sleepTurns = 0;
        log.push(`${target.name} fell asleep from ${attacker.name}'s Sleep Powder!`);
      }
      if (move === 'Life Dew') {
        for (const a of allies.filter(a => a.alive)) {
          const heal = Math.floor(a.maxHp * 0.25);
          a.hp = Math.min(a.maxHp, a.hp + heal);
          log.push(`${a.name} had its HP restored by Life Dew!`);
        }
      }
      if (move === 'Roost') {
        const heal = Math.floor(attacker.maxHp * 0.5);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        log.push(`${attacker.name} restored HP with Roost!`);
      }
      if (move === 'Parting Shot' && target && target.alive) {
        target.statBoosts.atk = Math.max(-6, target.statBoosts.atk - 1);
        target.statBoosts.spa = Math.max(-6, target.statBoosts.spa - 1);
        log.push(`${attacker.name}'s Parting Shot lowered ${target.name}'s offenses!`);
      }
      if (move === 'Shed Tail') {
        attacker.substituteHp = Math.floor(attacker.maxHp * 0.25);
        attacker.hp -= attacker.substituteHp;
        log.push(`${attacker.name} shed its tail and created a Substitute!`);
      }
      return;
    }

    // T9j.17 (Refs #101) -- Fake Out hard-gate enforced inside executeAction.
    // selectMove already filters Fake Out past turn 1, so this branch is a
    // safety net for forced-move paths (Encore lock, imported test moves).
    // Champions rule: if a Pokemon is forced into Fake Out past its first turn
    // out, the move fails and the user Struggles instead (mirrors Encore -> Struggle
    // when no legal move remains). Cite: https://bulbapedia.bulbagarden.net/wiki/Fake_Out
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Encore_(move)
    //
    // PLACEMENT: this block lives ABOVE the Protect check so that even when
    // a legal Fake Out is blocked by Protect, the _fakeDone flag is still set --
    // i.e. the user has spent its one Fake Out window for this stay on the field.
    if (move === 'Fake Out') {
      if (attacker._fakeDone) {
        log.push(`${attacker.name} tried Fake Out -- but it failed! (only on first turn out)`);
        // Encore -> Struggle path: deal 1/4 max HP fixed damage to a live
        // enemy and recoil 1/4 max HP. Standard Struggle resolution.
        // Cite: https://bulbapedia.bulbagarden.net/wiki/Struggle
        const _struggleTgt = (target && target.alive) ? target : enemies.find(e => e.alive);
        if (_struggleTgt && _struggleTgt.alive) {
          const _stDmg = Math.max(1, Math.floor(_struggleTgt.maxHp * 0.25));
          applyDamage(attacker, 'Struggle', _struggleTgt, _stDmg, field, log, rng);
        }
        const _stRecoil = Math.max(1, Math.floor(attacker.maxHp * 0.25));
        attacker.hp = Math.max(0, attacker.hp - _stRecoil);
        log.push(`${attacker.name} is hit by Struggle recoil! [${_stRecoil} dmg]`);
        if (attacker.hp === 0) {
          attacker.alive = false;
          log.push(`${attacker.name} fainted from Struggle recoil!`);
          _recordKO(attacker, { move: 'Struggle', attacker: attacker, reason: 'recoil' });
        }
        return;
      }
      // Mark the Fake Out window consumed BEFORE the Protect check so that a
      // Protect-blocked Fake Out still counts as the user's one attempt.
      attacker._fakeDone = true;
    }

    // Skip if target protected.
    // T9j.8 (Refs #30): Piercing Drill / Unseen Fist piercing paths are resolved
    // inside executeMove (per-target loop). Utility branches reaching THIS block
    // (U-turn / Flip Turn / Dragon Darts below) fall through to those specific
    // handlers, which all delegate to applyDamage directly -- and currently treat
    // Protect as full block. Keeping default full-block here preserves parity
    // with pre-T9j.8 behavior for those narrow paths.
    if (target && target.protected) {
      log.push(`${attacker.name} used ${move}! But ${target.name} was protected!`);
      return;
    }

    // Miss chance for low-accuracy moves
    const ACC_MAP = { 'Focus Blast':0.70, 'Hydro Pump':0.80, 'Blizzard':0.70,
                     'Thunder':0.70, 'Hurricane':0.70, 'Sleep Powder':0.75,
                     'Will-O-Wisp':0.85, 'High Horsepower':0.95, 'Dire Claw':1.0 };
    const acc = ACC_MAP[move] || 1.0;
    if (rng() > acc) {
      log.push(`${attacker.name} used ${move}! It missed!`);
      return;
    }

    // Helping Hand: boost ally
    if (move === 'Helping Hand') {
      const ally = allies.find(a => a !== attacker && a.alive);
      if (ally) {
        ally.helpingHand = true;
        log.push(`${attacker.name} used Helping Hand for ${ally.name}!`);
      }
      return;
    }

    // U-turn / Flip Turn: damage + switch
    if (move === 'U-turn' || move === 'Flip Turn') {
      if (target && target.alive) {
        const dmg = attacker.calcDamage(move, target, field, null, rng);
        applyDamage(attacker, move, target, dmg, field, log, rng);
        log.push(`${attacker.name} pivoted out!`);
      }
      return;
    }

    // Dragon Darts: hits twice, targets split between enemies
    if (move === 'Dragon Darts') {
      const darts = 2;
      const targets = enemies.filter(e => e.alive);
      for (let d = 0; d < darts; d++) {
        const t = targets[d % targets.length];
        if (t) {
          const dmg = attacker.calcDamage(move, t, field, null, rng);
          applyDamage(attacker, move, t, dmg, field, log, rng);
        }
      }
      return;
    }

    // T9j.2 (Issue #26) — per-target damage via executeMove wrapper.
    // Handles spread, Wide Guard, Follow Me/Rage Powder redirection,
    // per-target type eff, and format-aware 0.75× mod.
    // T9j.8 (Refs #30) Parental Bond: Kangaskhan-Mega single-target damaging
    // moves strike twice. Second strike fires at 1/4 BP via field._ctx.bpMult.
    // Spread moves (all-adjacent, all-foes) do NOT get the second strike per
    // mainline behavior (Bulbapedia Parental Bond). Status, multi-hit moves
    // (Dragon Darts / Bone Rush), and fainted attackers also skip the 2nd hit.
    const _isParentalBond = (attacker.ability === 'Parental Bond');
    const _tCat = (typeof getMoveTarget === 'function') ? getMoveTarget(move) : 'normal';
    const _isSingleTargetDamage = (_tCat === 'normal' || _tCat === 'adjacent-foe');
    const _skipSecond = new Set(['Dragon Darts','Bone Rush','U-turn','Flip Turn','Fake Out']);
    const _pbEligible = _isParentalBond && _isSingleTargetDamage && !_skipSecond.has(move);
    executeMove(attacker, move, target, allies, enemies, field, log, rng);
    if (_pbEligible && attacker.alive && target && target.alive) {
      // Second strike at 1/4 BP per Champions nerf (was 1/2 in mainline).
      // Cite: https://game8.co/games/Pokemon-Champions/archives/590403
      field._ctx.bpMult = 0.25;
      executeMove(attacker, move, target, allies, enemies, field, log, rng);
      field._ctx.bpMult = 1;
      log.push(`${attacker.name} struck again with Parental Bond!`);
    }
  }

  // ============================================================
  // T9j.2 — executeMove: per-target damage resolution
  // Refs #26 (spread), #31 (Wide Guard), #32 (Follow Me/Rage Powder),
  //      #33 (MOVE_TARGETS registry)
  // ============================================================
  function executeMove(attacker, move, intendedTarget, allies, enemies, field, log, rng) {
    const format = (opts && opts.format) || 'doubles';
    const isDoubles = (format !== 'singles');
    let targetCat = (typeof getMoveTarget === 'function')
      ? getMoveTarget(move)
      : 'normal';

    // T9j.17 (Refs #36) -- Expanding Force x Psychic Terrain dynamic target.
    // When the user is grounded AND Psychic Terrain is active, Expanding Force
    // becomes a spread move hitting all adjacent foes and gets a 1.5x BP boost.
    // Ungrounded users (Flying-type or Levitate) keep the default single-target.
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Expanding_Force_(move)
    // Cite: https://game8.co/games/Pokemon-Champions/archives/590403
    const _prevBpMult = (field._ctx && field._ctx.bpMult) || 1;
    let _bpMultPushed = false;
    if (move === 'Expanding Force' && field.terrain === 'psychic' && !attacker.flying) {
      targetCat = 'all-adjacent-foes';
      field._ctx.bpMult = _prevBpMult * 1.5;
      _bpMultPushed = true;
      log.push(`${attacker.name}'s Expanding Force surged through the Psychic Terrain!`);
    }

    const liveEnemies = enemies.filter(e => e.alive);
    const liveAllies  = allies.filter(a => a !== attacker && a.alive);

    // Resolve valid targets by category.
    let targets = [];
    switch (targetCat) {
      case 'all-adjacent':
        targets = isDoubles ? [...liveEnemies, ...liveAllies] : liveEnemies.slice(0, 1);
        break;
      case 'all-adjacent-foes':
        targets = isDoubles ? liveEnemies : liveEnemies.slice(0, 1);
        break;
      case 'all-foes':
        targets = liveEnemies;
        break;
      case 'random-foe':
        if (liveEnemies.length > 0) {
          targets = [liveEnemies[Math.floor(rng() * liveEnemies.length)]];
        }
        break;
      case 'all-allies':
      case 'self':
        targets = intendedTarget ? [intendedTarget] : [attacker];
        break;
      case 'normal':
      case 'adjacent-foe':
      default: {
        let t = intendedTarget;
        // T9j.2 (#32) — redirection: single-target moves to a side with redirectTo
        if (t && t.side) {
          const rTo = t.side.redirectTo;
          const rType = t.side.redirectType;
          if (rTo && rTo.alive && rTo !== attacker) {
            let bypass = false;
            if (rType === 'ragePowder') {
              if (attacker.types.includes('Grass')) bypass = true;
              if (attacker.ability === 'Overcoat') bypass = true;
              if (attacker.item === 'Safety Goggles') bypass = true;
            }
            if (!bypass) {
              log.push(`${attacker.name}'s attack was drawn to ${rTo.name}!`);
              t = rTo;
            }
          }
        }
        targets = (t && t.alive) ? [t] : [];
        break;
      }
    }

    if (targets.length === 0) {
      log.push(`${attacker.name} used ${move}! (no valid target)`);
      return;
    }

    const isSpread =
      targetCat === 'all-adjacent' ||
      targetCat === 'all-adjacent-foes' ||
      targetCat === 'all-foes';

    // T9j.2 (#31) — Wide Guard filter on damaging spread moves.
    // Haze / Perish Song are non-damaging 'all-foes' status; spec says WG does NOT
    // block them. They're routed through the status-move branch above and never
    // reach executeMove, so no additional gate needed.
    if (isSpread) {
      targets = targets.filter(t => {
        if (t === attacker) return true;
        if (t.side && t.side.wideGuard) {
          log.push(`Wide Guard blocked ${move} on ${t.name}!`);
          return false;
        }
        return true;
      });
      if (targets.length === 0) return;
    }

    const applySpreadMod = isSpread && isDoubles && targets.length > 1;

    // Miss check — single roll for whole move (VGC spread behavior)
    const ACC_MAP = { 'Focus Blast':0.70, 'Hydro Pump':0.80, 'Blizzard':0.70,
                      'Thunder':0.70, 'Hurricane':0.70, 'Sleep Powder':0.75,
                      'Will-O-Wisp':0.85, 'High Horsepower':0.95, 'Dire Claw':1.0,
                      'Rock Slide':0.90, 'Heat Wave':0.90 };
    const acc = ACC_MAP[move] || 1.0;
    if (rng() > acc) {
      log.push(`${attacker.name} used ${move}! It missed!`);
      if (_bpMultPushed) field._ctx.bpMult = _prevBpMult;
      return;
    }

    // T9j.17 (Refs #101) -- Piercing Drill 25% miss chance on every move.
    // Replaces the prior contact-bypass-Protect interpretation. The roll fires
    // here (after the move is selected and the standard ACC_MAP roll passes)
    // so it stacks correctly with low-accuracy moves.
    // Cite: https://game8.co/games/Pokemon-Champions/archives/590403
    if (attacker.ability === 'Piercing Drill' && rng() < 0.25) {
      log.push(`${attacker.name} used ${move}! But Piercing Drill missed!`);
      if (_bpMultPushed) field._ctx.bpMult = _prevBpMult;
      return;
    }

    log.push(`${attacker.name} used ${move}!`);

    // Speed order so faints register correctly mid-spread
    const ordered = [...targets].sort((a, b) =>
      (b.getEffSpeed ? b.getEffSpeed(field) : 0) - (a.getEffSpeed ? a.getEffSpeed(field) : 0)
    );

    for (const t of ordered) {
      if (!t.alive) continue;
      // T9j.8 (Refs #30) Protect resolution: Piercing Drill / Unseen Fist deal
      // 25% damage through Protect on contact moves. Default path is full block.
      let _protectMult = 0;
      if (t.protected) {
        const _isContact = CONTACT_MOVES.has(move);
        const _protRes = callAbilityHook(attacker, 'onProtectResolve', {
          attacker: attacker, defender: t, move: move,
          moveType: (MOVE_TYPES[move] || 'Normal'), isContact: _isContact, log: log
        });
        if (_protRes && _protRes.damageMult > 0) {
          _protectMult = _protRes.damageMult;
          log.push(`${t.name} protected itself, but ${attacker.ability} pierced through!`);
        } else {
          log.push(`${t.name} protected itself!`);
          continue;
        }
      }
      // Set spread context for calcDamage
      field._ctx.isSpread = applySpreadMod;
      field._ctx.lastWasCrit = false;
      let dmg = attacker.calcDamage(move, t, field, null, rng);
      const _wasCrit = !!field._ctx.lastWasCrit;
      field._ctx.isSpread = false;
      field._ctx.lastWasCrit = false;
      if (_protectMult > 0 && dmg > 0) dmg = Math.max(1, Math.floor(dmg * _protectMult));
      if (dmg > 0) {
        if (_wasCrit) log.push(`A critical hit!`);
        applyDamage(attacker, move, t, dmg, field, log, rng);
        // T9j.8 (Refs #19) Flinch roll: after damage applied, target alive,
        // target hasn't acted yet. Fang moves roll flinch + status independently.
        if (t.alive) {
          const _flinch = FLINCH_MOVES[move];
          if (_flinch && !t.hasActed && rng() < _flinch.chance) {
            t._flinched = true;
            log.push(`${t.name} flinched and couldn't move!`);
          }
        }
      } else {
        log.push(`${move} had no effect on ${t.name}!`);
      }
      if (!attacker.alive) break;
    }
    // Restore the prior bpMult so we don't leak the 1.5x onto a Parental Bond
    // second strike or any subsequent move.
    if (_bpMultPushed) field._ctx.bpMult = _prevBpMult;
  }

  function applyDamage(attacker, move, target, dmg, field, log, rng) {
    if (dmg <= 0) return;
    let finalDmg = dmg;
    // Substitute absorb
    if (target.substituteHp > 0) {
      target.substituteHp -= finalDmg;
      if (target.substituteHp <= 0) { target.substituteHp = 0; log.push(`${target.name}'s Substitute was destroyed!`); }
      else log.push(`${attacker.name} used ${move}! (Substitute absorbed ${finalDmg} dmg)`);
      return;
    }
    // T9j.6 (#8) — Focus Sash: snapshot full-HP state BEFORE damage mutation.
    // Cite: Bulbapedia Focus Sash.
    const wasFullHp = (target.hp === target.maxHp);
    target.hp = Math.max(0, target.hp - finalDmg);
    // T9j.6 (#8) — Focus Sash survives a KO from full HP; consumed.
    let sashSaved = false;
    if (target.hp === 0 && target.item === 'Focus Sash' && !target.itemConsumed && wasFullHp) {
      target.hp = 1;
      target.itemConsumed = true;
      sashSaved = true;
    }
    log.push(`${attacker.name} used ${move}! → ${target.name} [${finalDmg} dmg, ${target.hp}/${target.maxHp} HP]`);
    if (sashSaved) log.push(`${target.name} hung on with its Focus Sash!`);
    // T9j.4 (#41) — Fire-move thaw on hit. Any damaging Fire move thaws target.
    // Cite: Bulbapedia Freeze.
    if (target.status === 'frozen' && finalDmg > 0 && target.hp > 0 &&
        (MOVE_TYPES[move] || 'Normal') === 'Fire') {
      target.status = null;
      target.frozenTurns = 0;
      log.push(`${target.name} was thawed out by ${attacker.name}'s ${move}!`);
    }
    // Recoil
    if (move === 'Flare Blitz' || move === 'Head Smash' || move === 'Wave Crash') {
      const recoil = Math.floor(finalDmg / 3);
      attacker.hp = Math.max(0, attacker.hp - recoil);
      log.push(`${attacker.name} was hurt by recoil! [${recoil} dmg]`);
    }
    // T9j.6 (#11 WONTFIX) — Life Orb recoil removed; item absent from Champions.
    // Berry check after damage
    const berryMsg = target.applyItem('damage', field);
    if (berryMsg) log.push(berryMsg);
    // Multiscale: deactivate after first hit
    target.multiscaleActive = false;
    if (target.hp === 0) { target.alive = false; log.push(`${target.name} fainted!`); _recordKO(target, { move: move, attacker: attacker, reason: 'attack' }); }
    // T9j.8 (Refs #30) onDamageTaken hook: Spicy Spray burns attacker.
    // Fires only if target still alive AND damage > 0.
    if (target.alive && finalDmg > 0) {
      callAbilityHook(target, 'onDamageTaken', {
        attacker: attacker, defender: target, move: move,
        moveType: (MOVE_TYPES[move] || 'Normal'),
        damage: finalDmg, field: field, log: log
      });
    }
  }

  // ============================================================
  // MAIN BATTLE LOOP
  // ============================================================
  let turn = 0;
  // Phase 4a (Refs #52) — structured KO event log for dynamic coaching.
  // Populated at every faint site below. UI reads this instead of parsing
  // log strings (fragile). Shape:
  //   { turn, victim, side: 'player'|'opp', byMove, byAttacker, reason }
  // reason: 'attack' | 'recoil' | 'sandstorm' | 'burn' | 'frostbite'
  //       | 'poison' | 'toxic'
  const koEvents = [];
  // Phase 4b (Refs #52) — per-mon move-call histogram + max-consecutive-Protect
  // streak. Used by UI to detect dead moves and Protect misuse.
  //   movesUsed[mon.name][side] = { moveName: callCount, ... }
  //   protectStreakMax[mon.name+side] = peak consecutive turns this mon chose
  //     a Protect family move. Reset on any non-Protect action.
  const movesUsed = { player: {}, opp: {} };
  const _protectFamily = new Set(['Protect','Detect','Wide Guard','Quick Guard']);
  const _protectStreak = {};     // running count keyed by side:name
  const _protectStreakMax = {};  // observed peak keyed by side:name
  const _recordAction = function(action) {
    try {
      if (!action || !action.attacker || !action.move) return;
      const side = action.side;
      const name = action.attacker.name;
      if (!movesUsed[side][name]) movesUsed[side][name] = {};
      movesUsed[side][name][action.move] = (movesUsed[side][name][action.move] || 0) + 1;
      const key = side + ':' + name;
      if (_protectFamily.has(action.move)) {
        _protectStreak[key] = (_protectStreak[key] || 0) + 1;
        if (_protectStreak[key] > (_protectStreakMax[key] || 0)) {
          _protectStreakMax[key] = _protectStreak[key];
        }
      } else {
        _protectStreak[key] = 0;
      }
    } catch (_e) { /* never kill sim for telemetry */ }
  };
  const _recordKO = function(mon, cause) {
    try {
      const side = (playerPokemon.indexOf(mon) >= 0) ? 'player' : 'opp';
      koEvents.push({
        turn: turn,
        victim: mon.name,
        side: side,
        byMove: (cause && cause.move) || null,
        byAttacker: (cause && cause.attacker) ? cause.attacker.name : null,
        reason: (cause && cause.reason) || 'unknown'
      });
    } catch (_e) { /* never let logging kill the sim */ }
  };
  // T9j.3 (#39): raised from 25 → 30 so timer-draw (28-turn budget at 15s/turn)
  // can actually resolve before the hard cap. Stall mirrors will now reach timer.
  const MAX_TURNS = 30;

  while (turn < MAX_TURNS) {
    turn++;
    log.push(`--- Turn ${turn} ---`);

    // Clear per-turn flags
    for (const m of [...playerActive, ...oppActive]) {
      m.hasActed = false;
      m.protected = false;
      m.helpingHand = false;
      // T9j.8 (Refs #19) Flinch flag resets at top of turn so last-turn flinch
      // cannot bleed into this turn's action.
      m._flinched = false;
    }

    // Check win condition
    const pAlive = playerActive.filter(m => m.alive).length + playerBench.filter(m => m.alive).length;
    const oAlive = oppActive.filter(m => m.alive).length + oppBench.filter(m => m.alive).length;
    if (pAlive === 0 || oAlive === 0) break;

    // --------------------------------------------------------
    // T9j.7 — MEGA EVOLUTION PHASE
    // Champions rule: one Mega per team per match, persists through switch
    // and even after faint. Triggers at start of turn, after switches, before
    // moves. Simultaneous Megas resolve by speed with RNG tiebreak (documented
    // Champions behavior is 'random' per Game8 Known Bugs; speed+RNG is a
    // deterministic spec choice for sim reproducibility).
    // Source: https://game8.co/games/Pokemon-Champions/archives/592472
    //         https://bulbapedia.bulbagarden.net/wiki/Priority
    // --------------------------------------------------------
    function tryMegaPhase(activeArr, sideFlagKey) {
      if (field[sideFlagKey]) return;
      const candidates = activeArr.filter(m => shouldMegaThisTurn(m, turn));
      if (candidates.length === 0) return;
      candidates.sort((a, b) => {
        const sA = a.getEffSpeed(field);
        const sB = b.getEffSpeed(field);
        if (sA !== sB) return sB - sA;
        return rng() < 0.5 ? -1 : 1;
      });
      // One per team: only the first (fastest / coin-flip) evolves.
      candidates[0].megaEvolve(log);
      field[sideFlagKey] = true;
    }
    tryMegaPhase(playerActive, 'playerMegaUsed');
    tryMegaPhase(oppActive,    'oppMegaUsed');

    // --------------------------------------------------------
    // BUILD ACTION QUEUE
    // --------------------------------------------------------
    const actions = [];

    for (const mon of playerActive.filter(m => m.alive)) {
      const { move, target } = selectMove(mon, playerActive, oppActive, field);
      const _act = { attacker:mon, move, target, side:'player', priority: getPriority(move) };
      _recordAction(_act);
      actions.push(_act);
    }
    for (const mon of oppActive.filter(m => m.alive)) {
      const { move, target } = selectMove(mon, oppActive, playerActive, field);
      const _act = { attacker:mon, move, target, side:'opp', priority: getPriority(move) };
      _recordAction(_act);
      actions.push(_act);
    }

    // Sort by priority → then speed (Trick Room inverts)
    actions.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const sA = a.attacker.getEffSpeed(field);
      const sB = b.attacker.getEffSpeed(field);
      if (sA !== sB) return field.trickRoom ? sA - sB : sB - sA;
      return rng() < 0.5 ? -1 : 1; // Speed tie
    });

    // Execute actions
    for (const action of actions) {
      if (!action.attacker.alive) continue;
      // T9j.4 (#41) — Freeze resolution per Champions rules:
      //   25% thaw per move attempt, guaranteed thaw on turn 3 (3-turn cap).
      // Cite: Bulbapedia Freeze — Pokemon Champions section.
      if (action.attacker.status === 'frozen') {
        action.attacker.frozenTurns = (action.attacker.frozenTurns || 0) + 1;
        if (action.attacker.frozenTurns >= 3 || rng() < 0.25) {
          action.attacker.status = null;
          action.attacker.frozenTurns = 0;
          log.push(`${action.attacker.name} thawed out!`);
          // falls through to act this turn
        } else {
          log.push(`${action.attacker.name} is frozen solid!`);
          continue;
        }
      }
      // T9j.5 (#17) — Sleep: turn 1 always skip; turn 2 33% early wake;
      // turn 3 guaranteed wake (3-turn cap). Cite: games.gg Champions nerfs.
      if (action.attacker.status === 'sleep') {
        action.attacker.sleepTurns = (action.attacker.sleepTurns || 0) + 1;
        action.attacker.statusTurns--;
        if (action.attacker.sleepTurns >= 3 || action.attacker.statusTurns <= 0) {
          action.attacker.status = null;
          action.attacker.sleepTurns = 0;
          action.attacker.statusTurns = 0;
          log.push(`${action.attacker.name} woke up!`);
        } else if (action.attacker.sleepTurns === 2 && rng() < 0.333) {
          action.attacker.status = null;
          action.attacker.sleepTurns = 0;
          action.attacker.statusTurns = 0;
          log.push(`${action.attacker.name} woke up early!`);
        } else {
          log.push(`${action.attacker.name} is fast asleep!`);
          continue;
        }
      }
      // T9j.5 (#17) — Paralysis full-skip nerfed from 25% to 12.5% in Champions.
      // Cite: Serebii Champions Status; games.gg. Spec §1.2.
      if (action.attacker.status === 'paralysis' && rng() < 0.125) {
        log.push(`${action.attacker.name} is fully paralysed and can't move!`);
        continue;
      }
      // T9j.8 (Refs #19) Flinch consumption: _flinched was set in a prior
      // action's applyDamage hook this turn. Pre-act gate eats the flag and
      // skips the action. Cleared on use; clearing of stale values happens in
      // the per-turn reset loop (m._flinched = false).
      if (action.attacker._flinched) {
        log.push(`${action.attacker.name} flinched and couldn't move!`);
        action.attacker._flinched = false;
        action.attacker.hasActed = true;
        continue;
      }
      executeAction(action.attacker, action.move, action.target,
        action.side === 'player' ? playerActive : oppActive,
        action.side === 'player' ? oppActive : playerActive,
        field, log, rng);
      // T9j.8 (Refs #19) Mark as acted so later-in-queue flinch rolls against
      // this mon have no effect (can't flinch a mon that already moved).
      action.attacker.hasActed = true;
    }

    // Sand damage
    if (field.weather === 'sand') {
      for (const mon of [...playerActive, ...oppActive].filter(m => m.alive)) {
        if (!['Rock','Steel','Ground'].includes(mon.types[0]) &&
            !['Rock','Steel','Ground'].includes(mon.types[1] || '')) {
          const sandDmg = Math.floor(mon.maxHp / 16);
          mon.hp = Math.max(0, mon.hp - sandDmg);
          log.push(`${mon.name} is buffeted by the sandstorm! [${sandDmg} dmg]`);
          if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); _recordKO(mon, { reason: 'sandstorm' }); }
        }
      }
    }

    // Burn damage
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.status === 'burn')) {
      const burnDmg = Math.floor(mon.maxHp / 16);
      mon.hp = Math.max(0, mon.hp - burnDmg);
      log.push(`${mon.name} is hurt by its burn! [${burnDmg} dmg]`);
      if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); _recordKO(mon, { reason: 'burn' }); }
    }

    // T9j.17 (Refs #101) -- Frostbite residual (1/16 max HP). Mirrors burn chip.
    // Frostbite is the SpA-side analogue of burn introduced in Gen IX/Champions:
    // halves SpA (handled in getStat) and chips 1/16 maxHp end-of-turn.
    // Cite: https://bulbapedia.bulbagarden.net/wiki/Frostbite_(status_condition)
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.status === 'frostbite')) {
      const frostDmg = Math.max(1, Math.floor(mon.maxHp / 16));
      mon.hp = Math.max(0, mon.hp - frostDmg);
      log.push(`${mon.name} is hurt by frostbite! [${frostDmg} dmg]`);
      if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); _recordKO(mon, { reason: 'frostbite' }); }
    }

    // T9j.4 (#41) — Poison residual (1/8 max HP). Cite: Bulbapedia Status; Spec §1.6.
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.status === 'poison')) {
      const poisonDmg = Math.max(1, Math.floor(mon.maxHp / 8));
      mon.hp = Math.max(0, mon.hp - poisonDmg);
      log.push(`${mon.name} is hurt by poison! [${poisonDmg} dmg]`);
      if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); _recordKO(mon, { reason: 'poison' }); }
    }

    // T9j.4 (#41) — Toxic residual (N/16 escalating, cap N=15; counter increments post-tick).
    // Cite: Bulbapedia Status; Spec §1.6.
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.status === 'toxic')) {
      if (!mon.toxicCounter || mon.toxicCounter < 1) mon.toxicCounter = 1;
      const n = Math.min(15, mon.toxicCounter);
      const toxicDmg = Math.max(1, Math.floor(mon.maxHp * n / 16));
      mon.hp = Math.max(0, mon.hp - toxicDmg);
      log.push(`${mon.name} is hurt by toxic! [${toxicDmg} dmg] (tick ${n}/16)`);
      mon.toxicCounter++;
      if (mon.hp === 0) { mon.alive = false; log.push(`${mon.name} fainted!`); _recordKO(mon, { reason: 'toxic' }); }
    }
    // Note: Snow intentionally has no chip damage (Champions Gen-IX). Hail is absent.

    // T9j.6 (#29) — Leftovers: heal 1/16 maxHp end of turn. Only while below max HP.
    // Cite: Game8 Champions item list; Bulbapedia Leftovers.
    for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.item === 'Leftovers' && m.hp < m.maxHp)) {
      const heal = Math.max(1, Math.floor(mon.maxHp / 16));
      mon.hp = Math.min(mon.maxHp, mon.hp + heal);
      log.push(`${mon.name} restored HP with Leftovers! [+${heal}]`);
    }

    // Field upkeep
    field.tick(log);

    // --------------------------------------------------------
    // REPLACEMENTS
    // --------------------------------------------------------
    function replaceOnField(activeArr, bench, side, field, log) {
      const fainted = activeArr.filter(m => !m.alive);
      for (const mon of fainted) {
        sideFainted[side]++;
        // T9j.1 — keep side.fainted on the field in sync so calcDamage's
        // Last Respects lookup (target.side.fainted) uses the real count.
        (side === 'player' ? field.playerSide : field.oppSide).fainted = sideFainted[side];
        const idx = activeArr.indexOf(mon);
        const replacement = bench.find(b => b.alive);
        if (replacement) {
          bench.splice(bench.indexOf(replacement), 1);
          // T9j.4 (#41) — toxicCounter + frozenTurns reset on switch in.
          // Cite: Bulbapedia Status (toxic counter resets on switch out/in).
          replacement.toxicCounter = 0;
          replacement.frozenTurns  = 0;
          replacement.sleepTurns   = 0;
          // T9j.17 (Refs #101) -- Fake Out window resets on switch out/in.
          // Each fresh stay on the field grants exactly one legal Fake Out turn.
          // Cite: https://bulbapedia.bulbagarden.net/wiki/Fake_Out
          replacement._fakeDone    = false;
          // T9j.6 (#29) — stat stages must not leak across switches. Entry at all-zero.
          replacement.statBoosts = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
          // T9j.6 (#18) — Choice Scarf lock clears on switch in.
          replacement.choiceLock = null;
          activeArr[idx] = replacement;
          log.push(`${replacement.name} was sent out!`);
          applyEntryAbility(replacement, side, field, log);
        }
      }
      // Remove dead and no replacement
      for (let i = activeArr.length - 1; i >= 0; i--) {
        if (!activeArr[i].alive) activeArr.splice(i, 1);
      }
    }
    replaceOnField(playerActive, playerBench, 'player', field, log);
    replaceOnField(oppActive, oppBench, 'opp', field, log);

    // T9j.3 (#39) — timer-draw check. Deduct deterministic 15s/turn proxy.
    // If either clock expires, force battle end via tiebreaker cascade.
    field.clockPlayer -= DECISION_TIME_MS;
    field.clockOpp    -= DECISION_TIME_MS;
    if (field.clockPlayer <= 0 || field.clockOpp <= 0) {
      log.push(`[TIMER] Clock expired at turn ${turn}. Resolving via tiebreaker.`);
      break;
    }
  }

  // ============================================================
  // RESULT
  // ============================================================
  const pAliveAll = [...playerActive, ...playerBench].filter(m => m.alive);
  const oAliveAll = [...oppActive, ...oppBench].filter(m => m.alive);
  const pSurvive = pAliveAll.length;
  const oSurvive = oAliveAll.length;
  // T9j.3 (#39) tiebreaker cascade: Pokemon alive → total HP → true draw.
  const pHpSum = pAliveAll.reduce((s, m) => s + m.hp, 0);
  const oHpSum = oAliveAll.reduce((s, m) => s + m.hp, 0);
  const timerExpired = (field.clockPlayer <= 0 || field.clockOpp <= 0);

  let result;
  let winCondition = '';
  if (pSurvive > oSurvive) {
    result = 'win';
    const ko = log.filter(l => l.includes('fainted')).length;
    const trSet = log.some(l => l.includes('Trick Room was set'));
    const twSet = log.some(l => l.includes('Tailwind is blowing'));
    winCondition = timerExpired ? 'Timer Win (pokemon)'
      : (trSet ? 'TR Win' : twSet ? 'Tailwind Win' : ko >= 4 ? 'KO Sweep' : 'Attrition Win');
  } else if (oSurvive > pSurvive) {
    result = 'loss';
    winCondition = timerExpired ? 'Timer Loss (pokemon)' : 'Opponent Win';
  } else {
    // Equal Pokemon count — fall to HP tiebreaker.
    if (pHpSum > oHpSum) {
      result = 'win';
      winCondition = timerExpired ? 'Timer Win (HP)' : 'HP Tiebreak Win';
    } else if (oHpSum > pHpSum) {
      result = 'loss';
      winCondition = timerExpired ? 'Timer Loss (HP)' : 'HP Tiebreak Loss';
    } else {
      result = 'draw';
      winCondition = timerExpired ? 'Timer Draw' : 'Draw';
    }
  }
  if (timerExpired) log.push(`[TIMER] Resolved ${winCondition} — alive p${pSurvive}/o${oSurvive}, HP p${pHpSum}/o${oHpSum}`);

  return {
    result, turns: turn,
    // T9j.3 (#37) — cumulative active turns, replaces meaningless end-of-battle remaining counter.
    trTurns: field.trickRoomActive,
    // T9j.3 (#38) — Tailwind cumulative active per side and combined.
    twTurnsPlayer: field.playerSide.tailwindActive,
    twTurnsOpp:    field.oppSide.tailwindActive,
    twTurns:       field.playerSide.tailwindActive + field.oppSide.tailwindActive,
    // T9j.3 Screens cumulative active for diagnostics.
    screens: {
      playerReflect:     field.playerSide.reflectActive,
      playerLightScreen: field.playerSide.lightScreenActive,
      playerAuroraVeil:  field.playerSide.auroraVeilActive,
      oppReflect:        field.oppSide.reflectActive,
      oppLightScreen:    field.oppSide.lightScreenActive,
      oppAuroraVeil:     field.oppSide.auroraVeilActive,
    },
    // T9j.3 (#39) timer-draw diagnostics.
    timerExpired, clockPlayer: field.clockPlayer, clockOpp: field.clockOpp,
    pHpSum, oHpSum,
    log, winCondition, seed,
    playerSurvivors: pSurvive, oppSurvivors: oSurvive,
    // T9j.10 (Refs #16) — structured lead + bring info so UI never parses log strings.
    //   leads:  active battlers at turn 1 (doubles: 2, singles: 1)
    //   bring:  the N-of-6 actually entering battle (doubles: 4, singles: 3)
    leads: {
      player:   playerPokemon.slice(0, field._format === 'singles' ? 1 : 2).map(p => p.name),
      opponent: oppPokemon.slice(0,    field._format === 'singles' ? 1 : 2).map(p => p.name)
    },
    bring: {
      // Always slice to bring count so default (no override) still reflects VGC rules:
      // doubles 4 of 6, singles 3 of 6. When caller supplies playerBring, the team
      // has already been pruned to that count by _applyBring above.
      player:   playerPokemon.slice(0, field._format === 'singles' ? 3 : 4).map(p => p.name),
      opponent: oppPokemon.slice(0,    field._format === 'singles' ? 3 : 4).map(p => p.name)
    },
    // #5 — attach legality verdict so UI can surface warnings on team/match cards.
    legality: { player: playerLegality, opp: oppLegality },
    // Phase 4a (Refs #52) — structured KO event log. See _recordKO site above.
    koEvents: koEvents,
    // Phase 4b (Refs #52) — per-mon move-call histogram + Protect streak
    // peaks. Compact shape; the simlog writer strips to what's needed.
    movesUsed: movesUsed,
    protectStreakMax: _protectStreakMax
  };
}

// ============================================================
// PRIORITY LOOKUP
// ============================================================
function getPriority(move) {
  // T9j.2 — Champions 2026 priority table (Refs CHAMPIONS_MECHANICS_SPEC §4).
  // Rage Powder and Follow Me are +2 in Champions (ORACLE-DIVERGENCE-3 vs SV +3).
  const P = {
    'Fake Out':3, 'Extreme Speed':2, 'Aqua Jet':1, 'Shadow Sneak':1,
    'Sucker Punch':1, 'Vacuum Wave':1, 'Quick Attack':1,
    'Helping Hand':5,
    'Protect':4, 'Detect':4,
    'Wide Guard':3, 'Quick Guard':3,
    'Follow Me':2, 'Rage Powder':2,
    'Trick Room':-7, 'Roost':0
  };
  return P[move] || 0;
}

// ============================================================
// MONTE CARLO RUNNER
// ============================================================

async function runSimulation(numBattles, playerTeamKey, oppTeamKey, onProgress) {
  const playerTeamDef = TEAMS[playerTeamKey];
  const oppTeamDef = TEAMS[oppTeamKey];

  const results = { wins:0, losses:0, draws:0, errors:0, totalTurns:0, totalTrTurns:0,
    // T9j.3 (#38) Tailwind cumulative + (#39) timer-draw bucket.
    totalTwTurns:0, timerDraws:0, timerWins:0, timerLosses:0,
    winConditions:{}, allLogs:[], koLogs:[], turnDist:{},
    seeds: [],          // Issue #2: store seeds for reproducibility
    // Issue #6: metadata fields for trustworthy win-rate display
    sampleSize: numBattles,
    policy: 'greedy-vs-greedy',
    format: 'vgc-doubles',
    playerTeam: playerTeamKey,
    oppTeam: oppTeamKey,
  };

  const BATCH = 50;
  for (let i = 0; i < numBattles; i += BATCH) {
    const batchSize = Math.min(BATCH, numBattles - i);
    for (let j = 0; j < batchSize; j++) {
      // Issue #2 FIX: generate a unique seed per battle and pass it in
      const seed = makeSeed();
      // T9j.2 — thread format through from ui.js (currentFormat) via window.
      const fmt = (typeof window !== 'undefined' && window.currentFormat) || 'doubles';
      const battle = simulateBattle(playerTeamDef, oppTeamDef, { seed, format: fmt });
      if (battle.result === 'error') {
        results.errors++;
        if (results.allLogs.length < 5) results.allLogs.push({ ...battle, oppTeam: oppTeamKey });
        continue;
      }
      results[battle.result === 'win' ? 'wins' : battle.result === 'loss' ? 'losses' : 'draws']++;
      results.totalTurns += battle.turns;
      results.totalTrTurns += battle.trTurns;
      // T9j.3 (#38, #39)
      results.totalTwTurns += (battle.twTurns || 0);
      if (battle.timerExpired) {
        if (battle.result === 'draw') results.timerDraws++;
        else if (battle.result === 'win')  results.timerWins++;
        else if (battle.result === 'loss') results.timerLosses++;
      }
      results.turnDist[battle.turns] = (results.turnDist[battle.turns]||0) + 1;
      if (battle.winCondition) {
        results.winConditions[battle.winCondition] = (results.winConditions[battle.winCondition]||0) + 1;
      }
      const isClutch = battle.turns >= 8 || battle.result === 'loss';
      if (results.allLogs.length < 30 || (isClutch && results.allLogs.length < 60)) {
        results.allLogs.push({ ...battle, oppTeam: oppTeamKey });
      }
      // Issue #2: store seeds for first 100 battles so any battle can be replayed
      if (results.seeds.length < 100) results.seeds.push(battle.seed);
    }
    if (onProgress) onProgress(i + batchSize, numBattles);
    await new Promise(r => setTimeout(r, 0));
  }

  const validBattles = results.wins + results.losses + results.draws;
  results.winRate = validBattles > 0 ? results.wins / validBattles : 0;
  results.avgTurns = validBattles > 0 ? results.totalTurns / validBattles : 0;
  results.avgTrTurns = validBattles > 0 ? results.totalTrTurns / validBattles : 0;
  results.avgTwTurns = validBattles > 0 ? results.totalTwTurns / validBattles : 0;  // T9j.3 (#38)
  // Issue #6: confidence tier label
  results.confidenceNote = numBattles < 20  ? 'Low confidence — run more simulations (Bo10+)' :
                           numBattles < 100 ? 'Moderate confidence' : 'High confidence';
  return results;
}

// Run all matchups
async function runAllMatchups(numBattles, onProgress, onMatchupDone) {
  const opponents = Object.keys(TEAMS).filter(k => k !== 'player');
  const allResults = {};
  let done = 0;
  for (const opp of opponents) {
    const res = await runSimulation(numBattles, 'player', opp, (current, total) => {
      if (onProgress) onProgress(done * numBattles + current, opponents.length * numBattles);
    });
    allResults[opp] = res;
    done++;
    if (onMatchupDone) onMatchupDone(opp, res);
  }
  return allResults;
}

// ============================================================
// ISSUE #1 FIX — CANONICAL ANALYSIS PAYLOAD
// buildAnalysisPayload() wraps any raw sim result (from runSimulation
// or runBoSeries) into the canonical structured object.
// ALL coaching layers (showInlinePilotCard, generatePilotGuide,
// buildReportText) MUST consume this object — never the raw result.
// Fields:
//   analysis_id     — unique run identifier (timestamp + random)
//   engine_version  — semantic version of this engine file
//   formatid        — format string ("vgc-doubles" | "singles")
//   custom_rules    — array of any active custom rules
//   team_inputs     — player + opponent team keys
//   hidden_info_priors — what is assumed vs known about hidden sets
//   seed_policy     — how seeds were generated
//   sample_size     — battles or series run
//   policy_models   — description of AI decision policy
//   win_rate        — raw float 0–1
//   confidence_interval — Wilson score 95% CI [lo, hi]
//   confidence_tier — "Low" | "Moderate" | "High"
//   top_win_paths   — top win conditions by frequency
//   top_loss_paths  — placeholder (requires loss-path tracking)
//   critical_damage_calcs — placeholder for future calc layer
//   traceable_log_refs    — first N seed refs for replayability
// ============================================================
const ENGINE_VERSION = '1.1.0'; // Increment on any mechanics change

function wilsonCI(wins, n, z = 1.96) {
  if (n === 0) return [0, 0];
  const p = wins / n;
  const denom = 1 + z * z / n;
  const centre = p + z * z / (2 * n);
  const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [
    Math.max(0, Math.round(((centre - margin) / denom) * 1000) / 1000),
    Math.min(1, Math.round(((centre + margin) / denom) * 1000) / 1000)
  ];
}

function buildAnalysisPayload(rawResult, ctx = {}) {
  const n   = rawResult.wins + rawResult.losses + (rawResult.draws || 0);
  const ci  = wilsonCI(rawResult.wins, n);
  const tier = n < 20 ? 'Low' : n < 100 ? 'Moderate' : 'High';

  // Top win paths from winConditions map
  const topWinPaths = Object.entries(rawResult.winConditions || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cond, count]) => ({ condition: cond, count, pct: n > 0 ? Math.round(count / n * 100) : 0 }));

  return {
    analysis_id:           `sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    engine_version:        ENGINE_VERSION,
    formatid:              rawResult.format || ctx.formatid || 'vgc-doubles',
    custom_rules:          ctx.custom_rules || [],
    team_inputs: {
      player:   rawResult.playerTeam || ctx.playerTeamKey || 'player',
      opponent: rawResult.oppTeam    || ctx.oppTeamKey    || 'unknown'
    },
    hidden_info_priors: {
      note:   'All opponent set details taken as declared in TEAMS definition. No hidden-set priors applied.',
      source: 'exact-input',
      items:  'declared',
      evs:    'declared',
      tera:   'declared',
      moves:  'declared'
    },
    seed_policy:    rawResult.seeds ? 'per-battle-mulberry32' : 'legacy-unseed',
    sample_size:    rawResult.sampleSize || n,
    bo_mode:        ctx.bo || null,
    policy_models:  rawResult.policy || ctx.policy || 'greedy-vs-greedy',
    win_rate:       rawResult.winRate,
    wins:           rawResult.wins,
    losses:         rawResult.losses,
    draws:          rawResult.draws || 0,
    total_battles:  n,
    confidence_interval: ci,
    confidence_tier:     tier,
    confidence_note:     rawResult.confidenceNote ||
      (tier === 'Low'      ? 'Low confidence — run Bo10+ or increase sample size' :
       tier === 'Moderate' ? 'Moderate confidence' : 'High confidence'),
    top_win_paths:        topWinPaths,
    top_loss_paths:       [], // TODO: requires per-loss winCondition tracking
    critical_damage_calcs: [], // TODO: populated by damage calc layer (future)
    traceable_log_refs:   (rawResult.seeds || []).slice(0, 10),
    avg_turns:            rawResult.avgTurns    || 0,
    avg_tr_turns:         rawResult.avgTrTurns  || 0,
    raw_logs_sample:      (rawResult.allLogs    || []).slice(0, 5)
  };
}

// ============================================================
// T9j.7 — MEGA TRIGGER SWEEP
// Explores the full WR-by-trigger-turn curve for every Mega on teamA
// against teamB. Progressive refinement: coarse pass (50 battles per cell)
// identifies promising turns, then top 3 re-run at 500 battles each.
// Output consumed by M2 Pilot Guide card and M3 Trend Dashboard heatmap.
// ============================================================

/**
 * Run one cell of the sweep: force teamA's Mega-capable mons to use the
 * supplied policy, run nBattles, and return {wr, n, wins, losses, ci95}.
 */
function runMegaSweepCell(teamA, teamB, bo, policy, triggerTurn, nBattles) {
  let wins = 0, losses = 0, draws = 0;
  for (let i = 0; i < nBattles; i++) {
    // Deep copy team data so we can override Mega policy without mutating
    // the caller's team state across cells.
    const teamACopy = JSON.parse(JSON.stringify(teamA));
    const teamBCopy = JSON.parse(JSON.stringify(teamB));
    const res = simulateBattle(teamACopy, teamBCopy, {
      bo: bo || 1,
      _megaPolicyOverride: {
        side: 'player',
        policy: policy,
        triggerTurn: triggerTurn
      }
    });
    if (res && res.winner === 'player') wins++;
    else if (res && res.winner === 'opp') losses++;
    else draws++;
  }
  const n  = wins + losses + draws;
  const wr = n > 0 ? wins / n : 0;
  // 95% Wilson CI half-width (approx)
  const z = 1.96;
  const ci95 = n > 0 ? z * Math.sqrt(wr * (1 - wr) / n) : 0;
  return { wr: wr, n: n, wins: wins, losses: losses, draws: draws, ci95: ci95 };
}

/**
 * Progressive sweep across every legal trigger turn 1..MAX_TURN plus a
 * 'never' baseline, per Mega-capable member on teamA.
 * Returns { matchup, results: [ { megaSlot, curve, refinedTop3, bestTurn } ] }
 */
function runMegaTriggerSweep(teamA, teamB, bo, opts) {
  opts = opts || {};
  const MAX_TURN   = opts.maxTurn  || 10;
  const COARSE_N   = opts.coarseN  ||  50;
  const REFINE_N   = opts.refineN  || 500;
  const teamAName  = teamA.name || teamA.key || 'teamA';
  const teamBName  = teamB.name || teamB.key || 'teamB';

  // Identify Mega-capable slots by inspecting team member items/names.
  // We need a peek without burning a full simulation, so construct Pokemon
  // objects once.
  const peek = new Field ? null : null; // no-op; using constructor directly
  const megaSlots = (teamA.members || []).filter(function(mem) {
    const mInfo = (typeof CHAMPIONS_MEGAS !== 'undefined' && CHAMPIONS_MEGAS[mem.name]) || null;
    return mInfo && mInfo.baseSpecies && mem.item === mInfo.megaStone;
  });

  const results = [];
  for (const slot of megaSlots) {
    const curve = [];
    // Pass 1: every legal turn
    for (let t = 1; t <= MAX_TURN; t++) {
      const cell = runMegaSweepCell(teamA, teamB, bo, 'at_turn', t, COARSE_N);
      curve.push({ turn: t, wr: cell.wr, n: cell.n, ci95: cell.ci95 });
    }
    // Pass 1: 'never' baseline
    const neverCell = runMegaSweepCell(teamA, teamB, bo, 'never', null, COARSE_N);
    curve.push({ turn: 'never', wr: neverCell.wr, n: neverCell.n, ci95: neverCell.ci95 });

    // Pass 2: refine top 3 by coarse WR
    const top3 = curve.slice().sort((a, b) => b.wr - a.wr).slice(0, 3);
    const refined = top3.map(function(cell) {
      const policy = cell.turn === 'never' ? 'never' : 'at_turn';
      const refinedCell = runMegaSweepCell(teamA, teamB, bo, policy, cell.turn, REFINE_N);
      return { turn: cell.turn, wr: refinedCell.wr, n: refinedCell.n, ci95: refinedCell.ci95 };
    });
    const bestTurn = refined.slice().sort((a, b) => b.wr - a.wr)[0].turn;

    results.push({
      megaSlot:     slot.name,
      curve:        curve,
      refinedTop3:  refined,
      bestTurn:     bestTurn
    });
  }

  return {
    matchup: teamAName + '_vs_' + teamBName,
    teamA:   teamAName,
    teamB:   teamBName,
    bo:      bo || 1,
    config:  { maxTurn: MAX_TURN, coarseN: COARSE_N, refineN: REFINE_N },
    results: results
  };
}
