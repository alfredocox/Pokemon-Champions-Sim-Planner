# T9j.6 — Items pass (Refs #29 #8 #18 #11 #43)

**Validation-first finding (same pattern as Hail in T9j.4):** Several tickets in this bundle reference items that **do not exist in Pokémon Champions at launch**. Primary sources ([Game8 item list](https://game8.co/games/Pokemon-Champions/archives/593868), [IGN Champions Changes](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained), [games.gg items](https://games.gg/news/pokemon-champions-items-list-meta/)) confirm the full launch item pool is 30 items and excludes Life Orb, Choice Band, Choice Specs, Assault Vest, Light Clay, Booster Energy, Rocky Helmet, HDB, and Black Sludge.

## Scope (revised after validation)

| Ticket | Mechanic | Decision | Rationale |
|---|---|---|---|
| #29 Leftovers + stat-stage reset | Leftovers 1/16 heal end of turn; `statBoosts` reset on switch in | **IMPLEMENT** | Leftovers is confirmed available ([Game8](https://game8.co/games/Pokemon-Champions/archives/593868)) |
| #8 Focus Sash snapshot | Snapshot `wasFullHp` before HP mutation | **IMPLEMENT** | Focus Sash confirmed available ([Game8](https://game8.co/games/Pokemon-Champions/archives/593868)) |
| #18 Choice items move lock | Lock Choice users into first move | **IMPLEMENT partial** — only `Choice Scarf` (Band + Specs are absent). Trick / Switcheroo exemptions kept as written | Choice Scarf confirmed, Band + Specs absent per IGN: "Choice Band... oddly absent" |
| #11 Life Orb / Assault Vest / Booster Energy | 1.3x + recoil / 1.5x SpD / Paradox stat boost | **CLOSE WONTFIX** | All three absent at launch ([games.gg](https://games.gg/news/pokemon-champions-items-list-meta/): "Life Orb, Assault Vest, and Choice Specs are all missing"; [IGN](https://www.ign.com/wikis/pokemon-champions/Biggest_Changes_Explained): "Life Orb... not yet in the game"). ALSO **remove existing Life Orb placeholder** (engine.js:550 `loMod` and :1283 recoil block) to match Champions reality. Assault Vest 1.5x SpD block at engine.js:399 also removed. |
| #43 Light Clay | 5 → 8 turn screens | **CLOSE WONTFIX** | Light Clay absent at launch ([games.gg](https://games.gg/news/pokemon-champions-items-list-meta/): "The absence of Light Clay hits defensive teams especially hard"). No reference in Game8 item list. |

**Same pattern as T9j.4 Hail:** when a ticket asks for a mechanic that primary sources confirm is absent from Champions, we follow the sources, not the ticket.

---

## 1. engine.js changes

### 1.1 Leftovers end-of-turn heal (#29-a) — after Toxic residual loop, ~line 1452
```js
// T9j.6 (#29) — Leftovers: 1/16 maxHp per turn, only while alive.
// Cite: Game8 Champions item list; Bulbapedia Leftovers.
for (const mon of [...playerActive, ...oppActive].filter(m => m.alive && m.item === 'Leftovers' && m.hp < m.maxHp)) {
  const heal = Math.max(1, Math.floor(mon.maxHp / 16));
  mon.hp = Math.min(mon.maxHp, mon.hp + heal);
  log.push(`${mon.name} restored HP with Leftovers! [+${heal}]`);
}
```

### 1.2 Stat-stage reset on switch in (#29-b) — inside `replaceOnField`
```diff
           replacement.toxicCounter = 0;
           replacement.frozenTurns  = 0;
           replacement.sleepTurns   = 0;
+          // T9j.6 (#29) — stat stages must not leak across switches.
+          replacement.statBoosts = { atk:0, def:0, spa:0, spd:0, spe:0, acc:0, eva:0 };
+          // T9j.6 (#18) — clear Choice lock on switch in.
+          replacement.choiceLock = null;
           activeArr[idx] = replacement;
```

### 1.3 Focus Sash snapshot fix (#8) — rewrite `applyDamage` head
Current (buggy) applyDamage doesn't model Focus Sash at all. Current Pokemon class has no `applyDamage` method — damage is applied inline at `applyDamage(attacker, move, target, dmg, field, log)` free function line 1254. We add Sash handling there:
```diff
     target.hp = Math.max(0, target.hp - finalDmg);
+    // T9j.6 (#8) — Focus Sash: if the hit would KO a full-HP holder, survive at 1 HP.
+    // Snapshot must be taken BEFORE hp mutation. Cite: Bulbapedia Focus Sash.
+    if (target.hp === 0 && target.item === 'Focus Sash' && !target.itemConsumed) {
+      // wasFullHp: target.hp (before mutation) === target.maxHp. We need that BEFORE the line above.
+      // Re-check via maxHp and finalDmg: if target.maxHp <= finalDmg AND target had been full HP, Sash saves.
+    }
```
The snapshot must be taken before mutation. Cleaner rewrite:
```js
const wasFullHp = (target.hp === target.maxHp);
target.hp = Math.max(0, target.hp - finalDmg);
// Focus Sash: save from KO if holder was at full HP. Consume item.
if (target.hp === 0 && target.item === 'Focus Sash' && !target.itemConsumed && wasFullHp) {
  target.hp = 1;
  target.itemConsumed = true;
  log.push(`${target.name} hung on with its Focus Sash!`);
}
```

### 1.4 Choice Scarf move lock (#18, Scarf only)

**Constructor addition:**
```js
this.choiceLock = null; // T9j.6 (#18) — Choice Scarf lock. Set on first move used.
```

**`selectMove` enforcement (top of function):**
```js
function selectMove(attacker, allies, enemies, field) {
  // T9j.6 (#18) — Choice Scarf lock enforcement.
  // If holder already used a move, force same move (unless move no longer legal).
  if (attacker.item === 'Choice Scarf' && attacker.choiceLock
      && attacker.moves.includes(attacker.choiceLock)) {
    const liveEnemies = enemies.filter(e => e.alive);
    const target = liveEnemies[0] || allies.find(a => a !== attacker && a.alive) || null;
    return { move: attacker.choiceLock, target };
  }
  // ... (existing selection logic)
```

**`executeAction` lock set (after a successful move):** Simplest hook is right after we've resolved the move name but before damage/effects. Use a post-move side-effect:
```diff
   function executeAction(attacker, move, target, allies, enemies, field, log, rng) {
     if (!attacker.alive) return;
     if (!move) return;
+    // T9j.6 (#18) — set Choice Scarf lock on first move used (excluding Protect / Struggle).
+    if (attacker.item === 'Choice Scarf' && !attacker.choiceLock
+        && move !== 'Protect' && move !== 'Struggle' && move !== 'Trick' && move !== 'Switcheroo') {
+      attacker.choiceLock = move;
+    }
```

### 1.5 Remove Life Orb + Assault Vest placeholders (#11 WONTFIX)

Remove in `getStat`:
```diff
-    // Issue #11: Assault Vest — 1.5x Sp. Def
-    if (stat === 'spd' && this.item === 'Assault Vest') val *= 1.5;
+    // T9j.6 — Assault Vest absent from Champions launch. No effect.
```

Remove in `calcDamage`:
```diff
-    // Life Orb
-    const loMod = (this.item === 'Life Orb') ? 1.3 : 1;
+    // T9j.6 — Life Orb absent from Champions launch. No damage multiplier.
+    const loMod = 1;
```

Remove Life Orb recoil at line 1283:
```diff
-    // Life Orb recoil
-    if (attacker.item === 'Life Orb') {
-      const loRecoil = Math.floor(attacker.maxHp * 0.1);
-      attacker.hp = Math.max(0, attacker.hp - loRecoil);
-      if (attacker.hp <= 0) attacker.alive = false;
-    }
+    // T9j.6 — Life Orb absent from Champions; no recoil block needed.
```

---

## 2. CHAMPIONS_MECHANICS_SPEC.md updates

Append §8.4 Engine Implementation (T9j.6):
- Leftovers: `floor(maxHp/16)` end of turn only while HP < maxHp
- Focus Sash: snapshot `wasFullHp` at damage time, consume once
- Choice Scarf: `choiceLock` field; set on first damaging move; cleared on switch in
- Stat stages: reset to all-zero on switch in
- Life Orb / Assault Vest / Choice Band / Choice Specs / Light Clay / Booster Energy: **ABSENT from engine** (see §8.2 at-launch absence list)

---

## 3. Test plan `/tmp/items_tests.js` (~14 cases)

- Leftovers: heal 1/16 end of turn (3 cases: at-max skip, below-max heal, HP capped at maxHp)
- Focus Sash: full HP → survive at 1, partial HP → faint, consumed state (3 cases)
- Choice Scarf lock: first move sticks (2 cases: damaging + support); lock clears on switch in (1 case)
- Stat-stage reset on replacement (1 case)
- Negative: Life Orb / Assault Vest / Light Clay have **no effect** (3 cases: damage unchanged, SpD unchanged, screen duration still 5 turns)
- Regression sanity: canInflictStatus + constructor fields still intact (1 case)

---

## 4. Commit + closure plan

**Commit message (no em-dashes):**
```
add leftovers heal choice scarf lock focus sash snapshot and stat reset on switch (Refs #29 #8 #18 T9j6)
```

**Close order:**
- #29 → closed with evidence
- #8 → closed with evidence
- #18 → closed with evidence + note that Band/Specs are absent in Champions so only Scarf lock is wired
- **#11** → closed WONTFIX with Game8 + IGN + games.gg citations + note that we removed the existing Life Orb/Assault Vest placeholder code
- **#43** → closed WONTFIX with games.gg citation

---

## 5. Acceptance gates

- [ ] items_tests.js: all PASS
- [ ] status_tests.js: 27/27 PASS (regression)
- [ ] mega_tests.js: 27/27 PASS
- [ ] coverage_tests.js: 9/9 PASS
- [ ] audit: 5070 battles, 0 JS errors
- [ ] Bundle rebuilt
- [ ] All 5 tickets closed (3 implemented, 2 WONTFIX with sources)
