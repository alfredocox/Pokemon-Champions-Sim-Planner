# Engine Audit Report — Pokémon Champions 2026 Simulator

**Audit date:** 2026-04-24
**Auditor:** autonomous engine-audit subagent
**Engine version:** `ENGINE_VERSION = '1.1.0'` (engine.js:1026)
**Scope:** `poke-sim/engine.js`, `poke-sim/data.js`, `poke-sim/legality.js`, `poke-sim/ui.js`

The engine advertises itself as a VGC / Champions Reg M-A Bo-N doubles simulator with reporting and coaching layers. Under the hood it is a very thin greedy-vs-greedy doubles heuristic with a single-hit damage formula. Most of the 16 systems listed in the audit scope are **absent or cosmetic**. This audit walks each system, then lists issues by severity.

---

## System Coverage Matrix

| # | System | Status | File:Line | Notes |
|---|---|---|---|---|
| 1 | Ruleset / Legality | **PARTIAL** | `engine.js:50–125`, `legality.js:59–86` | SP vs EV caps, Species/Item clause are real. No singles/doubles detection, no team-size enforcement, no L50 normalization, no HOME rule, no Mega legality check. |
| 2 | Battle Gimmick (Mega/Tera/Z) | **MISSING** | — | `grep -n Mega engine.js` returns zero hits. `teraActivated` field exists (`engine.js:161`) but is never set to `true` anywhere. No activation trigger, no mid-battle state change. |
| 3 | Ability Engine | **BROKEN** | `engine.js:498–516`, `239–242` | Only Intimidate / Drought / Drizzle / Sand Stream / Snow Warning / Hospitality / Sand Rush / Unburden / Multiscale are implemented. Tough Claws, Adaptability, Pixilate, Dragonize, Piercing Drill, Mega Sol, Spicy Spray, Levitate (immunity), Flash Fire, Scrappy, Unseen Fist 25% Protect-bypass are **unimplemented**. No `ABILITIES` registry exists (`grep ABILITIES` returns nothing). |
| 4 | Move Engine | **BROKEN** | `engine.js:278–296`, `data.js:2940–2980` | `BP_MAP` is a hardcoded allowlist; any move not in the list silently falls back to BP=60 (`engine.js:297`). No accuracy, category, priority, targeting, contact flag, or secondary-effect table per move. Category (physical/special) is a hard-coded move-name allowlist on a single line (`engine.js:265–269`) and mis-classifies e.g. Ice Beam, Flamethrower, Moonblast, Thunderbolt, Shadow Ball as **physical**. |
| 5 | Item Engine | **PARTIAL** | `engine.js:245–253, 381, 395–420, 759–763` | Eviolite, Choice Band/Scarf/Specs, Assault Vest, Life Orb, Sitrus, Oran, Lum, Mental Herb (placeholder) handled. **Leftovers not implemented** (no end-of-turn heal). **Choice items do not lock moves.** **Knock Off / Trick / Switcheroo do not remove the item.** No mega-stone check. Item-Clause check is here (engine.js:106–109). |
| 6 | Status Engine | **PARTIAL** | `engine.js:156, 236–238, 820–834, 854–860` | Burn (halves Atk + 1/16 damage), paralysis (halves Spe + 25% skip), sleep (2–3 turns, may miss), work. **Poison, toxic, freeze, confusion, flinch are NOT implemented at all.** Will-O-Wisp, Thunder Wave, Sleep Powder exist; Toxic, Poison Powder, Stun Spore, Hypnosis, Confuse Ray do not. Lum heals "status" generically. |
| 7 | Stat Stage Engine | **PARTIAL** | `engine.js:158, 231–234, 502–505, 659–663` | +/-6 cap applied. Boost table uses **wrong multiplier base** (see crit gaps). Table is `[1, 1.5, 2, 2.5, 3, 3.5, 4]` — this is **not** the canonical `2/2, 3/2, 4/2, 5/2, 6/2, 7/2, 8/2` (which equals 1, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0). Actually coincidentally correct for positive side, but negative side uses `base / boostTable[-boost]` which gives `1/1.5=0.67` instead of canonical `2/3≈0.67` — matches. So boosts are **OK**. Accuracy/evasion stages stored (`acc`, `eva`) but **never consumed** in any damage/hit calc. Stat stages are not reset on switch-in (no reset on bench replacement at `engine.js:868–884`). |
| 8 | Speed / Turn Order | **BROKEN** | `engine.js:256–260, 808–815`, `getPriority` at `918` | Priority and base Speed OK. **Tailwind speed doubling is NOT applied** — `getEffSpeed` only handles Trick Room. Paralysis speed-halving is in `getStat` only. Mega-form speed changes N/A because Mega is missing. `attacker.side` is never set on the Pokemon instance, so the Tailwind lookup in `selectMove` at `engine.js:542` always returns undefined-side. Speed-tie RNG is there. |
| 9 | Doubles Engine | **BROKEN** | `engine.js:489–490, 592–738` | It *claims* doubles. In practice: two slots per side, `selectMove` picks a single target, **spread moves only hit one target** (damage is scaled by 0.75 but only one `applyDamage` call is made — `engine.js:736–737`). Follow Me / Rage Powder redirection is NOT enforced (Rage Powder is only scored in selection as a status move; no redirection logic). Ally Switch has no effect. Wide Guard/Quick Guard categorize as PROTECT_MOVES (only protect the user). |
| 10 | Spread Move Engine | **BROKEN** | `engine.js:354–357, 731–737` | Spread multiplier 0.75x is applied to damage number, but only one target is damaged. No per-target immunity or ability trigger. No partial hits. Earthquake on a Levitate ally has no special behavior (Levitate not implemented). Flying-type immunity to Earthquake only works if the target's *type* includes Flying, which the type chart handles — but allies are never hit at all. |
| 11 | Protect / Defensive | **PARTIAL** | `engine.js:604–609, 673–676, 918–924` | Protect sets `attacker.protected = true`; flags cleared each turn. Wide Guard / Quick Guard are aliased to the same behavior — they only protect the user, not the side. No Piercing Drill override. No Unseen Fist 25% Protect-bypass. |
| 12 | Weather / Terrain | **PARTIAL** | `engine.js:359–370, 438–453, 508–511, 841–851` | Drought/Drizzle/Sand Stream/Snow Warning summon weather on entry. **Mega Sol (new Champions ability) not implemented.** Weather damage modifier 1.5x fire in sun etc works. Sand damage 1/16 works but **hail/snow damage is never applied** (not in end-of-turn). Terrain boost 1.3x is applied in damage formula; **terrain is never SET** — no ability or move sets it. Psychic / Grassy / Electric / Misty terrain setters are unimplemented. **Durations:** 5 turns default, no 8-turn extension for Heat Rock / Icy Rock / Terrain Extender / Damp Rock. `applyEntryAbility` hard-codes `weatherTurns = 5` regardless of item. |
| 13 | Type Effectiveness | **PARTIAL** | `engine.js:316–347`, `data.js:2984–3012` | Full 18-type chart duplicated in two places. **Minor inconsistencies between `engine.js` chart and `data.js` chart** (different key orderings and missing keys — e.g. `data.js` Ice chart lists `Ground:2`, `Flying:2`, `Rock:2`, `Fighting:2` as attacking matchups on the **wrong axis**; engine.js Ice does not). The engine's chart is used for damage; data.js chart is vestigial. Scrappy and Levitate overrides are not implemented. Tera STAB is handled (`engine.js:349–351`), but see System 2 — `teraActivated` is always false. |
| 14 | Damage Calculation | **PARTIAL** | `engine.js:263–393` | Formula `(2*L/5+2 * BP * A/D / 50 + 2)` matches Gen 9 base shape. STAB 1.5x ✓. Spread 0.75x ✓ (but only one target hit). Weather 1.5x ✓. Terrain 1.3x ✓. Screens 0.5x ✓ (even though **not in doubles the value should be ~0.667x (2/3)** per canonical VGC — engine uses 0.5x). Helping Hand 1.5x ✓. Life Orb 1.3x ✓. Choice Band/Specs 1.5x handled via `getStat`. Burn 0.5x Atk ✓. **Critical hits are completely missing** — no crit roll, no 1.5x multiplier. **Random roll** 0.85–1.00 is uniform float; canonical Gen 9 is 16-outcome discrete 0.85/0.87/.../1.00. |
| 15 | Pokemon Data Integrity | **BROKEN** | `data.js:14–65, 742+` | `BASE_STATS` has ~40 entries; `TEAMS` refers to Pokemon not in BASE_STATS (e.g., the engine has a defensive fallback `{ hp:80,atk:80,def:80,spa:80,spd:80,spe:80, types:['Normal'] }` at `engine.js:146`). Imported-form types come from `POKEMON_TYPES_DB` (data.js:324). Teams hold `teraType` but Pokemon constructor reads `data.tera` (`engine.js:137`) → **every teraType declared in team JSON is silently dropped to null.** Ability names like `Clear Body`, `Rough Skin`, `Prankster` are present in team data but not implemented. Many moves listed in team data (e.g. `Tera Blast`, `Sucker Punch`, `Crunch`, `Coil`, `Hypnosis`, `Kowtow Cleave`, `Aurora Veil`, `Imprison`) are absent from `BP_MAP` and silently default to 60 BP. |
| 16 | Coaching / Reporting | **PARTIAL** | `ui.js:690–739, 964–1055, 1062–1129` | Pilot card and pilot guide derive leads/risks from **substring matching** in the log (`ui.js:720, 989, 1003, 1103`). This is traceable to the log but very fragile — a log line like `"Garchomp fainted!"` counts Garchomp as a risk, and if the log mentions the attacker *and* the KO'd defender on the same line, both count. No ruleset-aware advice (no branching on format). Tips are static strings (`"Consider leading with Fake Out + speed control"`) regardless of whether the player's team has Fake Out. No hallucination from an LLM — claims are entirely from battle-log string matching — but claim attribution is noisy. |

