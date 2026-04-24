# T9j.8 — Crits, Flinch, Abilities (Finalized — validated against Champions sources)

**Scope:** tickets #27 (crits), #19 (flinch), #30 (abilities)
**Branch:** `fix/champions-sp-and-legality`
**Framework:** applies CHAMPIONS_VALIDATOR_FRAMEWORK.md v2 (strict CONFIRMED / ASSUMED / UNKNOWN labels)
**Decision record:** user-approved April 24, 2026 after primary-source re-validation.

---

## 0. Corrections from prior draft

Two items in the earlier draft were wrong and are corrected here against authoritative Champions sources:

| Previously said | Corrected to | Authoritative source |
|---|---|---|
| Unseen Fist → WONTFIX (Urshifu unclear) | **IMPLEMENT** as Champions-specific 25% damage on protecting targets. Data-driven, not Urshifu-gated. | [Serebii Updated Abilities](https://www.serebii.net/pokemonchampions/updatedabilities.shtml): *"Unseen Fist now deals only 25% damage on protecting targets instead of 100%"* • [Bulbapedia Pokémon Champions](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Champions): same wording confirmed as Champions change |
| Iron Head flinch 30% | **20%** in Champions | [Serebii Updated Attacks](https://www.serebii.net/pokemonchampions/updatedattacks.shtml): `Iron Head — Champions — 80 / 100 / 20%` vs S/V `30%` • [Bulbapedia Champions](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Champions): *"Iron Head and Moonblast's secondary effect chances were lowered from 30% to 20% and 10%, respectively"* |

---

## 1. #27 — Critical hits (P0) — **PASS**

### Sources
- [Game8 crit guide](https://game8.co/games/Pokemon-Champions/archives/594137)
- [games.gg crit guide](https://games.gg/pokemon-champions/guides/pokemon-champions-how-to-increase-critical-hit-chance/)

### Implementation rule
- Base rate: **1/24** (~4.17%) — CHAMPIONS-CONFIRMED
- Crit multiplier: **×1.5** — CHAMPIONS-CONFIRMED
- Crit ignores: target's positive Def/SpD boosts, attacker's negative Atk/SpA drops, Reflect, Light Screen, Aurora Veil
- High-crit moves (+1 stage): Slash, Razor Leaf, Crabhammer, Karate Chop, Night Slash, Stone Edge, Cross Chop, Leaf Blade, Shadow Claw, Attack Order, Drill Run (per Game8 high-crit list)
- Focus Energy: +2 crit stages (deferred if no move currently uses it)
- Always-crit moves: Flower Trick, Storm Throw, Frost Breath, Surging Strikes, Wicked Blow → stage 3

### Stage → rate table
| Stage | Rate |
|---|---|
| 0 | 1/24 |
| 1 | 1/8 |
| 2 | 1/2 |
| 3 | always (1.0) |

### Engine placement (validator step 9 of damage calc)
- In `calcDamage()` between weather/terrain multipliers and final floor
- On crit: recompute attacker Atk/SpA using `Math.max(0, boost)` (ignore drops), defender Def/SpD using `Math.min(0, boost)` (ignore boosts), bypass `screenMod` (set to 1), multiply by 1.5
- Attacker's `critStage` field stubbed for future Focus Energy / Scope Lens

### Edge cases
- Crit with Reflect active → damage unreduced (screen bypass)
- Crit against Eviolite → Eviolite still applies (not a boost, passive defensive)
- Crit cannot occur against ally (doubles ally-target moves)
- Crit with multi-hit → each hit rolls independently

### Tests to add (12)
1. 2000-sample Tackle crit rate in 95% CI of 4.17%
2. 1000 Night Slash crit rate in 95% CI of 12.5%
3. Flower Trick = 100%
4. ×1.5 multiplier on verified hit
5. Target +6 Def ignored on crit
6. Attacker −6 Atk ignored on crit
7. Reflect bypassed on crit
8. Light Screen bypassed on crit
9. Aurora Veil bypassed on crit
10. Non-crit Reflect still reduces (no double-dip)
11. Eviolite still applies on crit
12. Crit bypass correctly preserves weather/terrain/STAB modifiers

### Draft change required? Yes — no substantive change vs earlier draft (this section was already correct). Kept.

---

## 2. #19 — Flinch (P1) — **PASS (expanded, data-driven)**

### Sources
- [Game8 list of physical moves](https://game8.co/games/Pokemon-Champions/archives/590527)
- [Game8 biting moves](https://game8.co/games/Pokemon-Champions/archives/593821)
- [Serebii Updated Attacks](https://www.serebii.net/pokemonchampions/updatedattacks.shtml)
- [Bulbapedia Pokémon Champions](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Champions)

### Implementation rule — data-driven
Add `flinchChance` to each affected move in `data.js` (not hard-coded in engine). Engine reads from data, not from a closed set.

### Initial Champions flinch table (T9j.8 ship list)

| Move | Flinch % | Notes | Source |
|---|---|---|---|
| Rock Slide | 30 | spread; independent per target | Game8 physical moves |
| Air Slash | 30 | single-target | Game8 physical moves |
| Bite | 30 | biting | Game8 biting moves |
| Icicle Crash | 30 | single-target | Game8 physical moves |
| Waterfall | 20 | single-target | Game8 physical moves |
| Iron Head | **20** (Champions-nerfed from 30) | single-target | Serebii Updated Attacks + Bulbapedia |
| Zen Headbutt | 20 | single-target | Game8 physical moves |
| Dark Pulse | 20 | special | Game8 physical moves |
| Twister | 20 | special spread | Game8 (validate in tests) |
| Fire Fang | 10 flinch + 10 burn (independent) | biting | Game8 Fire Fang page |
| Thunder Fang | 10 flinch + 10 paralyze (independent) | biting | Game8 status moves |
| Ice Fang | 10 flinch + 10 freeze (independent) | biting | Game8 status moves |
| Fake Out | 100 (turn 1 only) | already implemented | Game8 physical moves |

### Engine placement (validator step 13 — secondary effects)
- After `applyDamage()` and target is alive
- Read `move.flinchChance` (default undefined → no roll)
- Roll once per target per hit
- Set `target._flinched = true` if roll succeeds
- Resolution: `_flinched` blocks action only if `!hasActed` (validator step 4 — pre-act check)

### Edge cases
- **Already acted**: flinch flag is only consumed if target hasn't moved this turn (validated)
- **Spread moves**: Rock Slide rolls independently per target hit (each `applyDamage` call has its own roll)
- **Multi-hit moves**: King's Rock / Razor Fang are NOT in the confirmed Champions held-item list — **DEFER** until items dataset confirms. Do not add unless item data exists.
- **Inner Focus / Shield Dust**: neither confirmed in Champions ability roster at time of ship — **DEFER**. Mark a TODO hook in ability registry but no behavior until abilities confirmed via `ABILITIES` Champions-CONFIRMED pass.
- **Serene Grace**: no Champions source cross-referenced at ship time — **DEFER**; no boost applied.
- **Fang moves dual rolls**: two independent rolls (flinch and status) — must use `Math.random() < 0.10` twice, not once.

### Tests to add (10)
1. Rock Slide 1000 hits → 300 ± 30 flinches (30% CI)
2. Iron Head 1000 hits → 200 ± 25 flinches (20%, Champions-nerfed — regression-proof the 20% value)
3. Zen Headbutt 1000 hits → 200 ± 25
4. Fire Fang 1000 hits → burn rate ~10% AND flinch rate ~10%, independent (joint ≈ 1%)
5. Thunder Fang flinch + paralyze independent rolls
6. Ice Fang flinch + freeze independent rolls
7. Flinch does not trigger if target already acted
8. Rock Slide into two targets → each gets own roll (joint-independence regression)
9. Fake Out turn 1 always flinches; turn 2 fails
10. No flinch if `flinchChance` missing from move data (fail-safe default)

### Draft change required? **YES** — add Thunder Fang, Ice Fang, Icicle Crash, Waterfall, Dark Pulse, Twister. Correct Iron Head 30 → 20. Move from hard-coded table to data-driven `flinchChance`.

---

## 3. #30 — Abilities — **PASS (5 abilities + Protean defer)**

### 3a. Piercing Drill (Mega Excadrill) — **PASS**

**Source:** [Bulbapedia Piercing Drill](https://bulbapedia.bulbagarden.net/wiki/Piercing_Drill_(Ability)) • [Game8 Abilities](https://game8.co/games/Pokemon-Champions/archives/590403) • [Game8 Mega Excadrill](https://game8.co/games/Pokemon-Champions/archives/592396)

**Rule:** Contact moves used by the holder hit targets through Protect/Detect/Baneful Bunker/King's Shield/Spiky Shield/Obstruct, dealing **1/4 (25%) of the damage the move would otherwise deal**. Deterministic. Non-contact moves are blocked by protection as normal. Everything except the protection effect still triggers (secondary effects, crit, flinch, Spicy-Spray-style contact triggers on the defender all still apply).

**Engine placement (validator step 15 — contact triggers):** In `resolveProtect()` hook. If move is contact AND attacker has Piercing Drill AND target has a protection effect active → compute normal damage, multiply by 0.25, apply, then let other on-hit triggers resolve.

**Edge cases:**
- Max Guard: skip bypass (Max Guard is explicitly blocking per Bulbapedia). Not relevant at ship since Dynamax is absent from Champions.
- Contact-altering items (Punching Glove makes punching moves non-contact): if item is in Champions data, the non-contact conversion blocks the bypass. Honor the conversion.
- Multi-hit contact moves: each hit is reduced to 1/4.
- Secondary effects (e.g. burn chance from Fire Punch): still roll at normal chance on the 1/4 damage.

**Tests (4):**
1. Drill Run (contact) into Protect → 1/4 normal calculated damage
2. Earthquake (non-contact) into Protect → 0 damage (not bypassed)
3. Contact move through Protect still rolls secondary effects at normal rate
4. Damage is `round(normal_damage * 0.25)`, not `target.maxHp * 0.25`

**Draft change required?** Minor — draft already had this correct; reinforce non-contact block test and secondary-effects-still-trigger test.

### 3b. Spicy Spray (Mega Scovillain) — **PASS**

**Source:** [Bulbapedia Spicy Spray](https://bulbapedia.bulbagarden.net/wiki/Spicy_Spray_(Ability)) • [Game8 Scovillain builds](https://game8.co/games/Pokemon-Champions/archives/595001) • [Game8 Mega Scovillain](https://game8.co/games/Pokemon-Champions/archives/592424) • [Game8 Abilities](https://game8.co/games/Pokemon-Champions/archives/590403)

**Rule:** When a Pokémon with Spicy Spray is hit by a damaging move, the attacking Pokémon becomes burned. **100% activation, no roll.** Triggers:
- Physical or special damaging move
- Even if the hit KOs the holder
- Even if the attacker is behind a Substitute (attacker-side Sub does NOT block the burn)
- Does **NOT** activate if the holder is behind a Substitute
- Each hit of a multi-strike move activates it (potentially re-burning if first burn was healed mid-turn, e.g. Lum Berry)

**Engine placement (validator step 15 — on-damage-taken hook):** In `onDamageTaken(defender, attacker, move, damage)`. After damage application, if `damage > 0` AND defender has Spicy Spray AND defender is not behind Sub AND attacker can be burned → apply burn.

**Edge cases:**
- Attacker already burned/frozen/poisoned/paralyzed/asleep → burn fails (status cannot stack)
- Attacker is Fire-type → burn cannot apply (immunity)
- Attacker has a burn-blocking ability (none confirmed in Champions roster yet — DEFER the hook but default to allow)
- Holder behind Sub → ability does not fire (Sub absorbs hit)
- Multi-hit: burn applied per hit that actually damages; re-burn if prior burn was cleansed (Lum Berry interaction deferred — Lum not in confirmed Champions items)

**Tests (5):**
1. Physical damaging move on Mega Scovillain → attacker burned
2. Special damaging move on Mega Scovillain → attacker burned
3. Attacker already paralyzed → burn not applied
4. Fire-type attacker → burn not applied (type immunity)
5. Holder behind Substitute → burn not applied (Sub blocks trigger)

**Draft change required?** **YES** — prior draft said "fails if holder behind Sub" (correct) but was not explicit about attacker-behind-Sub (does NOT block), KO-triggered burn, and multi-hit per-hit activation. Tests expanded.

### 3c. Unseen Fist — **PASS (previously marked WONTFIX — corrected)**

**Source:** [Serebii Updated Abilities](https://www.serebii.net/pokemonchampions/updatedabilities.shtml) • [Bulbapedia Pokémon Champions](https://bulbapedia.bulbagarden.net/wiki/Pok%C3%A9mon_Champions) • [Bulbapedia Unseen Fist](https://bulbapedia.bulbagarden.net/wiki/Unseen_Fist_(Ability))

**Rule:** Champions modified Unseen Fist. Contact moves used by the holder hit through protection effects (Protect, Detect, Baneful Bunker, etc.) dealing **25% of the damage** that would otherwise be dealt. **Same protection-bypass damage model as Piercing Drill.** Non-contact moves do not bypass.

**Why Champions changed it:** Serebii explicitly lists this as an "Updated Ability" vs mainline. Bulbapedia Champions page confirms under "Some Abilities were modified: Unseen Fist now deals only 25% damage on protecting targets instead of 100%."

**Roster note:** Urshifu's explicit listing in the confirmed Champions Gen 8 roster at launch is not definitively established from the games.gg roster dump, but the Champions ability dataset includes Unseen Fist — so the ability **must be implemented data-driven**, not hard-coded to Urshifu. If Urshifu ships later (or if another Pokémon gains Unseen Fist in a patch), the engine will work without changes.

**Engine placement:** Same `onProtectResolve` hook as Piercing Drill. Both abilities resolve through the same path: `if (attackerHasAnyOf(['Piercing Drill', 'Unseen Fist']) && moveIsContact && targetProtected) → damage *= 0.25`.

**Edge cases:**
- Same as Piercing Drill (non-contact blocked, Max Guard blocked, Punching Glove conversion, multi-hit per-hit, secondary effects still roll)
- Protective Pads on attacker: in mainline, Unseen Fist still triggers with Protective Pads. In Champions, no contrary source, so preserve behavior.
- Punching Glove: turns punching moves into non-contact → bypass should NOT apply (mainline precedent). If Punching Glove not in Champions item dataset, skip.

**Tests (4):**
1. Unseen-Fist contact move through Protect → 1/4 normal calculated damage
2. Unseen-Fist non-contact move through Protect → 0 damage
3. Ability registry is data-driven (setting a test mon's ability to `Unseen Fist` triggers the hook without type/species gating)
4. Piercing Drill + Unseen Fist share a single `onProtectResolve` code path (no duplication regression)

**Draft change required?** **YES — MATERIAL.** Move from WONTFIX/DEFER to PASS with full implementation. Update `§4 Deferred` removing Unseen Fist; add to `§4 In-scope` abilities table.

### 3d. Parental Bond (Mega Kangaskhan) — **PASS**

**Source:** [Game8 Parental Bond](https://game8.co/games/Pokemon-Champions/archives/593625) • [Bulbapedia Parental Bond](https://bulbapedia.bulbagarden.net/wiki/Parental_Bond_(Ability))

**Rule:** Single-target damaging moves hit twice. Second hit is at **1/4 power** of the parent hit (Gen 7+ default; no Champions-specific deviation found). Each hit has its own independent crit roll, flinch roll, and secondary-effect rolls. Does not apply to multi-target moves (spread moves in doubles), multi-hit moves, or status moves.

**Engine placement:** Inline in `executeAction` as a 2-strike loop over `applyDamage` when attacker has Parental Bond AND move is single-target damaging AND move is not already multi-strike.

**Edge cases:**
- Focus Sash: first hit can reduce to 1 HP, second hit KOs. Sash consumed on first hit.
- Sturdy: same sequencing — first hit leaves at 1 HP, second hit KOs. Sturdy consumed after first hit if at full HP pre-hit.
- Spread moves (Rock Slide, Earthquake, Surf): Parental Bond does NOT apply (single-target only).
- Multi-hit moves (Bullet Seed, Rock Blast): Parental Bond does NOT apply.
- Status moves: no second hit.
- Secondary effects (e.g. Return has none, but Fire Punch burn): each strike rolls independently.
- Contact triggers (Spicy Spray, Piercing Drill bypass): both strikes count as contact hits — Spicy Spray would fire per hit.

**Tests (5):**
1. Return into test dummy → 2 hits logged, second at BP ≈ 85 × 0.25 ≈ damage-equivalent to BP 21
2. Focus Sash target: first hit leaves at 1 HP, second KOs (Sash consumed after hit 1)
3. Spread move (Rock Slide) against 2 targets → 1 hit per target (Parental Bond disabled for spread)
4. Multi-hit Bullet Seed → unchanged count (no second pass)
5. Fire Punch Parental Bond → 2 independent 10% burn rolls

**Draft change required?** Minor — earlier draft was correct in outline; tests expanded to include contact-trigger interaction (Spicy Spray per-hit fires twice if Parental Bond + Spicy Spray defender).

### 3e. Dragonize (Mega Feraligatr) — **PASS** (unchanged from earlier draft)

**Source:** [Game8 Abilities](https://game8.co/games/Pokemon-Champions/archives/590403) • [Game8 Mega Feraligatr](https://game8.co/games/Pokemon-Champions/archives/592444) • [games.gg Mega abilities](https://games.gg/pokemon-champions/guides/pokemon-champions-all-mega-evolution-and-abilities/)

**Rule:** Normal-type moves used by the holder become Dragon-type with **+20% base power**. Applied in `onModifyMove(move, attacker)` before type/STAB resolution.

**Tests (2):**
1. Return (Normal, BP 102) cast by Mega Feraligatr → resolves as Dragon, effective BP 122
2. Tera Blast / other non-Normal moves unaffected

### 3f. Mega Sol (Mega Meganium) — **PASS** (unchanged)

**Source:** [games.gg](https://games.gg/pokemon-champions/guides/pokemon-champions-all-mega-evolution-and-abilities/) • IGN (cached)

**Rule:** Holder's weather-dependent moves (Solar Beam, Morning Sun, Synthesis, Weather Ball, Growth) act as if harsh sunlight is in play for that move, regardless of field weather. Does NOT set field weather; does NOT boost opponent Fire moves; does NOT weaken opponent Water moves.

**Tests (2):**
1. Mega Meganium Solar Beam → no charge turn, fires immediately
2. Opposing Fire Blast damage unaffected (weather field remains actual)

### 3g. Protean — **DEFER (confirmed, deferred due to implementation complexity)**

**Source:** [Bulbapedia Protean](https://bulbapedia.bulbagarden.net/wiki/Protean_(Ability))

**Status:** CONFIRMED in Champions (Gen 9 behavior: once-per-switch-in type change). Deferred to **T9j.9 or T9j.10** because it requires a type-mutation pipeline not yet in the engine (currently types are read once at team load; Protean needs dynamic per-use type change with STAB recomputation and defensive type updates).

**Required when implemented:**
- Once-per-switch-in gating (`mon._proteanUsed` flag cleared on switch)
- Type mutation to move's type BEFORE STAB recomputation
- Defensive type changes for incoming damage until next switch
- Interaction with Terastal / Mega (if applicable — Champions has no Tera at launch per confirmed sources, so Mega interaction only)

**Tests to add in T9j.9/10:** once-per-switch tracking, STAB recalculation, defensive type change timing.

---

## 4. Abilities registry summary (in scope for T9j.8)

| Ability | Mechanic | Status |
|---|---|---|
| Piercing Drill | Contact through Protect at 1/4 dmg (deterministic) | **SHIP** |
| Unseen Fist | Contact through Protect at 1/4 dmg (deterministic, shared code path with Piercing Drill) | **SHIP** |
| Spicy Spray | 100% burn attacker on any damaging hit; Sub rules apply | **SHIP** |
| Dragonize | Normal → Dragon + 20% BP | **SHIP** |
| Mega Sol | Personal-sun weather emulation for holder's weather-dependent moves | **SHIP** |
| Parental Bond | 2 strikes on single-target, 2nd at 1/4 power, independent rolls | **SHIP** |
| Protean | Once-per-switch type change (Gen 9 default) | **DEFER to T9j.9/10** (confirmed, pipeline not ready) |

---

## 5. Engine placement per validator framework

- **Step 9 (damage calc):** crit multiplier + stage resolution
- **Step 13 (secondary effects):** flinch roll via `move.flinchChance`, Fire/Ice/Thunder Fang dual rolls
- **Step 15 (contact triggers + on-damage hooks):** `onProtectResolve` (Piercing Drill + Unseen Fist, shared), `onDamageTaken` (Spicy Spray), `onModifyMove` (Dragonize), `onWeatherCheck` (Mega Sol), inline 2-strike loop (Parental Bond)

`ABILITIES` registry gains 6 entries. `FLINCH_MOVES` removed — engine reads `move.flinchChance` from data.

---

## 6. Test plan — `poke-sim/tests/t9j8_tests.js`

~38 tests total across three suites:

| Suite | Count | Focus |
|---|---|---|
| Crits | 12 | base rate, high-crit, always-crit, boost/drop ignore, screen bypass, Eviolite, multi-hit independence |
| Flinch | 10 | rates per move, pre-act gating, spread independence, Fang dual rolls, fail-safe default |
| Abilities | 16 | Piercing Drill (4), Unseen Fist (4), Spicy Spray (5), Parental Bond (5), Dragonize (2), Mega Sol (2) — two overlap (Parental Bond × Spicy Spray interaction) |

All tests live in `poke-sim/tests/t9j8_tests.js`, runnable via `node tests/t9j8_tests.js` from `poke-sim/poke-sim/`.

---

## 7. Spec updates

- `CHAMPIONS_MECHANICS_SPEC.md §9 Critical hits` — rates, stages, bypass list, ×1.5 multiplier
- `CHAMPIONS_MECHANICS_SPEC.md §10 Flinch` (new) — data-driven flinchChance, pre-act gating, Champions Iron Head nerf noted
- `CHAMPIONS_MECHANICS_SPEC.md §7.8 Champions-specific abilities` — Piercing Drill, Unseen Fist (new Champions nerf), Spicy Spray, Dragonize, Mega Sol, Parental Bond with primary-source citations
- `CHAMPIONS_SPEC_DELTAS.md` — add Iron Head 30→20%, Moonblast 30→10%, Unseen Fist 100%→25%
- Close-out note: Protean confirmed-deferred to T9j.9/10

---

## 8. Commit plan

**Message (no em-dashes):**
```
add critical hits flinch rolls and six champions abilities with validator framework (Refs #27 #19 #30 T9j8)
```

Closure plan:
- Close #27 COMPLETED
- Close #19 COMPLETED
- Close #30 COMPLETED for 6 implemented abilities (Piercing Drill, Unseen Fist, Spicy Spray, Dragonize, Mega Sol, Parental Bond); post note that Protean is confirmed-deferred to T9j.9/10 with sources

---

## 9. Decision summary table

| Mechanic | Verdict | Implementation rule | Key edge cases | Draft change required |
|---|---|---|---|---|
| Crits | **PASS** | 1/24 base, ×1.5, stage table, screen/boost/drop bypass | multi-hit independence, Eviolite still applies | No |
| Flinch | **PASS** | Data-driven `move.flinchChance`, pre-act gating, dual rolls for Fang moves | Iron Head 20% (Champions-nerfed), spread independence, Fang dual rolls, K-Rock/Razor Fang/Inner Focus/Shield Dust/Serene Grace deferred | **Yes** — corrected Iron Head, added Thunder/Ice Fang + Icicle Crash + Waterfall + Dark Pulse + Twister, moved to data-driven |
| Piercing Drill | **PASS** | Contact into Protect → 1/4 damage deterministic; secondary effects still roll | Non-contact blocked, multi-hit per-hit, Punching Glove conversion | Minor — tests expanded |
| Spicy Spray | **PASS** | 100% burn attacker when holder is hit by damaging move; holder-Sub blocks; attacker-Sub does not block; multi-hit per-hit | KO still triggers, Fire-type attacker immune, already-statused attacker skipped | **Yes** — multi-hit and sub-side rules explicit |
| Unseen Fist | **PASS (corrected from WONTFIX)** | Contact into Protect → 1/4 damage deterministic; same code path as Piercing Drill | Data-driven, not Urshifu-hard-coded; Punching Glove conversion | **YES MATERIAL** — removed from DEFER, added to SHIP |
| Parental Bond | **PASS** | 2 strikes on single-target dmg moves, 2nd at 1/4 power, independent rolls | Sash/Sturdy sequencing, spread-move disable, multi-hit disable, contact triggers per-hit | Minor — contact-trigger interaction test added |
| Dragonize | **PASS** | Normal → Dragon + 20% BP via `onModifyMove` | Non-Normal moves unaffected | No |
| Mega Sol | **PASS** | Personal harsh-sun for holder's weather-dependent moves | Does not set field weather, opponent unaffected | No |
| Protean | **DEFER** (confirmed) | Once-per-switch type change — pipeline not ready | Type mutation + STAB + defensive + Mega interaction | Moved to T9j.9/10 roadmap |

---

## 10. Ready-to-ship checklist

- [ ] Engine: add `CRIT_STAGES`, `HIGH_CRIT_MOVES`, `ALWAYS_CRIT_MOVES` in engine.js
- [ ] Engine: implement `calcDamage()` crit path (step 9)
- [ ] Data: add `flinchChance` to 13 moves in data.js (Rock Slide, Iron Head, Air Slash, Bite, Zen Headbutt, Dark Pulse, Icicle Crash, Waterfall, Twister, Fire Fang, Thunder Fang, Ice Fang, Fake Out — last one already covered)
- [ ] Engine: remove hard-coded `FLINCH_MOVES`, read from data
- [ ] Engine: `ABILITIES` registry with 6 hooks (Piercing Drill, Unseen Fist, Spicy Spray, Dragonize, Mega Sol, Parental Bond)
- [ ] Data: tag Mega Excadrill, Mega Scovillain, Mega Feraligatr, Mega Meganium, Mega Kangaskhan with correct Champions abilities
- [ ] Data: note Unseen Fist is data-driven; if Urshifu/other ships, tag them in a follow-up
- [ ] Tests: `poke-sim/tests/t9j8_tests.js` — 38 tests
- [ ] Regression: status 27/27, items 14/14, mega 27/27, coverage 9/9, audit 0 errors
- [ ] Bundle: rebuild (`pokemon-champion-2026.html`)
- [ ] Commit: `add critical hits flinch rolls and six champions abilities with validator framework (Refs #27 #19 #30 T9j8)`
- [ ] Close: #27, #19, #30 (comment out-of-scope items: Protean deferred)
