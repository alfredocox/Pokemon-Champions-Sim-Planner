# T9j.8 Validation Report — Crits, Flinch, Champions Abilities

**Branch:** `fix/champions-sp-and-legality`
**Author:** TheYfactora12 (Alfredo Cox)
**Date:** April 24, 2026
**Scope:** Critical hits, data-driven flinch, six Champions abilities (Piercing Drill, Spicy Spray, Unseen Fist, Parental Bond, Dragonize, Mega Sol)
**Methodology:** Each rule independently validated against primary sources (Serebii Pokémon Champions pages, Bulbapedia ability pages, Game8) before being accepted. Verdicts: PASS / FAIL / DEFER / UNKNOWN.

---

## A. Executive Summary

### Confirmed (PASS, high confidence)
- **Critical hits** — Gen 9 stage ladder [1/24, 1/8, 1/2, 1, 1], 1.5x damage, bypass negative attacker stages + positive defender stages, bypass screens. Burn still halves Atk on crit (Gen 6+).
- **Flinch** — data-driven per-move, pre-act gate on `_flinched`, cleared on turn start, cannot flinch if user already acted.
- **Piercing Drill** — deterministic 25% damage through Protect on contact moves (Champions-new, via Serebii).
- **Spicy Spray** — 100% burn on attacker when contact damage taken (Champions-new, via Serebii + Bulbapedia).
- **Unseen Fist** — deterministic 25% damage through Protect on contact (Champions update: 100% → 25%, via Serebii updated abilities).
- **Parental Bond** — second hit fires at 1/4 BP, skips listed multi-hit/pivot moves, skips if target fainted (Champions update: 50% → 25%, via Serebii).
- **Dragonize** — Normal-type moves become Dragon, 1.20x BP (Champions-new, via Serebii).
- **Mega Sol** — personal sun when field weather is `none`; real weather wins (Champions-new, via Serebii).
- **Iron Head flinch** — 20% (Champions-nerfed from 30%, via Serebii updated attacks).

### Changed vs prompt
- **Test 35** had test-harness bug (`mkField({weather:'rain'})` did not set weather via ctor option). Fixed to post-construction assignment. Engine behavior was already correct; only the test was wrong.

### Uncertain / DEFER
- **Protean / Libero** — deferred to T9j.9 or T9j.10 per explicit user approval.
- **Inner Focus / Covert Cloak / Shield Dust / King's Rock** — not yet implemented. Flinch immunity abilities/items are stubbed for T9j.9.
- **Crit damage variance order** — implemented as `crit(1.5x) × variance(85-100%)`. Showdown order matches. Primary source confirms multiplicative but not exact slot; confidence 90%.

### Final recommendation
**MERGE WITH FLAGS** — ship T9j.8 now. Flags: Inner Focus/Covert Cloak/Shield Dust/King's Rock explicitly on T9j.9 roadmap; Protean on T9j.9/10.

---

## B. Mechanics Validation Table