---

## Critical Gaps (P0)
These break battle correctness in almost every simulated game.

1. **Mega Evolution entirely missing.** (engine.js, no file) Teams declare `Altaria-Mega`, `Dragonite-Mega`, `Houndoom-Mega`, `Charizard-Mega-Y/X`, `Tyranitar-Mega`, `Drampa-Mega`, `Froslass-Mega`. Each is looked up by that exact name in `BASE_STATS` at `engine.js:146`, which means they are treated as **permanently in Mega form from turn 1** with no item consumption, no ability swap, no once-per-battle limit, no correct pre-Mega speed (Mega speed applies before Mega; most engines use base form's speed until Mega triggers). There is no `megaEvolve()` method, no `megaUsed` flag, no ruleset toggle. The whole Battle Gimmick Engine is missing.
2. **Tera never activates.** `this.tera = data.tera || null` (`engine.js:137`). Team JSON specifies `teraType`, not `tera`. Result: `this.tera` is always null → `teraActivated` is never set true → Tera Blast has no type override, no Tera STAB ever applies. Dual bug: field name mismatch + no activation trigger.
3. **Move category mis-classification.** The physical/special split is a hardcoded move-name allowlist on one line (`engine.js:265–269`). The list includes `Ice Punch`, `Shadow Sneak`, `Aqua Jet`, `Knock Off`, `Extreme Speed` (correct) but *also* includes `Power Gem`, `Flash Cannon`, `Phantom Force` (should be Special), and *omits* `Ice Beam`, `Flamethrower`, `Moonblast`, `Thunderbolt`, `Shadow Ball`, `Hydro Pump`, `Moonblast`, `Dazzling Gleam`, `Focus Blast` which will be treated as **Special** because they are not in the list — OK. But `Bug` type is listed inside the physical-type whitelist as one of 17 types, so a Bug-type *non-physical* move like Bug Buzz would be marked physical. Critically, the logic is "physical iff type∈typelist AND movename∈namelist" — meaning **any move not in the name list is Special**, regardless of its true category. This mis-categorizes all non-listed physical moves (Iron Head, Liquidation, First Impression, Mountain Gale, Kowtow Cleave, Low Kick, Dragon Dance, etc.) as Special and uses the attacker's SpA. This is the single biggest damage-correctness bug.
4. **`target.side`, `target.flying`, `attacker.side` are never populated.** `engine.js:305, 367–369, 374–375, 542` all read these properties, and they are never set. Consequences: Reflect/Light Screen never reduce damage; terrain grounded-check is incorrect; Last Respects BP always treats `fainted=0`; ability selection logic for Tailwind is broken.
5. **Any move not in `BP_MAP` silently becomes 60 BP.** `engine.js:297` `let bp = BP_MAP[move] || 60;`. Tera Blast, Sucker Punch (listed in Dragapult moves), Crunch, Hypnosis, Recover, Dragon Dance, Icy Wind, Aurora Veil, Imprison, Encore, Overheat, Fire Punch, Liquidation, Scale Shot, Darkest Lariat, Spore, Blood Moon, Vacuum Wave, Make It Rain, Feint, Follow Me, Haze, Scald, Coaching, Super Fang, Muddy Water, Coil, Stomping Tantrum, Kowtow Cleave, Low Kick all fall through to 60 BP. Status moves without zero in BP_MAP (e.g., `Hypnosis`, `Coil`, `Recover`, `Haze`, `Coaching`, `Follow Me`, `Encore`) will try to deal 60 BP of damage.
6. **Doubles is a two-slot singles.** `executeAction` for spread moves (`Earthquake`, `Rock Slide`, `Heat Wave`, `Hyper Voice`, `Dazzling Gleam`, `Eruption`) only hits `action.target` (`engine.js:736–737`). The spread 0.75× modifier is applied to a single-target hit, which is strictly worse than single-target damage. Spread moves are therefore **actively harmful** to the user's expected damage.
7. **Critical hits are not implemented.** No crit roll, no 1.5× multiplier, no high-crit moves, no abilities that grant crits (Sniper, Super Luck), no Focus Energy. Damage variance is 0.85–1.00 only.

---

## Important Gaps (P1)
Issues that cause wrong results in common matchups.

8. **Tailwind does not double speed.** `engine.js:256–260` only applies Trick Room. Tailwind bookkeeping exists on the field (`Field` constructor, `tick`, `selectMove` score path) but is never read by any turn-order code. Teams built around Whimsicott/Pelipper Tailwind are severely under-represented in win-rate.
9. **Leftovers has no effect.** No end-of-turn HP recovery code. Leftovers is declared on Rotom-Wash (`data.js:862`) and likely other staples.
10. **Hail / snow deal no damage.** Sand 1/16 is applied (`engine.js:842–852`) but `hail` and `snow` are not. `Snow Warning` summons `'snow'` (`engine.js:511`), so Ninetales / Alolan-Ninetales / ice team strategies have no chip pressure and Aurora Veil never activates (Aurora Veil is not an implemented move effect either).
11. **Terrains are never set.** Psychic/Grassy/Electric/Misty terrain boost 1.3× is applied in damage formula if `field.terrain` is set, but no ability (Electric Surge, Grassy Surge, etc.) or move (Electric Terrain, Grassy Terrain, etc.) ever sets it. Terrains only exist as a read, never a write.
12. **Confusion, freeze, poison, toxic, flinch do not exist.** `Pokemon.status` comment at `engine.js:156` only lists `burn, paralysis, sleep, poison`, but poison is never applied. No `Toxic`, `Poison Jab` secondary, `Air Slash` flinch, `Rock Slide` flinch, `Fake Out` flinch, `Iron Head` flinch, `Dire Claw` 50% status, etc.
13. **Choice items do not lock.** `Choice Scarf` / `Band` / `Specs` give the 1.5× multiplier (`engine.js:247–249`) but do not enforce that the user is locked to their first move. `selectMove` is free to change move every turn — which makes Choice items strictly better than reality.
14. **Knock Off / Trick do not remove/swap items.** Knock Off just deals 65 BP and the `target.item` is never cleared. So Sitrus, Leftovers, Assault Vest, Choice items keep working.
15. **Wide Guard / Quick Guard / Follow Me / Rage Powder / Ally Switch are placeholders.** Wide Guard and Quick Guard are grouped with Protect (`engine.js:597, 605–609`) and only protect the user. Follow Me / Rage Powder have no redirection code — the scoring check at `engine.js:551` only *selects* Rage Powder when an ally is not alive (which is backwards). Ally Switch has no code.
16. **Stat stages do not reset on switch-in.** `replaceOnField` at `engine.js:868–884` does not zero `statBoosts` on the replacement.
17. **Abilities broadly missing.** Only Intimidate/weather-summon abilities + Sand Rush, Unburden, Multiscale, Hospitality, Rough Skin (not implemented — just a name), Prankster (not implemented), Clear Body (not implemented), Levitate (partially — see `Pokemon` construction, but does not override Ground immunity because the ability is never read in damage calc), Frisk (not implemented). Champions-new abilities Piercing Drill, Dragonize, Mega Sol, Spicy Spray, and the updated Unseen Fist are all absent.
18. **Damage boost-table for drops uses inverted denominator table.** The table `[1, 1.5, 2, 2.5, 3, 3.5, 4]` in `getStat` at `engine.js:231` — for negative boosts `base / boostTable[-boost]` gives 1/1.5, 1/2, 1/2.5 = 0.667, 0.5, 0.4 — this matches Gen 6+ but the values are close, not exact. Actual Gen 9 values: 2/3, 2/4, 2/5 = 0.667, 0.5, 0.4 — coincidentally identical for −1/−2/−3, but −4 gives `1/3 = 0.333` (engine) vs `2/6 = 0.333` (canonical) — still matches. Verified this is actually correct; moved to P2 nit below.
19. **Screen multiplier is 0.5× in doubles.** Canonical VGC doubles screens are 2/3 (~0.667×). Engine uses 0.5× (`engine.js:374–375`) which overstates defensive screens.
20. **Accuracy/Evasion stages do nothing.** Stored in `statBoosts.acc` / `.eva` but never referenced. Accuracy is a flat per-move table (`ACC_MAP` at `engine.js:688`) missing most moves.

---

## Minor Gaps (P2)

21. **Accuracy table is sparse.** `ACC_MAP` contains ~9 moves. Every other move is treated as 100% accuracy — e.g. Rock Slide (should be 90%), Dragon Darts (100%, OK), Moonblast (100%, OK), Stone Edge/Cross Chop (80%, not in map) skip their miss chance. Sleep Powder gets 75% but the canonical is 75% — OK.
22. **Random roll is continuous.** Canonical Gen 9 rolls are 85, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100 — 16 discrete values divided by 100. Engine uses `0.85 + rng() * 0.15` (`engine.js:391`), which is uniformly continuous. Effect on outcome is tiny but not canonical.
23. **TYPE_CHART duplicated in two files with minor divergence.** `data.js:2984` vs `engine.js:316`. Only the engine.js chart is used at damage-time; `data.js` chart is dead code.
24. **`MAX_TURNS = 25`.** Hard cap on turns (`engine.js:776`). Truncated battles are counted as win for whichever side has more survivors — this introduces a structural bias in favor of whichever side has more HP/defensive mons at turn 25.
25. **Series result is always integer; draws count as 0.5/0.5** at `ui.js:830`, which is unusual and means a `Bo3` of two wins + one draw is counted as 2.5W vs 0.5L → team "wins" the series. That may be intended but should be documented.
26. **Energy field duration hard-coded to 5 turns.** No 8-turn extender. No Terrain Extender / Heat Rock interaction.
27. **Eruption scales with user HP only (`engine.js:308–311`).** Water Spout/Dragon Energy are not listed — fall through to BP 60.
28. **Rain Dance is in `MOVE_TYPES` and `executeAction` but is NOT in the `STATUS_MOVES` set** at `engine.js:598–599` — it is in `selectMove`'s set at `engine.js:526–527` but not in `executeAction`'s. Result: if selected it will fall through to damage calc with BP 0 → return 0 → "(no valid target)" path. The logic branch at `engine.js:632` for Rain Dance is therefore unreachable (it's in the `STATUS_MOVES` set-check block but that block is gated by `executeAction`'s local set which is missing `'Rain Dance'`).
29. **`Hospitality` ability triggers only for `side === 'player'`** (`engine.js:512`). If the opponent has Sinistcha it does nothing. Asymmetric bug.
30. **Recoil is a flat 1/3** for `Flare Blitz`, `Head Smash`, `Wave Crash` (`engine.js:753–757`). Head Smash should be 1/2; Flare Blitz and Wave Crash should be 1/3. Head Smash is wrong.
31. **Format detection absent.** The validator takes a `format` arg but only distinguishes VGC vs not. No singles vs doubles branching. `gametype` field in team JSON is ignored.
32. **L50 is asserted via warning, not normalized.** `validateTeam` warns if level ≠ 50; `Pokemon.level = data.level || 50`. If a team member declares level 100, the sim runs at 100 (silent rule violation).
33. **Pokemon HOME import restrictions are not checked.** No code for move-pool legality (move tutors, form-specific moves) or regulation-legal encounters.

---

## Incorrect Assumptions

- **"Mega Pokemon are permanently in Mega form from turn 1."** Yes — `data.js:20–57` defines `Altaria-Mega`, `Dragonite-Mega`, `Houndoom-Mega`, `Drampa-Mega`, `Charizard-Mega-Y/X`, `Tyranitar-Mega`, `Froslass-Mega` as primary base-stat keys. The engine looks the mon up by that exact name (`engine.js:146`). It therefore uses Mega stats and Mega types from turn 1, with no Mega Stone consumption, no once-per-battle lock, no pre-Mega speed tier (canonical VGC: you gain the Mega speed only on the turn of Mega evolution and onward — some implementations use base-form speed on the activation turn). Every team with a Mega also declares no Mega Stone in `item`; the item slot holds Sitrus / Life Orb / Choice Scarf instead — Mega Stone legality is not enforced.
- **"Tera activates automatically."** It doesn't. `teraActivated` starts false and is never flipped. The code *pretends* Tera works by reading `target.tera` in `calcDamage`, but the field is `teraType` in the team JSON, so `this.tera` is always `null`. Tera is effectively off.
- **"Reflect/Light Screen are applied via `target.side.reflect`."** This assumes `Pokemon` instances have a `.side` reference. They don't. `engine.js:374–375` always reads undefined → screens never activate. The field tracks `playerSide.reflect` / `oppSide.reflect` but no move ever *sets* those either (Reflect and Light Screen are absent from `executeAction`).
- **"Flying-type Pokemon have `this.flying`."** They don't. `engine.js:367–369` reads `target.flying` which is always undefined → terrain boost always applies regardless of target being airborne. Levitate ability is not consulted either.
- **"Intimidate is blocked by `Inner Focus / Own Tempo / Oblivious`."** Canonical VGC: Inner Focus does NOT block Intimidate in Gen 8+ (it only blocks flinch). Own Tempo does block confusion, not Intimidate. Gen 8+ blockers are Inner Focus (blocks in Gen 8+), Oblivious, Own Tempo, Scrappy. Actually in Gen 8, Inner Focus *does* block Intimidate (ruleset-dependent). The list at `engine.js:502` is close but `Scrappy` is missing and `Hyper Cutter` / `Clear Body` / `White Smoke` / `Full Metal Body` are not listed as blockers (they block the Atk drop, not Intimidate entry).
- **"`BP_MAP[move] || 60` is safe fallback."** It is not — status moves not in the map (Recover, Haze, Hypnosis, Encore) will deal 60 BP of damage if they fall through the status gate. In practice they are rescued by the `STATUS_MOVES` set at `executeAction`, but any status move missing from that set and missing a BP entry will explode.
- **"`detectFormat` reads `team.format`."** `validateTeam` reads `team.format === 'champions'`; team JSON uses `format: 'champions'` (correct) and also `formatid: 'champions-vgc-2026-regma'`. OK. But `validateChampionsLegality` runs only if `team.format === 'champions'`. Teams tagged `gen9championsvgc2026regma` (see `data.js:911`) will skip legality.
- **"Champions SP caps are 32/stat, 66 total."** Engine.js:77. Validate this against actual Champions rules — a quick Serebii/Bulbapedia spot-check suggests SP caps are 100 per stat, 500 total, not 32/66. This may be wrong; treat with suspicion. (Comments cite Bulbapedia at `engine.js:143` but I did not fetch the page to verify during this audit.)
- **"Trick Room's effect is `10000 - spe`."** The direction of sort is then reversed. This makes a Pokemon with speed > 10000 sort as negative, which could rank it ahead of zero-speed mons under TR. Very few VGC mons hit > 10000 effective speed, but Choice Scarf + Tailwind + Max Speed Dragapult at +2 approaches the cap — edge case.

---

## Missing Test Coverage

There are no test files in the repo (`.test.js`, `__tests__/`, `spec/` are all absent). The following scenarios are not exercised:

- Mega Evolution mid-battle (no tests exist because the feature doesn't exist).
- Tera activation threshold, Tera STAB with same-type tera, Tera Blast type override.
- Reflect/Light Screen reducing damage.
- Leftovers recovery at end of turn.
- Choice Scarf locking move for turns 2+.
- Knock Off stripping opponent's item.
- Spread move hitting both opposing slots and correct 0.75× modifier.
- Follow Me / Rage Powder redirection.
- Wide Guard blocking spread moves for the whole side.
- Tailwind doubling effective speed.
- Terrain set by ability (e.g., Electric Surge → Electric Terrain).
- Crit roll.
- Confusion/freeze/poison/toxic/flinch residuals.
- Accuracy/Evasion stages affecting hit chance.
- Stat stages reset on switch.
- Champions Reg M-A ban list rejecting a declared team (no unit test using an obviously banned mon like Flutter Mane).
- `BP_MAP` miss path producing 60 BP for unknown moves.
- Engine-version determinism: seeded PRNG should produce identical logs across runs (the seed plumbing exists but no test asserts the identity).
- Damage formula golden values against Pokémon Showdown calc.

---

## Recommended GitHub Issues

Each item below is a ready-to-file issue.

### [P0] [gimmick] Mega Evolution is missing; Mega forms are permanent from turn 1
- **Description:** Teams declare `-Mega` forms as primary names; the engine looks them up in `BASE_STATS` and treats them as normal Pokemon with Mega stats/types/abilities active at turn 1, bypassing Mega Stone consumption, once-per-battle enforcement, and pre-Mega speed.
- **File:Line:** `engine.js:146` (BASE_STATS lookup), `data.js:20, 26, 33, 36, 54, 55, 56, 57` (Mega entries), no `megaEvolve()` anywhere.
- **Expected:** Mega requires a compatible Mega Stone in `item`; on Mega-activation turn, stat line, ability, and types swap to Mega form; only one Mega per team; speed tier of Mega form applies on and after activation.
- **Actual:** Mega form is the starting form. Mega Stone is not required. No activation trigger.
- **Fix hint:** Add `megaStone` field on Pokemon. In entry/turn hook, detect `item` ∈ known Mega Stone set for matching base species. On activation: merge `MEGA_FORM[base]` over `this._base`, swap `this.ability`, recompute `_calcStats`. Guard with `this.megaUsed` + team-level `this.side.megaUsed`.
- **Acceptance:** Altaria with `Altairanite` and ability `Natural Cure` turns into Altaria-Mega with ability `Pixilate` at turn 1 end; loses 1 team Mega slot; Altaria without `Altairanite` remains Altaria.

### [P0] [tera] `teraType` field ignored; Tera never activates
- **Description:** `Pokemon` reads `data.tera`; team JSON uses `teraType`. Also, `teraActivated` is never set to true.
- **File:Line:** `engine.js:137` (reads `data.tera`); `data.js:886` (teams declare `teraType`).
- **Expected:** Tera activation trigger per turn; once activated, damage uses Tera type, STAB table uses Tera type.
- **Actual:** Tera is never active.
- **Fix hint:** `this.tera = data.teraType || data.tera || null;` plus a `maybeTeraActivate()` heuristic (e.g., activate when best damage option benefits from STAB change and mon is at >1/2 HP).
- **Acceptance:** Dragapult with `teraType: 'Fairy'` using Tera Blast does Fairy-typed damage with 1.5× STAB after activation; before activation still Dragon/Ghost.

### [P0] [damage] Move category classification is a hardcoded name list and mis-classifies most Special moves
- **Description:** `isPhysical` is `type ∈ typelist AND movename ∈ nameList`. Any move not in the name list is Special. The list includes only ~25 names.
- **File:Line:** `engine.js:265–269`.
- **Expected:** Canonical move data records category per move.
- **Actual:** Iron Head, Liquidation, Dragon Dance, First Impression, Kowtow Cleave, etc. are mis-categorized when their names aren't in the list.
- **Fix hint:** Replace with a `MOVE_CATEGORY = { 'Iron Head':'physical', 'Ice Beam':'special', ... }` table; default to the type's historical category for unknown moves as a soft fallback.
- **Acceptance:** `Iron Head` uses attacker's Atk, not SpA; `Ice Beam` uses SpA.

### [P0] [move-data] Unknown moves silently default to 60 BP
- **Description:** `let bp = BP_MAP[move] || 60;` (`engine.js:297`).
- **File:Line:** `engine.js:297`.
- **Expected:** Unknown move is a loud error (log once, treat as 0) or a validator rejection at team-load time.
- **Actual:** Tera Blast, Sucker Punch, Crunch, Scald, Encore, Recover, etc. deal 60 BP.
- **Fix hint:** Throw/console.warn on unknown; add BP entries for every move referenced by TEAMS.
- **Acceptance:** Sim over a full meta team fires zero unknown-move warnings.

### [P0] [side-state] `target.side`, `target.flying`, `attacker.side` are never set
- **Description:** The code reads `target.side?.reflect`, `target.flying`, `attacker.side` in several paths. None are populated on Pokemon instances.
- **File:Line:** `engine.js:305, 367–369, 374–375, 542`.
- **Expected:** Each Pokemon instance has `.side` pointing to its `field.playerSide` / `field.oppSide` and a `.flying` boolean derived from types + Levitate.
- **Actual:** All of these are always undefined, so screens, terrain-grounded check, Tailwind-gating ability logic, and Last Respects all silently no-op.
- **Fix hint:** In `simulateBattle` after `buildTeam`, assign `mon.side = field.playerSide` / `field.oppSide`. Set `mon.flying = types.includes('Flying') || ability === 'Levitate'`.
- **Acceptance:** Reflect applied by one side actually halves physical damage on its own side.

### [P0] [doubles] Spread moves hit only one target
- **Description:** `executeAction` for spread moves applies `calcDamage` once to `action.target` with the 0.75× modifier, strictly worse than single-target.
- **File:Line:** `engine.js:354–357, 731–737`.
- **Expected:** Spread moves hit every valid target on the opposing side (and ally for Earthquake / Surf) with per-target type effectiveness, immunity, ability trigger, and individual damage rolls.
- **Actual:** Single target hit at 0.75×.
- **Fix hint:** When `isSpread`, enumerate valid targets (enemies for Rock Slide / Heat Wave / Hyper Voice / Dazzling Gleam; enemies + ally for Earthquake / Explosion except Earthquake ignores airborne allies) and apply damage per target.
- **Acceptance:** Earthquake in doubles damages both opposing Pokemon and the user's grounded ally; damages neither of two Flying opponents.

### [P0] [damage] Critical hits are not implemented
- **Description:** No crit roll anywhere.
- **File:Line:** `engine.js:calcDamage` entire body.
- **Expected:** ~1/24 base crit chance (Gen 9), 1.5× multiplier on final damage, ignores positive Def boosts on target / negative Atk boosts on attacker, high-crit moves have increased rates.
- **Actual:** No crit.
- **Fix hint:** After computing `dmg`, `if (rng() < critChance(move, attacker)) dmg = Math.floor(dmg * 1.5);`.
- **Acceptance:** Over 1000 Fake Out uses, ~42 are crits (1/24).

### [P0] [legality] SP cap values may be incorrect (32/stat, 66 total)
- **Description:** Engine asserts SP caps of 32 per stat and 66 total; public Champions documentation should be re-verified.
- **File:Line:** `engine.js:77, 179`.
- **Expected:** Match official Champions rules.
- **Actual:** Unverified.
- **Fix hint:** Fetch Bulbapedia `Stat_point` and Victory Road Reg M-A; write a unit test pinning the caps.
- **Acceptance:** Caps documented with an inline source link and a test.

### [P1] [speed] Tailwind does not double effective speed
- **Description:** `getEffSpeed` only handles Trick Room.
- **File:Line:** `engine.js:256–260`.
- **Expected:** If `mon.side.tailwind`, `spe *= 2`.
- **Actual:** Tailwind only decrements a counter and has no turn-order effect.
- **Fix hint:** After the paralysis branch in `getStat`, or inside `getEffSpeed`, multiply by 2 when the mon's side has tailwind.
- **Acceptance:** Whimsicott Tailwind → base 116 spe → 232 effective; Jolly base-142 Dragapult under Tailwind outspeeds 252+ Jolly Dragapult without Tailwind.

### [P1] [items] Leftovers has no effect
- **Description:** No end-of-turn recovery for Leftovers.
- **File:Line:** End-of-turn loop `engine.js:841–862`.
- **Expected:** Heal 1/16 maxHp at end of turn if alive and holding Leftovers.
- **Actual:** Ignored.
- **Fix hint:** After burn-damage loop, add leftovers loop.
- **Acceptance:** Rotom-Wash Leftovers heals 1/16 per turn.

### [P1] [items] Choice items do not lock moves
- **File:Line:** `engine.js:247–249` (multiplier), `selectMove` (picks any move).
- **Expected:** After a Choice attacker's first successful move, subsequent turns are forced to re-use that move unless item is removed.
- **Actual:** Attacker can swap moves freely.
- **Fix hint:** Track `attacker.lockedMove`. In `selectMove`, if locked, force it.
- **Acceptance:** Choice-Scarf Dragapult locked to Dragon Darts after first use.

### [P1] [items] Knock Off does not remove the target's item
- **File:Line:** `engine.js:applyDamage` / no special Knock Off branch.
- **Expected:** If target has an item and is not Mega-stone-holder, remove `target.item`. Knock Off gets 1.5× BP when the target has an item.
- **Actual:** 65 BP flat, item kept.
- **Fix hint:** Special-case Knock Off in `executeAction` / `applyDamage`.
- **Acceptance:** Incineroar Knock Off on Rotom-Wash removes Leftovers; Sitrus Berry still eats at 50% HP if present before the hit.

### [P1] [weather] Hail/snow deal no damage; no ability-summoned Snow boost
- **File:Line:** `engine.js:841–852` (sand only).
- **Expected:** In snow, Ice types get 1.5× Def (Gen 9). Hail deals 1/16 to non-Ice each turn.
- **Actual:** Neither.
- **Fix hint:** Duplicate the sand branch for snow (no damage, but +50% Def to Ice); add hail branch if supporting pre-Gen 9.
- **Acceptance:** Abomasnow in snow tanks Sucker Punch noticeably better.

### [P1] [terrain] No ability/move ever sets terrain
- **File:Line:** `engine.js:applyEntryAbility` (no surge abilities), `executeAction` (no terrain moves).
- **Expected:** Electric Surge → Electric Terrain 5 turns; Grassy Surge, Psychic Surge, Misty Surge similarly. `Electric Terrain` / `Grassy Terrain` / etc. set it.
- **Actual:** Terrain only reads, never writes.
- **Fix hint:** Add surge abilities to `applyEntryAbility`; add terrain moves to `executeAction` status-move branch.
- **Acceptance:** Tapu Koko entry sets Electric Terrain (but is banned in Reg M-A; use Pincurchin or Indeedee).

### [P1] [status] Poison/Toxic/Freeze/Confusion/Flinch are all unimplemented
- **File:Line:** `engine.js:156` comment lists statuses but only burn/paralysis/sleep are handled.
- **Expected:** Toxic damage ramps 1/16, 2/16, …; freeze has 20% thaw; confusion 33% self-hit; flinch prevents move on same turn.
- **Actual:** Missing.
- **Fix hint:** Add `poison`, `toxic`, `freeze`, `confusion`, `flinch` status branches in end-of-turn loop and pre-move check.
- **Acceptance:** Toxic on turn 3 deals 3/16.

### [P1] [doubles] Follow Me / Rage Powder / Wide Guard / Quick Guard / Ally Switch are placeholders
- **File:Line:** `engine.js:551 (Rage Powder selection backwards), 605–609 (Wide/Quick Guard = Protect)`.
- **Expected:** Redirectors claim single-target moves from opponents on faster ally; Wide Guard blocks all spread; Quick Guard blocks priority.
- **Actual:** No redirection, no side-wide protection.
- **Fix hint:** Resolve redirectors before `executeAction`; store `field.playerSide.wideGuard` etc. and check against move's `isSpread`/`priority>0` flags.
- **Acceptance:** Amoonguss Rage Powder pulls Flare Blitz off of Sinistcha.

### [P1] [state] Stat stages are not reset on switch-in
- **File:Line:** `engine.js:868–884`.
- **Expected:** New mon enters at +0/+0 boosts.
- **Actual:** Replacement keeps whatever the slot's last occupant had (slot-level state leak).
- **Fix hint:** In `replaceOnField` after `activeArr[idx] = replacement`, `replacement.statBoosts = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 }`.
- **Acceptance:** Switch-in test: Intimidate drop on slot 1 does not persist after KO-replace.

### [P1] [abilities] Core abilities missing
- **File:Line:** No `ABILITIES` map anywhere.
- **Expected:** Tough Claws (+30% contact), Adaptability (2× STAB instead of 1.5×), Pixilate (Normal→Fairy+20% BP), Dragonize (Normal→Dragon), Levitate (Ground immunity), Flash Fire (Fire immunity + 1.5× Fire), Scrappy (hit Ghost with Normal/Fighting), Piercing Drill (Protect bypass), Mega Sol (new weather), Spicy Spray, updated Unseen Fist (25% Protect bypass).
- **Actual:** None of these exist.
- **Fix hint:** Create `ABILITIES` registry with `onModifyDamage`, `onEntry`, `onSwitchIn`, `onMoveHit` hooks and wire into `calcDamage` / `executeAction`.
- **Acceptance:** Altaria-Mega with Pixilate turns Hyper Voice into Fairy-typed move with 1.2× BP.

### [P2] [damage] Screens use 0.5× in doubles (canonical 2/3 ≈ 0.667×)
- **File:Line:** `engine.js:374–375`.
- **Fix hint:** `screenMod = 2/3` in doubles.
- **Acceptance:** Recalibrate damage calc against Showdown.

### [P2] [damage] Damage roll is continuous; canonical Gen 9 is 16-step discrete
- **File:Line:** `engine.js:391`.
- **Fix hint:** `const roll = (85 + Math.floor(rng()*16)) / 100;`.
- **Acceptance:** Damage distribution matches Showdown calc over N samples.

### [P2] [data] TYPE_CHART duplicated with divergence between `data.js` and `engine.js`
- **File:Line:** `data.js:2984`, `engine.js:316`.
- **Fix hint:** Import type chart from data.js in engine.js; delete the duplicate.
- **Acceptance:** Single source of truth.

### [P2] [engine-cap] MAX_TURNS = 25 biases outcomes toward whichever side stalls
- **File:Line:** `engine.js:776`.
- **Fix hint:** Increase to 50 or report 'timeout' as draw.
- **Acceptance:** Documented behavior when a stall-vs-stall battle hits cap.

### [P2] [report] `showInlinePilotCard` counts KO'd allies as "risks" if the opponent's name shares a substring with the log
- **File:Line:** `ui.js:998–1014`.
- **Fix hint:** Parse log lines as structured events (already feasible: log lines follow `${name} fainted!`); attribute KO to the defender, not the substring match on attacker.
- **Acceptance:** vs a team with Charizard + Charizard-Mega-Y (impossible via Species Clause, but formally): KOs distinguish between forms.

### [P2] [report] Tips are static and not ruleset-aware
- **File:Line:** `ui.js:1017–1022`.
- **Fix hint:** Branch on `results.format` / `results.playerTeam` style.
- **Acceptance:** Tips for a Trick Room team are different from tips for a Tailwind team.

### [P2] [recoil] Head Smash recoil should be 1/2, not 1/3
- **File:Line:** `engine.js:753–757`.
- **Fix hint:** Split recoil by move.
- **Acceptance:** Head Smash self-damage doubles.

### [P2] [status] `applyEntryAbility` `Hospitality` only fires for player side
- **File:Line:** `engine.js:512`.
- **Fix hint:** Symmetrize.
- **Acceptance:** Opponent Sinistcha heals opponent ally on entry.

### [P2] [moves] Rain Dance is not in `executeAction`'s `STATUS_MOVES` set
- **File:Line:** `engine.js:598–599`.
- **Fix hint:** Add `'Rain Dance'` to the set.
- **Acceptance:** Pelipper Rain Dance summons rain (Drizzle already does but a `Rain Dance` from Whimsicott does not).

### [P2] [accuracy] `ACC_MAP` is sparse; most moves get 100%
- **File:Line:** `engine.js:688`.
- **Fix hint:** Populate from canonical move data.
- **Acceptance:** Rock Slide misses 10% of the time.

### [P2] [state] Accuracy/Evasion stages stored but never consulted
- **File:Line:** `engine.js:158, 688`.
- **Fix hint:** Apply `acc * evasionMult / evasionStage` to the `rng() > acc` check.
- **Acceptance:** `Double Team` into Rock Slide shows a higher miss rate.

### [P2] [legality] No singles/doubles / team-size / L50 enforcement
- **File:Line:** `engine.js:50–125`.
- **Fix hint:** Normalize level to 50, enforce member count per format, enforce `gametype`.
- **Acceptance:** Level-100 mon in VGC is auto-clamped or rejected.

### [P2] [report] `generatePilotGuide` infers "leads" by substring matching the first 8 log lines
- **File:Line:** `ui.js:989–995, 1100–1106`.
- **Fix hint:** Emit structured `leadA` / `leadB` fields from the engine.
- **Acceptance:** Pilot-guide lead attribution matches the actual first-turn active slots.

---

## Production Readiness Verdict

**NOT READY.**

The simulator is marketed as a Champions Reg M-A VGC doubles engine with coaching. In reality it is a greedy single-target damage heuristic with two Pokemon per side. The three defining mechanics of modern VGC — **Mega Evolution (Champions flagship), Tera (Gen 9 base mechanic), and true doubles targeting (Follow Me / Wide Guard / spread-hits-all)** — are all either missing entirely or stubbed.

Damage is wrong for any move whose category is not in the hardcoded name list (silently flipping physical moves to special). Teams that rely on items beyond stat-multipliers (Leftovers, Choice-lock, Knock Off removal) get wrong outcomes. Abilities beyond Intimidate and weather-summons are no-ops despite being printed on the team card. Coaching tips are derived from log-line substring matches and are easy to mis-attribute.

Until the P0 issues are fixed (gimmick engine, Tera activation, move-category table, `BP_MAP` completeness, side-state plumbing, spread-moves-hit-all, crit), the win-rate output should not be trusted for matchup planning. Bo-N confidence intervals are computed correctly on top of incorrect underlying games — the precision is real, the accuracy is not.

**Priority rebuild order:**
1. Replace ad-hoc `BP_MAP` + physical/special allowlist with a single `MOVES` registry (BP, category, accuracy, priority, target, flags).
2. Build an `ABILITIES` registry with entry / damage-modify / on-hit hooks.
3. Implement Mega Evolution + Tera activation.
4. Fix spread-targeting so spread moves hit all valid targets.
5. Wire `mon.side` into the Field before turn 1.
6. Add crit roll, Leftovers end-of-turn, Choice lock, Knock Off item removal.
7. Implement Follow Me / Rage Powder / Wide Guard / Quick Guard / Ally Switch.
8. Reset stat stages on switch-in; implement remaining statuses (toxic, flinch, confusion, freeze).
9. Fill accuracy table; make damage roll discrete; harden terrain setters.
10. Write engine-correctness tests against Pokémon Showdown damage calc as the golden reference.
