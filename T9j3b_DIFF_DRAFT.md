# T9j.3b DIFF DRAFT — Coverage Refresh + Speed Control + Mega Base Stats

**Date:** 2026-04-24
**Branch:** fix/champions-sp-and-legality
**Status:** DRAFT — awaiting approval before apply

## Scope
1. Correct 3 wrong Mega base stats (Dragonite-Mega, Drampa-Mega, Froslass-Mega) to Champions canonical values.
2. Fix coverage staleness: recompute on every team / move / ability / form change.
3. Rename "Trick Room Counter" -> "Trick Room" with broader detection.
4. Add `speed_control` category with 5 sub-flags (speed_lowering incl. Sticky Web, speed_boosting, field_effects = own-team only, abilities, priority_speed).
5. Export structured COVERAGE_RESULT object for programmatic use.
6. Unit tests (`/tmp/coverage_tests.js`).

**Deferred to T9j.7 (new ticket):** Mega Evolution as in-battle transformation (base-form lead, stone item trigger, stat/type/ability swap). The 3 Mega stat corrections are interim until T9j.7 retires the `-Mega` species entries.

---

## Diff 1: data.js — Mega base stat corrections

### Dragonite-Mega (line ~26)

```diff
- 'Dragonite-Mega': { hp:91, atk:175, def:95,  spa:100, spd:100, spe:80,  types:['Dragon','Flying'] },
+ // Champions canonical: 91/124/115/145/125/100 (BST 700). Source: Game8, RotomLabs, Serebii Champions Pokedex.
+ // Prior SV port values (91/175/95/100/100/80) were incorrect for Champions.
+ 'Dragonite-Mega': { hp:91, atk:124, def:115, spa:145, spd:125, spe:100, types:['Dragon','Flying'] },
```

### Drampa-Mega (line ~33)

```diff
- 'Drampa-Mega':  { hp:89, atk:90, def:85,  spa:145, spd:100, spe:60, types:['Normal','Dragon'] },
+ // Champions canonical: 78/85/110/160/116/36 (BST 585). Source: Game8, RotomLabs, Bulbapedia.
+ 'Drampa-Mega':  { hp:78, atk:85, def:110, spa:160, spd:116, spe:36, types:['Normal','Dragon'] },
```

### Froslass-Mega (line ~59)

```diff
- 'Froslass-Mega': { hp:70, atk:80, def:70, spa:105, spd:95,  spe:125, types:['Ice','Ghost'] },
+ // Champions canonical: 70/80/70/140/100/120 (BST 580). Source: Game8, OP.GG Champions, RotomLabs.
+ 'Froslass-Mega': { hp:70, atk:80, def:70, spa:140, spd:100, spe:120, types:['Ice','Ghost'] },
```

---

## Diff 2: ui.js — Coverage staleness fix + speed_control + refresh hooks

### Replace `COVERAGE_CHECKS` + `renderCoverageWidget` block (lines ~1603-1628)

