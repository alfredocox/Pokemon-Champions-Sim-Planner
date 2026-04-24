# MASTER PROMPT — Pokémon Champion 2026
> **HOW TO USE:** Copy everything from the `--- COPY FROM HERE ---` line to the very end of this file.
> Paste it as your **first message** in a new Perplexity AI chat.
> The AI will have full project context instantly.

---

--- COPY FROM HERE ---

You are continuing development of **Pokémon Champion 2026**, a production-grade VGC competitive team simulator built as a static, offline-capable PWA.

**GitHub repo:** https://github.com/alfredocox/Pokemon-Champions-Sim-Planner
**Space name:** Pokesim (use this context for all Space-based chats)

---

## LIVE APP — HOW TO ACCESS

> ⚠️ **htmlpreview.github.io does NOT work** for the multi-file dev version (`poke-sim/index.html`). It works fine for the self-contained bundle.

### ✅ Working ways to open the app

**Option 1 — htmlpreview bundle link (easiest, no setup):**
```
https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026-FINAL.html
```

**Option 2 — GitHub Pages (same bundle, auto-deploys on push):**
```
https://alfredocox.github.io/Pokemon-Champions-Sim-Planner/
```

**Option 3 — Clone and open locally:**
```bash
git clone https://github.com/alfredocox/Pokemon-Champions-Sim-Planner.git
cd Pokemon-Champions-Sim-Planner/poke-sim
open pokemon-champion-2026-FINAL.html   # macOS
start pokemon-champion-2026-FINAL.html  # Windows
```

**Option 4 — Local dev server (full PWA, service worker active):**
```bash
cd poke-sim
npx serve .
# Open: http://localhost:3000
```

> **Why htmlpreview works for the bundle but not index.html:** The bundle (`pokemon-champion-2026-FINAL.html`) is fully self-contained — all CSS/JS inlined. htmlpreview works fine for it. The multi-file `index.html` loads `data.js`, `engine.js`, `ui.js`, `style.css` as separate files which fail cross-origin.

---

## WHAT THIS PROJECT IS

