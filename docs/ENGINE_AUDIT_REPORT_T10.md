# ENGINE AUDIT REPORT — T10 (April 25, 2026)

Auditor: AI (full engine.js line-by-line review)  
File audited: `poke-sim/engine.js` (SHA: 1d7f0361c4d194b1a98a2f9868863054e4200a6d)  
Scope: All non-Tera engine logic. Tera deferred per user — not in Champions Reg M-A.

---

## Summary

| Bug ID | Severity | Location | Status |
|--------|----------|----------|--------|
| BUG-1  | HIGH     | `calcDamage()` — targetTypes | **FIXED** |
| BUG-2  | DEFERRED | `calcDamage()` — Tera STAB attackerTypes | Deferred — Tera not in Champions |
| BUG-3  | MEDIUM   | `executeAction()` — ACC_MAP Will-O-Wisp | **FIXED** |
| BUG-4  | HIGH     | `selectMove()` — Tailwind side detection | **FIXED** |
| BUG-5  | HIGH     | `runMegaSweepCell()` — res.winner vs res.result | **FIXED** |
| BUG-6  | LOW      | `tryMegaPhase()` — function inside while-loop | NOTED (comment added) |
| BUG-7  | MEDIUM   | `executeAction()` — ACC_MAP Sleep Powder | **FIXED** (same fix as BUG-3) |
| BUG-8  | LOW      | `replaceOnField()` — helpingHand not cleared | **FIXED** |
| BUG-9  | MEDIUM   | `applyDamage()` — recoil uses pre-sash damage | **FIXED** |
| BUG-10 | HIGH     | `selectMove()` — screens side detection | **FIXED** (same fix as BUG-4) |

---

## Bug Details

### BUG-1 — Tera type-effectiveness gate (HIGH)
- **Root cause**: `(this.teraActivated && target.tera)` used the **attacker's** `teraActivated` flag to decide if the **target's** Tera type applies.
- **Effect**: Wrong ownership — attacker's Tera state controlled target's type presentation.
- **Fix**: Changed to `(target.teraActivated && target.tera)`.
- **Note**: Tera deferred in Champions — `teraActivated` is always false. Fix is correct for when Tera ships.

### BUG-2 — Tera STAB attackerTypes (DEFERRED)
- **Status**: STAB line `(this.teraActivated && this.tera)` is already correct.
- **Deferred**: Tera not in Champions. Added documentation comment.

### BUG-3 + BUG-7 — Double-miss on Will-O-Wisp and Sleep Powder (MEDIUM)
- **Root cause**: Both moves were in `ACC_MAP` in `executeAction` AND had their own miss rolls inside the `STATUS_MOVES` branch handlers.
- **Effect**: The ACC_MAP check ran before the STATUS_MOVES early return, creating a dead-but-confusing second roll path. Functionally both miss rates were governed by the status handler, but the ACC_MAP entries could have caused incorrect miss on status moves that fell through edge cases.
- **Fix**: Removed `Will-O-Wisp` and `Sleep Powder` from `executeAction`'s ACC_MAP.

### BUG-4 + BUG-10 — selectMove() side detection always resolves to oppSide (HIGH)
- **Root cause**: `attacker.side === 'player'` compared an **object reference** against the string `'player'`. Always false — always selected `oppSide`.
- **Effect**: All utility-move scoring (Tailwind, Light Screen, Reflect, Aurora Veil) evaluated opponent's side conditions instead of attacker's own side. AI could cast duplicate screens or skip setup when opponent had it.
- **Fix**: `const _selfSide = (allies === playerActive) ? field.playerSide : field.oppSide;`

### BUG-5 — runMegaSweepCell result field wrong (HIGH)
- **Root cause**: Checked `res.winner` but `simulateBattle()` returns `res.result` ('win'/'loss'/'draw').
- **Effect**: `wins` and `losses` always 0. Every sweep cell returned `wr=0.0`. Mega Trigger Sweep feature completely broken.
- **Fix**: Changed to `res.result === 'win'` and `res.result === 'loss'`.

### BUG-6 — tryMegaPhase inside while-loop (LOW)
- **Root cause**: `function tryMegaPhase(...)` declared inside `while` loop body. Non-strict: works via hoisting. Strict mode: throws.
- **Fix**: Added comment flagging for hoist-above-loop refactor. No code restructuring (minimize diff).

### BUG-8 — helpingHand not cleared on switch-in (LOW)
- **Root cause**: `replaceOnField` clears `statBoosts`, `toxicCounter`, `frozenTurns`, etc. but not `helpingHand`.
- **Effect**: Edge case only — if a benched mon had `helpingHand=true`, it would carry a free 1.5× damage boost into battle.
- **Fix**: Added `replacement.helpingHand = false;` to switch-in block.

### BUG-9 — Recoil uses pre-Focus Sash damage (MEDIUM)
- **Root cause**: `Math.floor(finalDmg / 3)` where `finalDmg` is pre-sash. If Sash saved the target, actual HP removed was `maxHp - 1`, not `finalDmg`.
- **Effect**: Attacker takes full recoil even when the hit was capped to 1 HP damage by Focus Sash. Incorrect KO/damage on attacker.
- **Fix**: `const actualDmg = sashSaved ? Math.max(0, target.maxHp - 1) : finalDmg;`

---

## What Was NOT Changed
- Tera mechanic activation (`teraActivated` flip) — deferred, not in Champions
- `tryMegaPhase` function body or position — only a comment added (BUG-6)
- Any data.js, ui.js, or index.html files
- ENGINE_VERSION string — bump separately when rebuilding bundle

---

## Rebuild Required
After merging this PR, run the standard rebuild command from MASTER_PROMPT.md to regenerate `pokemon-champion-2026.html`.