```diff
  // ============================================================
  // PART 5B: ROLE COVERAGE CHECKER
  // FIX: Must use var (not const/let) — referenced during init before declaration
  // ============================================================
- var COVERAGE_CHECKS = [
-   { label: 'Fake Out', check: m => m.moves && m.moves.includes('Fake Out') },
-   { label: 'Trick Room Counter', check: m => m.moves && (m.moves.includes('Taunt') || m.moves.includes('Imprison') || m.moves.includes('Tailwind') || m.moves.includes('Icy Wind')) },
-   { label: 'Redirection', check: m => m.moves && (m.moves.includes('Follow Me') || m.moves.includes('Rage Powder')) },
-   { label: 'Priority', check: m => m.moves && (m.moves.includes('Extreme Speed') || m.moves.includes('Fake Out') || m.moves.includes('Aqua Jet') || m.moves.includes('Sucker Punch')) },
-   { label: 'Weather Setter', check: m => m.ability && (m.ability === 'Drought' || m.ability === 'Drizzle' || m.ability === 'Sand Stream' || m.ability === 'Snow Warning') }
- ];
-
- function renderCoverageWidget() {
-   const el = document.getElementById('coverage-items');
-   if (!el) return;
-   const members = TEAMS.player.members;
-   el.innerHTML = COVERAGE_CHECKS.map(chk => {
-     const covered = members.some(chk.check);
-     return `<div class="coverage-item ${covered ? 'coverage-ok' : 'coverage-miss'}">
-       <span>${covered ? '✓' : '✗'}</span>
-       <span>${chk.label}</span>
-     </div>`;
-   }).join('');
- }
-
- renderCoverageWidget();
+ // ---- Champions-legal move lists for coverage detection ----
+ // Note: kept as `var` for the TDZ-safe init pattern other checks follow.
+ var PRIORITY_MOVES = [
+   'Fake Out','Extreme Speed','Aqua Jet','Shadow Sneak','Sucker Punch',
+   'Bullet Punch','Ice Shard','Vacuum Wave','Mach Punch','Grassy Glide',
+   'Quick Attack','Accelerock','First Impression','Baby-Doll Eyes'
+ ];
+ var SPEED_LOWER_MOVES = [
+   'Electroweb','Icy Wind','Bulldoze','Low Sweep','Rock Tomb','Scary Face',
+   'Glaciate','String Shot','Mud Shot','Drum Beating','Sticky Web',
+   'Cotton Spore','Tail Wind'  // (Tail Wind self excluded via field_effects)
+ ].filter(m => m !== 'Tail Wind');
+ var SPEED_BOOST_MOVES = [
+   'Dragon Dance','Agility','Rock Polish','Flame Charge','Shift Gear',
+   'Trailblaze','Quiver Dance','Victory Dance','Autotomize','Rapid Spin'
+ ];
+ var SPEED_FIELD_MOVES = ['Tailwind','Trick Room'];
+ var SPEED_PRIORITY_MANIP = ['Feint','After You','Quash','Ally Switch'];
+ var SPEED_ABILITIES = [
+   'Chlorophyll','Swift Swim','Sand Rush','Slush Rush','Unburden',
+   'Surge Surfer','Wind Rider','Quick Feet','Steam Engine','Motor Drive'
+ ];
+ var WEATHER_ABILITIES = ['Drought','Drizzle','Sand Stream','Snow Warning'];
+ var WEATHER_MOVES = ['Sunny Day','Rain Dance','Snowscape','Hail','Sandstorm'];
+ var REDIRECTION_MOVES = ['Follow Me','Rage Powder','Spotlight'];
+ var TR_COUNTER_MOVES = ['Trick Room','Taunt','Imprison','Fake Out'];
+
+ // COVERAGE_CHECKS: legacy list for the simple checkmark UI row.
+ // Kept as `var` (see file-header note) because it is referenced during init.
+ var COVERAGE_CHECKS = [
+   { label: 'Fake Out',     check: m => m.moves && m.moves.includes('Fake Out') },
+   { label: 'Trick Room',   check: m => m.moves && TR_COUNTER_MOVES.some(x => m.moves.includes(x)) },
+   { label: 'Redirection',  check: m => m.moves && REDIRECTION_MOVES.some(x => m.moves.includes(x)) },
+   { label: 'Priority',     check: m => m.moves && PRIORITY_MOVES.some(x => m.moves.includes(x)) },
+   { label: 'Weather Setter', check: m => (m.ability && WEATHER_ABILITIES.includes(m.ability))
+                                       || (m.moves && WEATHER_MOVES.some(x => m.moves.includes(x))) },
+   { label: 'Speed Control', check: (m, all) => _hasAnySpeedControl(m, all) }
+ ];
+
+ // ---- structured coverage result (T9j.3b) ----
+ // No caching. Recomputed every call. Always reflects current team state.
+ function computeCoverage(teamKey) {
+   var key = teamKey || currentPlayerKey;
+   var team = TEAMS[key];
+   var members = (team && team.members) || [];
+   var anyMove = function(list) {
+     return members.some(m => m.moves && list.some(x => m.moves.includes(x)));
+   };
+   var anyAbility = function(list) {
+     return members.some(m => m.ability && list.includes(m.ability));
+   };
+   var speed_lowering = anyMove(SPEED_LOWER_MOVES);
+   var speed_boosting = anyMove(SPEED_BOOST_MOVES);
+   var field_effects  = anyMove(SPEED_FIELD_MOVES);  // own-team only
+   var speed_ability  = anyAbility(SPEED_ABILITIES);
+   var priority_speed = anyMove(SPEED_PRIORITY_MANIP);
+   return {
+     fake_out:       anyMove(['Fake Out']),
+     trick_room:     anyMove(TR_COUNTER_MOVES),
+     redirection:    anyMove(REDIRECTION_MOVES),
+     priority:       anyMove(PRIORITY_MOVES),
+     weather_setter: anyAbility(WEATHER_ABILITIES) || anyMove(WEATHER_MOVES),
+     speed_control: {
+       speed_lowering: speed_lowering,
+       speed_boosting: speed_boosting,
+       field_effects:  field_effects,
+       abilities:      speed_ability,
+       priority_speed: priority_speed,
+       any: (speed_lowering || speed_boosting || field_effects || speed_ability || priority_speed)
+     }
+   };
+ }
+ // Expose for tests and other modules.
+ if (typeof globalThis !== 'undefined') {
+   globalThis.computeCoverage = computeCoverage;
+ }
+ function _hasAnySpeedControl(m, all) {
+   if (!m) return false;
+   if (m.moves && SPEED_LOWER_MOVES.some(x => m.moves.includes(x))) return true;
+   if (m.moves && SPEED_BOOST_MOVES.some(x => m.moves.includes(x))) return true;
+   if (m.moves && SPEED_FIELD_MOVES.some(x => m.moves.includes(x))) return true;
+   if (m.moves && SPEED_PRIORITY_MANIP.some(x => m.moves.includes(x))) return true;
+   if (m.ability && SPEED_ABILITIES.includes(m.ability)) return true;
+   return false;
+ }
+
+ function renderCoverageWidget() {
+   var el = document.getElementById('coverage-items');
+   if (!el) return;
+   var key = (typeof currentPlayerKey === 'string' && TEAMS[currentPlayerKey])
+             ? currentPlayerKey : 'player';
+   var members = (TEAMS[key] && TEAMS[key].members) || [];
+   el.innerHTML = COVERAGE_CHECKS.map(chk => {
+     var covered = members.some(m => chk.check(m, members));
+     return `<div class="coverage-item ${covered ? 'coverage-ok' : 'coverage-miss'}">
+       <span>${covered ? '✓' : '✗'}</span>
+       <span>${chk.label}</span>
+     </div>`;
+   }).join('');
+ }
+
+ renderCoverageWidget();
```

