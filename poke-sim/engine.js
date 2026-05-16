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