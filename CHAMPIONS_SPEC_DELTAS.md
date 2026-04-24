# Champions Spec — Deltas From User-Provided Verification (V2)

Compares user's 2026-04-24 verification report against locked `CHAMPIONS_MECHANICS_SPEC.md` (commit `2b15225`).

Legend:
- ✅ **CONFIRMS** — second source agrees with locked spec, confidence upgraded
- ⚠️ **CONFLICT** — second source disagrees with locked spec, decision needed
- ➕ **NEW** — mechanic not in locked spec, should be added
- 🔓 **UNKNOWN resolved** — previously unknown, now has primary source
- ❓ **STILL UNKNOWN** — both reports flag as unverified

---

## ⚠️ CONFLICTS — resolve before coding

### C-1. Damage random roll range

| Field | Locked spec (§8) | V2 report | Impact |
|---|---|---|---|
| Range | **85–100** (16 values) | **86–100** (15 values) | Every golden test set changes size; every roll comparison window shifts |

**Recommendation:** Adopt **86–100 / 15 rolls** since V2 cites Bulbapedia's current Champions mechanics page explicitly saying the range narrowed. Update spec §8 + validator tolerance to "exact 15-roll match." Flag as `MECH-ROLL-WINDOW` for empirical in-game verification before golden test freeze.

### C-2. Screens in Doubles — exact multiplier

| Field | Locked spec (§6) | V2 report |
|---|---|---|
| Multiplier | `×(2/3)` (≈0.667) | `2732/4096` (≈0.6670) |

**Recommendation:** Adopt `2732/4096` as the canonical fraction (matches modern core-series integer math). Semantically identical to 2/3 for display but important for exact-rounding validator.

---

## ➕ NEW mechanics to add

### N-1. Type chart display labels
- 4× = "Extremely Effective"
- 0.25× = "Mostly Ineffective"
- (Spec already has 0×/0.5×/2× labels; add these two to UI layer.)

### N-2. Protect consecutive-use math
Locked spec says "diminishing returns." V2 is more precise:
- **Success chance drops to 1/3 of the previous chance** on each consecutive successful use.
- Combined with 8 PP cap, max 8 uses but effectively 2-3 reliable.

### N-3. Move balance changes (Champions-specific)
Not in locked spec:
- **Iron Head:** flinch 20% (SV: 30%)
- **Moonblast:** SpA-drop 10% (SV: 30%)
- **Dire Claw:** status 30% (SV: 50%)
- **Hard Press:** 1–100 BP based on target HP% (SV: same, confirm)
- **Freeze-Dry:** can no longer freeze in Champions ⚠️ verify
- **Salt Cure:** 1/16 HP baseline, 1/8 on Water/Steel (confirms SV)

### N-4. Additional residual statuses to track
- **Curse (Ghost):** 1/4 max HP residual
- **Bound/Trapped:** up to 5 turns + 1/8 max HP end-of-turn
- **Leech Seed:** 1/16 max HP drain
- **Salt Cure:** 1/16 (or 1/8 on Water/Steel)

### N-5. Adaptability behavior
- STAB = 1.5× normally, **2.0× with Adaptability** (non-Tera).
- With Tera: spec §15 needs cross-check (Tera STAB stacking with Adaptability).

### N-6. Final-modifier stack order
V2 gives explicit canonical order: Targets → ParentalBond → Weather → Crit → Random → STAB → Type → Burn → FinalMods (screens/items/auras) → Protect bypass → min1/overflow.
Locked spec §8 has the same steps but not as tightly ordered — adopt V2's order verbatim.

### N-7. Friend Guard ×0.75
Not in locked spec. Ally ability, final-modifier stage. Add to item/ability registry for T9j.8.

### N-8. Per-ability Protect bypass as config
Rather than hardcoded Unseen Fist logic, engine should support:
```js
abilityProtectBypass: {
  'Unseen Fist': { pct: 0.25, contactOnly: true, triggersContactEffects: true },
  'Piercing Drill': { pct: 0.25, contactOnly: true, triggersContactEffects: true }
}
```

---

## ✅ CONFIRMATIONS (upgrade confidence to CHAMPIONS-CONFIRMED)

- Paralysis 12.5% full-para + Speed halved
- Sleep 1 guaranteed / 33% wake T2 / forced T3
- Rest sleep = 3 turns, no early wake
- Freeze 25% thaw per move attempt, forced T3
- Poison 1/8, Toxic starts 1/16 + ramp, resets on switch
- Burn 1/16 + halves physical (Guts/Facade exempt)
- Protect 8 PP
- Mega once per battle, activated before move select
- Mega Dragonite confirmed in Champions
- Mega Meganium / Mega Sol / Mega Feraligatr / Dragonize confirmed
- Piercing Drill 25% through Protect
- Unseen Fist updated to 25% (no longer 100%)
- Level 50, Bring 6 / Pick 4, Doubles, Item Clause, Perfect IVs
- Mega + Tera both legal in first ranked ruleset
- Spread moves ×0.75 when multi-target at execution

---

## ❓ STILL UNKNOWN (flag as release blockers for their subsystem)

1. **Spicy Spray** effect text — both reports lack primary source
2. **Magic Bounce** — V2 flags possible data-entry or Champions-specific rewrite conflict
3. **Mega Sol scope** — move-side only vs passive sun interactions (Harvest, etc.)
4. **Sleep/freeze counter persistence on switch** — modern-core inherited but not explicitly stated for Champions
5. **King's Shield / Baneful Bunker / Spiky Shield vs Piercing Drill / Unseen Fist 25%** — does the attacker still take the protective-move punish?
6. **86–100 roll window** — Bulbapedia says so; needs replay capture to confirm in-game
7. **Light Clay, Sitrus Berry, Booster Energy, Clear Amulet** — presence in Champions item pool

---

## RECOMMENDED SPEC PATCH

Small targeted edits to `CHAMPIONS_MECHANICS_SPEC.md`:
1. §8 damage roll: change 85–100 → 86–100, add Bulbapedia citation (flag empirical verify)
2. §6 screens: add `2732/4096` exact fraction
3. §4/§5 type chart: add "Extremely Effective" / "Mostly Ineffective" labels
4. §10 protection: tighten wording to "1/3 of previous chance" diminishing returns
5. Add §11b "Move balance changes" table: Iron Head 20%, Moonblast 10%, Dire Claw 30%, Freeze-Dry no-freeze, Hard Press 1–100
6. Add §13 "Other residuals": Curse 1/4, Bound/Trapped 1/8 + 5T, Leech Seed 1/16, Salt Cure 1/16 (1/8 W/S)
7. §17 open questions: add V2's 7 items to tracker
8. Add final-modifier pipeline diagram from V2

All changes are additive/tightening. No contradictions with locked values except C-1 (roll window).