### Hook recompute into every team-change path

**At `player-select` change listener (line ~396):**
```diff
  document.getElementById('player-select').addEventListener('change', function() {
    var team = TEAMS[this.value];
    if (team) {
      currentPlayerKey = this.value;
      document.getElementById('player-team-name').textContent = team.name;
      renderRoster('player-roster', team.members);
      if (typeof applyLadderGate === 'function') applyLadderGate();
+     if (typeof renderCoverageWidget === 'function') renderCoverageWidget();
    }
  });
```

**At import success (line ~870):**
```diff
      if (slot === currentPlayerKey) {
        renderRoster('player-roster', TEAMS[currentPlayerKey].members);
+       if (typeof renderCoverageWidget === 'function') renderCoverageWidget();
      }
```

**At `removeTeam` / reset (line ~358-360):**
```diff
    if (typeof rebuildTeamSelects === 'function') rebuildTeamSelects();
    if (TEAMS[currentPlayerKey]) renderRoster('player-roster', TEAMS[currentPlayerKey].members);
+   if (typeof renderCoverageWidget === 'function') renderCoverageWidget();
```

**After Set Editor saveMember (find `saveMember` or equivalent move-edit path):**
Add `renderCoverageWidget();` after any mutation of `TEAMS[key].members[i].moves / ability`.

---

## Diff 3: CHAMPIONS_MECHANICS_SPEC.md — new section

Append after existing Mega section:

```markdown
## §17B — Coverage & Speed Control (T9j.3b, 2026-04-24)

### Categories detected (recomputed per team on every state change; no cache)

| Category | Definition |
|---|---|
| `fake_out` | Any member has Fake Out |
| `trick_room` | Any member has TR, Imprison, Taunt, or Fake Out (pressure tools) |
| `redirection` | Follow Me / Rage Powder / Spotlight |
| `priority` | Fake Out, Extreme Speed, Aqua Jet, Shadow Sneak, Sucker Punch, Bullet Punch, Ice Shard, Vacuum Wave, Mach Punch, Grassy Glide, Quick Attack, Accelerock, First Impression |
| `weather_setter` | Abilities: Drought/Drizzle/Sand Stream/Snow Warning OR moves: Sunny Day/Rain Dance/Snowscape/Sandstorm |
| `speed_control.speed_lowering` | Electroweb, Icy Wind, Bulldoze, Low Sweep, Rock Tomb, Scary Face, Glaciate, String Shot, Mud Shot, Drum Beating, Sticky Web, Cotton Spore |
| `speed_control.speed_boosting` | Dragon Dance, Agility, Rock Polish, Flame Charge, Shift Gear, Trailblaze, Quiver Dance, Victory Dance, Autotomize, Rapid Spin |
| `speed_control.field_effects` | Own-team Tailwind or Trick Room (opponent TR is matchup-time, not coverage) |
| `speed_control.abilities` | Chlorophyll, Swift Swim, Sand Rush, Slush Rush, Unburden, Surge Surfer, Wind Rider, Quick Feet, Steam Engine, Motor Drive. Intimidate excluded (indirect). |
| `speed_control.priority_speed` | Feint, After You, Quash, Ally Switch |

### Refresh triggers
- Team dropdown change (player-select)
- Team import (add as new slot or replace)
- Team reset / removal
- Set Editor: move / ability / nature / species change
- Form change (until T9j.7 lands, only pre-megaed species in TEAMS can trigger a static form change)

### Programmatic access
`globalThis.computeCoverage(teamKey?)` returns structured object. `teamKey` defaults to `currentPlayerKey`.
```

---

## Diff 4: New file — `/tmp/coverage_tests.js`

7 cases per spec; runs in Node with data.js + ui.js loaded. See file for full listing.

---

## Net impact
- data.js: 3-line value correction + 3 comment lines = 6 lines
- ui.js: ~90 lines added, ~20 replaced, 3 hook insertions
- Spec: ~25 lines added
- Tests: ~150 lines new file
- Commit: `fix coverage refresh on team change and add speed control category and correct mega base stats (Refs #36 #33 T9j3b)`