A browser-only VGC doubles team simulator for April 2026 meta (Regulation M-A, Scarlet/Violet Series 3 with Mega Evolutions via Alfredo's custom format). No server. No build tools required. Works 100% offline from a single HTML file.

---

## REPOSITORY LAYOUT

```
Pokemon-Champions-Sim-Planner/
├── poke-sim/
│   ├── index.html              ← App shell + tab structure + PWA meta
│   ├── style.css               ← Full dark theme, mobile-first (34 KB)
│   ├── data.js                 ← BASE_STATS, POKEMON_TYPES_DB, DEX_NUM_MAP,
│   │                              TEAMS (13 tournament teams), MOVE_TYPES,
│   │                              getSpriteUrl()
│   ├── engine.js               ← Pokemon class, Field class, simulateBattle(),
│   │                              runSimulation() (Monte Carlo), runAllMatchups()
│   ├── ui.js                   ← All UI logic: tabs, team selects, import/export,
│   │                              pilot guide, PDF report, speed tiers, meta radar,
│   │                              coverage checker, strategy tab
│   ├── strategy-injectable.js  ← TEAM_META knowledge base: archetype tags,
│   │                              setup plays, counters, Pokémon move-log notes
│   ├── manifest.json           ← PWA manifest
│   ├── sw.js                   ← Service worker (cache-first)
│   ├── icon-192.png            ← PWA icon
│   └── icon-512.png            ← PWA icon
├── pokemon-champion-2026-FINAL.html   ← Self-contained single-file bundle (~280 KB)
├── README.md                   ← Quickstart guide
├── DEVELOPMENT_RUNBOOK.md      ← Full dev history, architecture, QA log
└── MASTER_PROMPT.md            ← This file
```

---

## TABS

`Simulator` | `Teams` | `Set Editor` | `Replay Log` | `Sources` | `Pilot Guide` | `Strategy`

---

## 13 LOADED TEAMS

| Key | Team Description |
|-----|-----------------|
| `player` | TR Counter Squad — Incineroar / Arcanine / Garchomp / Whimsicott / Rotom-Wash / Garchomp-Scarf |
| `mega_altaria` | Mega Altaria — pokepaste dfdfa66d317cf9d7 |
| `mega_dragonite` | Mega Dragonite — pokepaste dd101585183c9ed6 |
| `mega_houndoom` | Mega Houndoom — pokepaste 4a87b07998f6c0c4 |
| `rin_sand` | Rin Sand — pokepaste e97ac67f1ce79c33 |
| `suica_sun` | Suica Sun — pokepaste cb48d8b06c73d33b |
| `cofagrigus_tr` | Cofagrigus Trick Room |
| `champions_arena_1st` | Hyungwoo Shin — Champions Arena Winner |
| `champions_arena_2nd` | Jorge Tabuyo — Champions Arena Finalist |
| `champions_arena_3rd` | Juan Benítez — Champions Arena Top 3 |
| `chuppa_balance` | Chuppa Cross IV — Pittsburgh Champion |
| `aurora_veil_froslass` | Aurora Veil Froslass team |
| `kingambit_sneasler` | Kingambit + Sneasler Core |

---

## ARCHITECTURE OVERVIEW

### State Variables (ui.js)
```javascript
let currentPlayerKey = 'player';       // active player team key
let currentFormat    = 'doubles';      // 'doubles' | 'singles'
let currentBo        = 1;             // 1 | 3 | 5 | 10
let lastAllResults   = null;           // cached Run All results
```

### Engine Entry Points (engine.js)
```javascript
// Single matchup — returns Promise<results>
runSimulation(numBattles, playerTeamKey, oppTeamKey, onProgress)

// All matchups — iterates all 12 opponents
runAllMatchups(numBattles, onProgress, onMatchupDone)
```

### Damage Formula
```
baseDmg = floor((floor((2*50/5+2) * BP * Atk / Def) / 50) + 2)
roll    = 0.85 + Math.random() * 0.15    ← NON-DETERMINISTIC
total   = floor(baseDmg * STAB * typeEff * spreadMult * multiscale * roll)
```
Engine is confirmed non-deterministic. Bo10 results differ from Bo1 as expected.

### Trick Room
- TR lasts exactly 5 turns (`field.trickRoomTurns` increments each `endOfTurn()`)
- Speed is inverted via `getEffSpeed()`: `if (field.trickRoom) spe = 10000 - spe`
- TR is toggled on/off correctly — re-using Trick Room while active cancels it

### Weather
- Weather lasts 8 turns (or permanent for Sand Stream)
- Entry abilities (Drought, Drizzle, Sand Stream) fire on switch-in via `processEntryAbilities()`
- **KNOWN ISSUE:** When both teams have weather setters, the last switch-in wins but mid-game weather override priority is not fully modeled.

### Sprites
```
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{dex_num}.png
```

---

## CRITICAL BUG — DO NOT CHANGE THIS

```javascript
// In ui.js — MUST be declared as var, NOT const or let
var COVERAGE_CHECKS = [...];
```

This is referenced during initialization before its declaration line is reached.
`const`/`let` would throw a Temporal Dead Zone (TDZ) ReferenceError and break the app completely on load.
This is a known architectural limitation — do not "fix" it without restructuring initialization order.

---

## ⚠️ REBUILD WARNING — READ BEFORE TOUCHING SOURCE FILES

The bundle (`pokemon-champion-2026-FINAL.html`) contains features that are **not fully reflected in the individual source files** (`index.html`, `ui.js`). Specifically:

- `player-select` dropdown in the Simulator tab
- Swap button between player/opponent
- Strategy tab button, panel, and all rendering logic (`renderStrategyTab`, `renderMoveLog`, etc.)
- `strategy-injectable.js` script reference

**Before rebuilding:** verify these elements exist in `index.html` and `ui.js`. If they are missing, backport from the bundle before running the rebuild script. Rebuilding from incomplete source files will silently strip these features.

### Rebuild command
```bash
cd poke-sim && python3 -c "
import re, os
with open('index.html','r') as f: html=f.read()
with open('style.css','r') as f: css=f.read()
with open('data.js','r') as f: data=f.read()
with open('engine.js','r') as f: engine=f.read()
with open('ui.js','r') as f: ui=f.read()
with open('strategy-injectable.js','r') as f: strat=f.read()
html=html.replace('<script src=\"data.js\"></script>','')
html=html.replace('<script src=\"engine.js\"></script>','')
html=html.replace('<script src=\"ui.js\"></script>','')
html=html.replace('<script src=\"strategy-injectable.js\"></script>','')
html=html.replace('<link rel=\"stylesheet\" href=\"style.css\"/>','')
html=re.sub(r'<script>\nif \(.serviceWorker.\).*?</script>','',html,flags=re.DOTALL)
html=html.replace('<link rel=\"manifest\" href=\"manifest.json\"/>','')
html=html.replace('<link rel=\"apple-touch-icon\" href=\"icon-192.png\"/>','')
html=html.replace('</head>','<style>\n'+css+'\n</style>\n</head>')
html=html.replace('</body>','<script>\n'+data+'\n\n'+engine+'\n\n'+strat+'\n\n'+ui+'\n</script>\n</body>')
with open('pokemon-champion-2026-FINAL.html','w') as f: f.write(html)
print(f'Bundle: {os.path.getsize(\"pokemon-champion-2026-FINAL.html\"):,} bytes')
"
```

---

## DEPLOY COMMAND (Perplexity Space)

```
deploy_website(
  project_path="poke-sim",
  site_name="Champions Sim",
  entry_point="index.html",
  should_validate=False
)
```

---

## QA TEST CHECKLIST (run after any change)

1. **Simulator tab** → Verify both player-select AND opponent-select dropdowns are present → Select teams, change Bo → Run Simulation → verify: win %, replay entries, inline pilot card appear
2. **Run All Matchups** → verify 12-row matchup matrix, Pilot Guide tab populates, PDF button appears
3. **Strategy tab** → Change team dropdown → verify strategy content updates (team-specific, not generic)
4. **Import** → Paste raw Showdown text → verify team loads into slot
5. **Export** → Click export on any team → verify Showdown-format output
6. **Format toggle** → Switch Doubles ↔ Singles → re-run sim → verify results differ
7. **Replay Log** → Click All / Wins / Losses / Clutch filters → verify filtering works and active filter is highlighted
8. **Open app** — use htmlpreview bundle link or GitHub Pages (see LIVE APP section)

---

## FEATURES — COMPLETE

- [x] Bo1/Bo3/Bo5/Bo10 Monte Carlo simulation (non-deterministic, Math.random() roll)
- [x] Singles/Doubles toggle (spread move nerf applied in doubles)
- [x] Pokepaste URL + raw Showdown text import/export
- [x] Import as new slot OR replace existing (with confirmation dialog)
- [x] Both sides interchangeable — player-select + opponent-select dropdowns + Swap button
- [x] Pilot Guide tab — per-matchup: verdict, leads, win conditions, risks, tips
- [x] Inline Pilot Notes card auto-shown after every single sim
- [x] Download Results & Pilot Notes (.txt report)
- [x] PDF Report (print API) — appears after Run All Matchups
- [x] Series Summary view in Replay Log
- [x] Meta Threat Radar (Sources tab) — 10 top Reg M-A threats, color-coded
- [x] Speed Tier widget — collapsible per team card
- [x] Team Coverage checker — live in VS column
- [x] Strategy tab — keyed to currentPlayerKey, updates on team change
- [x] PWA — manifest + service worker + icons (iOS / Android install)
- [x] Single-file offline bundle (~280 KB)

---

## TODO — NEXT SESSION

### TODO-1: GitHub Write-Back for TEAMS (persistence)
**Goal:** After editing a team in the Set Editor or importing a team, automatically persist the updated `TEAMS` object back to `poke-sim/data.js` on GitHub — so changes survive a page refresh without any local git workflow.

**Approach:**
- Add a PAT input field in the Sources tab (password type, session-only, never stored)
- On save/import, use the GitHub Contents API (GET → replace TEAMS block → PUT)
- Surgical regex replacement of only `const TEAMS = { ... };` — leave all other vars untouched

**Key implementation details:**
1. `fetchDataJsSha()` — GET `poke-sim/data.js` from GitHub API, cache the SHA (required for PUT)
2. `serializeTeamsBlock()` — `'const TEAMS = ' + JSON.stringify(TEAMS, null, 2) + ';\n'`
3. `saveTeamsToGitHub(reason)` — GET full file, regex-replace TEAMS block, PUT back
4. Hook into `saveEdits()` tail and `do-import-btn` click handler tail
5. Status label next to PAT input shows: ready / saved ✓ / no token / error

**⚠️ Critical encoding requirement:**
Do NOT use `btoa(unescape(encodeURIComponent(content)))` — this corrupts non-ASCII chars (é, —, ·).
Use TextEncoder-based UTF-8 safe base64:
```javascript
const bytes = new TextEncoder().encode(replaced);
let binary = '';
bytes.forEach(b => binary += String.fromCharCode(b));
const b64 = btoa(binary);
```

**PAT scope needed:** `repo` (classic) or `contents: write` (fine-grained)
**Regex for replacement:** `/const TEAMS\s*=\s*\{[\s\S]*?\};\s*/m`

**Lessons learned from April 23 attempt:**
- The encoding bug corrupted `data.js` twice with mojibake — always use TextEncoder
- Do not rebuild the bundle as part of this feature — it adds unnecessary risk
- Test with a hard-refresh after each save; GitHub Pages can lag 1-2 min behind HEAD
- The PAT is entered by the user as the raw `ghp_...` token value (not the token name)

---

## OPEN ISSUES (priority order)

### P1 — Critical
1. **Source files incomplete vs bundle** — `index.html` and `ui.js` are missing `player-select`, Strategy tab, Swap button, and `strategy-injectable.js` reference. The bundle is the source of truth. Do not rebuild without backporting these first. *(Logged April 23, 2026)*

### P2 — Functional
2. **Mega form Speed stats** — `BASE_STATS` entries for `Altaria-Mega` (Speed 80), `Dragonite-Mega` (Speed 80), `Houndoom-Mega` (Speed 115) need verification against Smogon/Bulbapedia. Speed Tier widget must use post-Mega stats.
3. **Set Editor dirty flag** — After editing EVs/moves/item in Set Editor and saving, `runAllMatchups()` may use a stale cached result. Add a dirty flag to `TEAMS[key]` on any Set Editor save to force re-simulation.
4. **Nicknamed Pokémon import** — Parser must handle `Nickname (Species) @ Item` format. Extract species from parentheses when a nickname is present.

### P3 — UX
5. **Pokepaste URL fetch error handling** — Add `.catch()` with a visible toast: *"Could not fetch pokepaste. Try pasting the raw team text instead."*
6. **Replay Log active filter state** — Active filter button should have a persistent highlight (`.active` class with `--color-primary` background).
7. **PDF/Download buttons discoverability** — Show grayed-out disabled buttons before Run All completes, with tooltip: *"Run All Matchups to generate report."*
8. **Weather override model** — When both teams have weather setters (e.g., rin_sand vs suica_sun), speed-based priority should determine which weather applies. Currently last-setter-wins regardless of speed.

---

## DEPENDENCIES

| Dependency | Version | Source | Purpose |
|------------|---------|--------|---------|
| None (vanilla JS) | — | — | No npm, no bundler, no framework |
| Python 3 | 3.8+ | System | Rebuild script only |
| Chrome/Firefox | Modern | Browser | Runtime |
| PokeAPI sprites | — | githubusercontent CDN | Sprite images |

The app has **zero runtime npm dependencies**. Everything is vanilla HTML/CSS/JS.

---

## WORKING WITH THIS PROJECT IN PERPLEXITY

When you ask the AI to make changes:

1. **Never rebuild the bundle blindly** — check that `index.html` and `ui.js` have all features before running the rebuild script (see ⚠️ REBUILD WARNING above).
2. **For source file edits** — AI edits files in a cloned workspace, commits, and pushes via `git`.
3. **For the bundle** — After source edits are verified complete, run the REBUILD COMMAND.
4. **For deploy** — Use the DEPLOY COMMAND above from within Perplexity.
5. **SHA requirement** — When updating an existing file via GitHub API directly, the file's current SHA must be provided. Always fetch the file first.

---

## PROJECT TIMELINE

| Date | Milestone |
|------|-----------|
| April 2026, Week 1 | Initial build — 13 teams, engine, basic sim UI |
| April 2026, Week 2 | Pilot Guide, import/export, pokepaste integration |
| April 2026, Week 3 | Strategy tab added, PWA packaging, PDF report |
| April 23, 2026 | QA audit completed — 8 issues logged (P1-P3) |
| April 23, 2026 | Master prompt v1 + runbook + README pushed to GitHub |
| April 23, 2026 | Master prompt v2 — full engine read, verified architecture |
| April 23, 2026 | **Master prompt v3** — htmlpreview URL failure documented, LIVE APP section added, P1 issue logged |
| April 23, 2026 | **Master prompt v4** — Reverted to 8a0df59 (last known good). GitHub write-back moved to TODO-1. Source/bundle divergence documented as P1. Rebuild warning added. |

---

## LAST KNOWN GOOD STATE

- **Commit:** `8a0df59` — last verified working state before April 23 write-back experiments
- **Bundle:** `pokemon-champion-2026-FINAL.html` ~280 KB
- **Engine:** Non-deterministic confirmed (`Math.random()` damage roll in `engine.js`)
- **Trick Room:** Correctly modeled — 5-turn countdown, speed inversion, toggle cancel
- **Weather:** 8-turn model, permanent Sand Stream, entry ability fires on switch-in
- **Syntax:** `data.js` ✓  `engine.js` ✓  `ui.js` ✓  (no console errors on load)
- **Tested on:** Chrome 124 macOS / Chrome Android
- **Live URL:** htmlpreview bundle link and GitHub Pages both confirmed working

---

**You are now fully briefed. Ask me what to build, fix, or improve.**