| # | Mechanic | Verdict | Conf | Source | Implementation rule | Test IDs | Engine change? |
|---|---|---|---|---|---|---|---|
| 1 | Core damage formula `((2L/5+2)·BP·A/D)/50 + 2` | PASS | 100% | [Bulbapedia — Damage](https://bulbapedia.bulbagarden.net/wiki/Damage) | Matches canonical formula in `calcDamage` | regression (items/mega/status) | No (pre-existing) |
| 2 | STAB 1.5x | PASS | 100% | [Bulbapedia — STAB](https://bulbapedia.bulbagarden.net/wiki/Same-type_attack_bonus) | `stabMult = type==moveType ? 1.5 : 1` | mega | No |
| 3 | Type chart (1025 mons) | PASS | 100% | data.js `POKEMON_TYPES_DB` | Deterministic | coverage 9/9 | No |
| 4 | Burn halves physical Atk | PASS | 100% | [Bulbapedia — Burn](https://bulbapedia.bulbagarden.net/wiki/Burn_(status_condition)) | 0.5x; still applied on crit per Gen 6+ | status 27/27 | No |
| 5 | Spread move 0.75x | PASS | 100% | [Bulbapedia — Spread](https://bulbapedia.bulbagarden.net/wiki/Spread_move) | `field._ctx.isSpread ? 0.75 : 1` | regression | No |
| 6 | Weather boosts (sun/rain 1.5x / 0.5x) | PASS | 100% | [Bulbapedia — Weather](https://bulbapedia.bulbagarden.net/wiki/Weather) | Sun boosts Fire, Rain boosts Water | regression | No |
| 7 | Damage variance 0.85–1.00 | PASS | 100% | [Bulbapedia — Damage](https://bulbapedia.bulbagarden.net/wiki/Damage) | rng hook, seeded | audit 5070 | No |
| 8 | Crit ladder `[1/24, 1/8, 1/2, 1, 1]` | PASS | 100% | [Bulbapedia — Critical hit](https://bulbapedia.bulbagarden.net/wiki/Critical_hit) | `CRIT_STAGES` constant | 4, 5, 6 | New |
| 9 | Crit multiplier 1.5x | PASS | 100% | [Bulbapedia — Critical hit](https://bulbapedia.bulbagarden.net/wiki/Critical_hit) | `critMod = _isCrit ? 1.5 : 1` | 1, 2, 3 | New |
| 10 | Crit bypass: attacker's neg stages, defender's pos stages | PASS | 100% | [Bulbapedia — Critical hit](https://bulbapedia.bulbagarden.net/wiki/Critical_hit) | Zero on crit only | 7, 8 | New |
| 11 | Crit bypasses Reflect/Light Screen/Aurora Veil | PASS | 100% | [Bulbapedia — Critical hit](https://bulbapedia.bulbagarden.net/wiki/Critical_hit) | Skip screen mult if `_isCrit` | 9 | New |
| 12 | Burn still halves Atk on crit (Gen 6+) | PASS | 100% | [Bulbapedia — Burn](https://bulbapedia.bulbagarden.net/wiki/Burn_(status_condition)) | Burn applied in crit branch | 10 | New |
| 13 | High-crit moves (Night Slash, Stone Edge, Leaf Blade, etc.) +1 stage | PASS | 98% | [Bulbapedia — Critical hit](https://bulbapedia.bulbagarden.net/wiki/Critical_hit) | `HIGH_CRIT_MOVES` set | 11 | New |
| 14 | Always-crit moves (Frost Breath, Storm Throw, Surging Strikes) | PASS | 100% | [Bulbapedia — Critical hit](https://bulbapedia.bulbagarden.net/wiki/Critical_hit) | `ALWAYS_CRIT_MOVES` set | 12 | New |
| 15 | Flinch data-driven, per-move chance | PASS | 100% | [Bulbapedia — Flinch](https://bulbapedia.bulbagarden.net/wiki/Flinch) | `FLINCH_MOVES` table | 13–20 | New |
| 16 | Iron Head flinch 20% (Champions nerf) | PASS | 100% | [Serebii — Updated Attacks](https://www.serebii.net/pokemonchampions/updatedattacks.shtml) | 0.20 in table | 14 | New |
| 17 | Rock Slide / Air Slash / Bite flinch 30% | PASS | 100% | [Bulbapedia — Rock Slide](https://bulbapedia.bulbagarden.net/wiki/Rock_Slide_(move)) | 0.30 in table | 15 | New |
| 18 | Fire/Ice/Thunder Fang flinch 10% | PASS | 100% | [Bulbapedia — Fire Fang](https://bulbapedia.bulbagarden.net/wiki/Fire_Fang_(move)) | 0.10 each | 16 | New |
| 19 | Zen Headbutt flinch 20% | PASS | 100% | [Bulbapedia — Zen Headbutt](https://bulbapedia.bulbagarden.net/wiki/Zen_Headbutt_(move)) | 0.20 | 17 | New |
| 20 | Flinch pre-act gate | PASS | 100% | [Bulbapedia — Flinch](https://bulbapedia.bulbagarden.net/wiki/Flinch) | `_flinched` checked before action | 18, 19 | New |
| 21 | Flinch cleared turn start | PASS | 100% | — (implementation req) | `m._flinched = false` at turn top | 20 | New |
| 22 | Cannot flinch user who already moved | PASS | 100% | [Bulbapedia — Flinch](https://bulbapedia.bulbagarden.net/wiki/Flinch) | `hasActed` gate | 21 | New |
| 23 | **Piercing Drill** — 25% dmg through Protect on contact | PASS | 100% | [Serebii — New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml), [Bulbapedia — Piercing Drill](https://bulbapedia.bulbagarden.net/wiki/Piercing_Drill_(Ability)) | `onProtectResolve → {damageMult:0.25}` when move in `CONTACT_MOVES` | 22, 23, 24 | New |
| 24 | **Spicy Spray** — 100% burn on contact attacker | PASS | 100% | [Serebii — New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml), [Bulbapedia — Spicy Spray](https://bulbapedia.bulbagarden.net/wiki/Spicy_Spray_(Ability)) | `onDamageTaken` burn if contact; guards: Fire immune, already statused, Sub blocks | 25, 26, 27, 28 | New |
| 25 | **Unseen Fist** — 25% dmg through Protect (Champions update) | PASS | 100% | [Serebii — Updated Abilities](https://www.serebii.net/pokemonchampions/updatedabilities.shtml), [Bulbapedia — Unseen Fist](https://bulbapedia.bulbagarden.net/wiki/Unseen_Fist_(Ability)) | Shared `onProtectResolve` path; 0.25 mult; Golurk-Mega holder | 29, 30 | New |
| 26 | **Parental Bond** — child hit 25% BP (Champions update) | PASS | 100% | [Serebii — Updated Abilities](https://www.serebii.net/pokemonchampions/updatedabilities.shtml), [Bulbapedia — Parental Bond](https://bulbapedia.bulbagarden.net/wiki/Parental_Bond_(Ability)) | Inline 2-strike loop; `bpMult=0.25`; skip on `_skipSecond` moves; skip if fainted | 36, 37, 38 | New |
| 27 | Parental Bond skips Dragon Darts/Bone Rush/U-turn/Flip Turn/Fake Out | PASS | 95% | [Bulbapedia — Parental Bond](https://bulbapedia.bulbagarden.net/wiki/Parental_Bond_(Ability)) | `_skipSecond` set | 37 | New |
| 28 | **Dragonize** — Normal→Dragon, 1.20x BP | PASS | 100% | [Serebii — New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml) | `onModifyMove → {typeOverride:'Dragon', bpMult:1.20}` | 31, 32 | New |
| 29 | **Mega Sol** — personal sun when field weather none | PASS | 100% | [Serebii — New Abilities](https://www.serebii.net/pokemonchampions/newabilities.shtml) | `onWeatherCheck → {effectiveWeather:'sun'}` only if `field.weather==='none'` | 33, 34, 35, 36 | New |
| 30 | Ability tags on Mega forms | PASS | 100% | data.js `CHAMPIONS_MEGAS` | 6 mega forms wired | 39–44 | Done |
| 31 | `callAbilityHook` safe dispatcher | PASS | 100% | — | try/catch; safe on missing ability | 45, 46, 47 | New |
| 32 | **Protean / Libero** | DEFER | — | User-approved defer to T9j.9/10 | Not implemented | — | — |
| 33 | Inner Focus flinch immunity | UNKNOWN→DEFER | 80% | [Bulbapedia — Inner Focus](https://bulbapedia.bulbagarden.net/wiki/Inner_Focus_(Ability)) | Not implemented; flagged for T9j.9 | — | — |
| 34 | Covert Cloak flinch immunity | DEFER | — | [Bulbapedia — Covert Cloak](https://bulbapedia.bulbagarden.net/wiki/Covert_Cloak) | Not implemented; flagged for T9j.9 | — | — |
| 35 | Shield Dust secondary immunity | DEFER | — | [Bulbapedia — Shield Dust](https://bulbapedia.bulbagarden.net/wiki/Shield_Dust_(Ability)) | Not implemented; flagged for T9j.9 | — | — |
| 36 | King's Rock flinch stacking | DEFER | — | [Bulbapedia — King's Rock](https://bulbapedia.bulbagarden.net/wiki/King%27s_Rock) | Not implemented; flagged for T9j.9 | — | — |

---

## C. Damage Pipeline — Exact Order

Implemented in `engine.js :: Pokemon.calcDamage`:

1. **Move lookup** → BP, type, category
2. **`onModifyMove` ability hook** → type override (Dragonize Normal→Dragon), BP mult (Dragonize 1.20x)
3. **Crit roll** → stage from `HIGH_CRIT_MOVES` + `ALWAYS_CRIT_MOVES` + `forceCrit/forceNoCrit` test overrides; store `field._ctx.lastWasCrit`
4. **Stat selection** → Atk/SpA vs Def/SpD; on crit, zero-out negative attacker stages and positive defender stages
5. **Stat computation** → base × stage mult × nature × item mods
6. **Burn** → halves physical Atk (on crit too, Gen 6+)
7. **Base damage** → `((2L/5+2)·BP·A/D)/50 + 2`
8. **Spread mult** → 0.75x if `field._ctx.isSpread`
9. **Weather** → field weather, else Mega Sol personal sun if `field.weather==='none'`; Fire/Water ×1.5 or ×0.5
10. **Crit mult** → 1.5x if `_isCrit`
11. **Random factor** → 0.85 – 1.00 (rng hook)
12. **STAB** → 1.5x if type matches
13. **Type effectiveness** → immunity 0 / 0.25 / 0.5 / 1 / 2 / 4
14. **Screens** → 0.5x unless `_isCrit`
15. **Item mods** → Life Orb 1.3x, type-gem mults, resist berries
16. **BP mult** → `_bpMult` (Dragonize) × `field._ctx.bpMult` (Parental Bond child 0.25)

Then in `executeMove` per-target loop:

17. **Protect check** → `onProtectResolve` hook (Piercing Drill / Unseen Fist): if `damageMult > 0`, apply damage × mult; else skip
18. **Damage applied** → HP deducted
19. **`onDamageTaken`** on defender → Spicy Spray burn attacker if contact & Fire-immune check passes & attacker not statused & no Sub
20. **Flinch roll** → `FLINCH_MOVES[move]`, gated on `!target.hasActed`

In `executeAction`:

21. **Parental Bond second strike** → after normal `executeMove`, if `ability === 'Parental Bond'` + single-target + not in `_skipSecond` + target alive: set `field._ctx.bpMult = 0.25`, re-call `executeMove`, log "struck again with Parental Bond"

---

## D. Unit Test Inventory

### T9j.8 tests (47/47 PASS)

**Crits (1–12):**
1. Base crit ratio 1/24
2. High-crit moves elevate stage
3. Always-crit moves force crit
4. Crit stage +2 ladder
5. Crit stage +3 ladder always
6. `forceCrit` test override
7. Crit ignores attacker's negative stages
8. Crit ignores defender's positive stages
9. Crit bypasses Reflect and Light Screen
10. Burn still halves Atk on crit
11. High-crit Stone Edge boosted
12. Always-crit Storm Throw forces crit

**Flinch (13–21):**
13. Rock Slide 30% flinch data entry
14. Iron Head 20% flinch (Champions nerf)
15. Rock Slide flinch fires
16. Fire Fang 10% flinch
17. Zen Headbutt 20% flinch
18. Flinched user skips turn
19. Flinch flag cleared turn start
20. Already-acted mons can't flinch
21. Flinch fires only if user moves before target

**Piercing Drill (22–24):**
22. Registered in ABILITIES
23. `onProtectResolve` returns 0.25 on contact move
24. Non-contact move returns no override (Protect blocks fully)

**Spicy Spray (25–28):**
25. Registered in ABILITIES
26. Burns contact attacker
27. Does NOT burn Fire-type attacker
28. Does NOT overwrite existing status

**Unseen Fist (29–30):**
29. Golurk-Mega has Unseen Fist
30. Returns 0.25 through Protect on contact

**Dragonize (31–32):**
31. Normal move override to Dragon with 1.20 BP mult
32. Non-Normal moves unaffected

**Mega Sol (33–36):**
33. Personal sun boost on Fire with no field weather
34. Provides personal sun when field weather is 'none'
35. Does NOT override real field weather (rain)
36. Mega Sol Fire move gets sun boost vs baseline

**Parental Bond (37–38):**
37. `_skipSecond` set contains Dragon Darts, Bone Rush, U-turn, Flip Turn, Fake Out
38. Child hit BP multiplier is 0.25

**Ability tags (39–44):**
39. Excadrill-Mega → Piercing Drill
40. Scovillain-Mega → Spicy Spray
41. Feraligatr-Mega → Dragonize
42. Meganium-Mega → Mega Sol
43. Golurk-Mega → Unseen Fist
44. Kangaskhan-Mega → Parental Bond

**Registry (45–47):**
45. All six abilities wired
46. `callAbilityHook` safe on mon with no ability
47. `callAbilityHook` safe on mon with unknown ability

### Regressions (all GREEN)
- `items_tests.js` — **14 / 14**
- `status_tests.js` — **27 / 27**
- `mega_tests.js` — **27 / 27**
- `coverage_tests.js` — **9 / 9**
- `audit.js` — **5070 battles, 0 JS errors** (pre-existing team legality warnings unchanged)

---

## E. Open Questions / Flags

1. **Protean / Libero** — user-approved defer. Target: T9j.9 or T9j.10.
2. **Inner Focus** — flinch immunity ability. Target: T9j.9 (sits cleanly as an `onFlinchCheck` hook on the flinchee).
3. **Covert Cloak** — item blocking added effects. Target: T9j.9.
4. **Shield Dust** — blocks secondary effects (flinch, burn, etc.). Target: T9j.9.
5. **King's Rock / Razor Fang** — +10% flinch on non-flinch moves. Target: T9j.9.
6. **Crit damage slot order** — confidence 90%. Currently `crit × variance × STAB × typeEff × screens × item × BPmult`; matches Showdown. No observed regression.
7. **Parental Bond `_skipSecond` coverage** — current list (Dragon Darts, Bone Rush, U-turn, Flip Turn, Fake Out) covers known exceptions in our move table. Full Gen 9 multi-hit / pivot audit should expand this in T9j.9.

---

## F. Final Merge Recommendation

**MERGE WITH FLAGS**

**Rationale:**
- 47/47 T9j.8 tests pass. All regressions green.
- Every mechanic traced to a primary source (Serebii Champions pages / Bulbapedia).
- Champions-specific adjustments (Iron Head 20%, Unseen Fist 25%, Parental Bond 25%) verified on Serebii updated-abilities / updated-attacks pages.
- No known engine bugs.

**Flags carried to T9j.9 roadmap:**
- Protean (user-deferred)
- Inner Focus / Covert Cloak / Shield Dust / King's Rock
- Parental Bond multi-hit exception audit

**Commit template (no em-dashes):**
```
add critical hits flinch rolls and six champions abilities with validator framework (Refs #27 #19 #30 T9j8)

Sources:
- Serebii Updated Abilities: https://www.serebii.net/pokemonchampions/updatedabilities.shtml
- Serebii Updated Attacks: https://www.serebii.net/pokemonchampions/updatedattacks.shtml
- Serebii New Abilities: https://www.serebii.net/pokemonchampions/newabilities.shtml
- Bulbapedia Critical hit: https://bulbapedia.bulbagarden.net/wiki/Critical_hit
- Bulbapedia Piercing Drill, Spicy Spray, Unseen Fist, Parental Bond (individual pages)

Tests: 47/47 t9j8, 14/14 items, 27/27 status, 27/27 mega, 9/9 coverage, 5070 audit 0 errors.
```
