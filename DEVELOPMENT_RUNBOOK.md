# Pokémon Champion 2026 — Development Runbook

> Full history, architecture, QA log, and replication guide for any developer or Perplexity user picking this project up from scratch.

---

## 1. Project Overview

**What it is:** A VGC-style competitive team simulator for April 2026 meta play. Fully client-side, no backend, no dependencies — one HTML file runs the entire app.

**Repo:** [github.com/TheYfactora12/Pokemon-Champions-Sim-Planner](https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner)

**Primary artifact:** `poke-sim/pokemon-champion-2026.html` (~400 KB self-contained bundle)

**Tech stack:**
- Vanilla JavaScript (ES6+)
- CSS custom properties, mobile-first dark theme
- No framework, no build tool required
- PWA: manifest.json + service worker (offline capable)
- Python 3 rebuild script (optional, for bundle generation only)

---

## 2. Repository Structure

```
Pokemon-Champions-Sim-Planner/
├── README.md                          ← Quickstart guide
├── DEVELOPMENT_RUNBOOK.md             ← This file
├── MASTER_PROMPT.md                   ← Copy-paste prompt for new AI sessions
├── poke-sim/pokemon-champion-2026.html   ← Self-contained bundle (rebuilt from sources)
└── poke-sim/                          ← All source files
    ├── index.html                     ← App shell (tabs, PWA meta, script refs)
    ├── style.css                      ← Full dark theme (34 KB)
    ├── data.js                        ← BASE_STATS, TEAMS (29), POKEMON_TYPES_DB 700+, DEX_NUM_MAP 1025+
    ├── engine.js                      ← Battle engine, damage calc, Bo runner (37 KB)
    ├── ui.js                          ← All UI, import/export, pilot guide, PDF, strategy tab (59 KB)
    ├── strategy-injectable.js         ← Strategy tab knowledge base (37 KB)
    ├── manifest.json                  ← PWA manifest
    ├── sw.js                          ← Service worker (cache-first)
    ├── icon-192.png                   ← PWA icon
    └── icon-512.png                   ← PWA icon large
```

---

## 3. Development History

### Phase 1 — Initial Build
- Built core app shell: Simulator, Teams, Set Editor, Replay Log, Sources, Pilot Guide tabs
- Implemented VGC doubles battle engine with: weather, Trick Room, Tailwind, Fake Out, Protect, status conditions, priority moves, Intimidate, Multiscale, spread move nerf (0.75x)
- Damage formula: `floor((floor((2*50/5+2) * BP * Atk / Def) / 50) + 2) * STAB * eff * roll`
- Random damage roll: `0.85 + Math.random() * 0.15` (confirmed in engine.js — NOT deterministic)
- Loaded the current curated team catalog into `TEAMS` (29 teams on the 2026-06-19 review branch)
- Built Monte Carlo runner: `runSimulation(numBattles, playerKey, oppKey)` with async batch processing
- PWA infrastructure: manifest, service worker, icons

### Phase 2 — Feature Expansion
- Added Bo1/Bo3/Bo5/Bo10 series selector
- Added Singles/Doubles format toggle
- Built Pokepaste + Showdown import/export modal
- Built Pilot Guide tab: auto-generated per-matchup advice after Run All Matchups
- Built Meta Threat Radar (Sources tab)
- Built Speed Tier widget (collapsible per team card)
- Built Team Coverage checker
- Built PDF report (print API, appears after Run All)
- Built inline Pilot Card (auto-shown after every single sim)
- Built `.txt` report download

### Phase 3 — Strategy Tab Merge
- Created `strategy-injectable.js` with `TEAM_META` object: archetype tags, setup plays, counter guidance, Pokémon-specific move logs, win conditions per team
- Merged Strategy tab into `ui.js` and `index.html`
- Strategy tab renders based on `currentPlayerKey`, refreshes on team change

### Phase 4 — QA Audit + Bug Fixes (April 23, 2026)
**Commit:** [`261120b`](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/commit/261120b3878d3dfa7e28991f68c7edf7245ddf2a)

Fixes applied:
- **CRITICAL:** `const COVERAGE_CHECKS` → `var COVERAGE_CHECKS` in ui.js (prevented TDZ crash on init)
- Added `showInlinePilotCard(oppKey, res)` — auto-shown after every single sim
- Renamed `runAllMatchups` wrapper in ui.js to `runAllMatchupsUI` to avoid conflict with engine.js export
- Updated `run-all-btn` handler to call `runAllMatchupsUI`

### Phase 5 — Docs (April 23, 2026)
**Commit:** [`0b41074`](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/commit/0b41074214119742cafc041ab1f5d5635d291810)
- Added `README.md`
- Added `DEVELOPMENT_RUNBOOK.md` (this file)
- Added `MASTER_PROMPT.md`

### Phase 6 — Live URL Investigation + Master Prompt v3 (April 23, 2026)
**Commit:** [`8f8e7d8`](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/commit/8f8e7d81aae54726c3ea80a33ce2757f970a5132)

**Problem reported:** `htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html` did not load the app.

**Root cause:** Two compounding issues:
1. **MIME type mismatch** — GitHub serves raw `.html` files with `Content-Type: text/plain`, not `text/html`. Browsers refuse to render HTML with the wrong MIME type.
2. **Cross-origin asset blocking** — The bundle embeds CSS, JS, and sprite URLs that are fetched cross-origin. htmlpreview rewrites the HTML URL but cannot rewrite the `<script>` and `<link>` asset paths, causing CORS failures.
3. **Service worker scope** — The PWA service worker is scoped to `poke-sim/`. When opened via a raw GitHub URL outside that scope, the service worker is inactive and cached assets are unavailable.

**Resolution:**
- Documented in MASTER_PROMPT.md under “LIVE APP — HOW TO ACCESS” section
- Three confirmed working access methods: (1) local clone + open file, (2) `npx serve` local server, (3) Perplexity Space deploy
- htmlpreview.github.io marked as **DO NOT USE** for this project
- Logged as P1 open issue in MASTER_PROMPT.md

---

## 4. 13 Loaded Teams

| Key | Team Name | Style |
|-----|-----------|-------|
| `player` | TR Counter Squad | speed/anti-TR |
| `mega_altaria` | Mega Altaria | balance |
| `mega_dragonite` | Mega Dragonite | hyper offense |
| `mega_houndoom` | Mega Houndoom | sun offense |
| `rin_sand` | Rin Sand | sand |
| `suica_sun` | Suica Sun | sun |
| `cofagrigus_tr` | Cofagrigus TR | trick room |
| `champions_arena_1st` | Hyungwoo Shin | balance |
| `champions_arena_2nd` | Jorge Tabuyo | balance |
| `champions_arena_3rd` | Juan Benítez | balance |
| `chuppa_balance` | Chuppa Cross IV | balance |
| `aurora_veil_froslass` | Aurora Veil Froslass | veil HO |
| `kingambit_sneasler` | Kingambit + Sneasler | offense |

---

## 5. Engine Architecture

### Key Classes
- `Pokemon` — stat calc, damage calc, status, items, abilities
- `Field` — weather, Trick Room turns (5-turn accurate), Tailwind, screens
- `simulateBattle(playerTeam, oppTeam)` — single 4v4 doubles battle, returns `{result, turns, winCondition, log}`
- `runSimulation(n, playerKey, oppKey)` — Monte Carlo runner, async batched
- `runAllMatchups(n)` — runs player vs all 12 opponents

### Damage Formula
```
baseDmg = floor((floor((2*50/5+2) * BP * Atk / Def) / 50) + 2)
roll    = 0.85 + Math.random() * 0.15
total   = floor(baseDmg * STAB * typeEff * spreadMult * multiscale * roll)
```

### Trick Room
- 5-turn accurate: `Field.trickRoomTurns` increments each `endOfTurn()`, resets at 5
- Speed inversion: `getEffSpeed()` returns `10000 - spe` when TR active

### Weather Priority
- Ability-set weather (Drought, Drizzle, Sand Stream) fires on switch-in
- Last switch-in ability wins — weather wars handled naturally
- Permanent Sand Stream: `weatherTurns = 999`

---

## 6. UI Architecture

### Tab System
Tabs: `simulator` | `teams` | `set-editor` | `replay` | `sources` | `pilot` | `strategy`

### Key Global Variables (ui.js)
- `currentPlayerKey` — active player team key (starts as `'player'`)
- `currentFormat` — `'doubles'` or `'singles'`
- `currentBo` — `1 | 3 | 5 | 10`
- `var COVERAGE_CHECKS` — **must be `var`, not `const`/`let`** (TDZ risk if changed)

### Import Flow
1. User pastes Showdown text or pokepaste URL into modal
2. Parser handles nicknamed Pokémon: extracts species from `Nickname (Species) @ Item` pattern
3. User selects: replace existing slot OR add as new slot
4. `rebuildTeamSelects()` syncs both player/opponent dropdowns

### Export Flow
- `openExportModal(teamKey)` — generates Showdown-format text block

---

## 7. Known Issues & Open Items

| ID | Severity | Issue | Status |
|----|----------|-------|--------|
| C1 | High | `COVERAGE_CHECKS` must stay `var` — TDZ if changed to `const`/`let` | Fixed (var) |
| C2 | Medium | Strategy tab must re-render on team change | Fixed (player-select listener) |
| P1 | High | htmlpreview.github.io URL does not work for this app — MIME type + CORS | Documented; use local clone |
| F1 | Medium | Mega form Speed stats may use pre-Mega base in Speed Tier widget | Open |
| F2 | Medium | Set Editor edits should invalidate prior sim cache before Run All | Open |
| F3 | Medium | Nicknamed Pokémon import parser needs `(Species)` fallback test | Open |
| F4 | Low | Pokepaste URL fetch fails silently offline — no error toast | Open |
| L1 | Medium | Weather override turns not modeled when both teams have weather setters | Open |
| L2 | Low | Clutch filter threshold (8+ turns) not surfaced to user | Open |

---

## 8. Replication Guide (Any Developer)

### ⚠️ Important: Do NOT use htmlpreview.github.io

`htmlpreview.github.io` does not work for this app. GitHub serves raw `.html` files with `text/plain` MIME type, and the app's cross-origin asset references are blocked by CORS when loaded from a non-origin host. Use one of the three methods below instead.

### Option A — Stable public site (recommended for user testing)
```bash
https://theyfactora12.github.io/Pokemon-Champions-Sim-Planner/
```

### Option B — Just open the app locally
```bash
# Clone repo
git clone https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner.git
cd Pokemon-Champions-Sim-Planner

# Open in browser
open pokemon-champion-2026.html   # macOS
start pokemon-champion-2026.html  # Windows
xdg-open pokemon-champion-2026.html  # Linux
```

### Option C — Run from source files (with live reload)
```bash
cd poke-sim

# Any static server works:
npx serve .          # Node.js (recommended — full PWA service worker)
python3 -m http.server 8080  # Python (no PWA service worker)

# Open: http://localhost:3000  (npx serve)
# Open: http://localhost:8080  (python)
```

---

## Release Buildout Plan

The product release path is:

1. Stable public site on GitHub Pages from `main`
2. Security and release gates:
   - green CI
   - green bundle freshness
   - green cache bump
   - green daily sim heartbeat
   - reviewed Supabase RLS before user accounts/features expand
3. Free public trust layer:
   - sim
   - replay review
   - legality warnings
   - Battle Sensei baseline guidance
4. Optional monetization layers in order:
   - donations
   - accounts and saved history
   - subscription for deeper workflow value
   - separate human coaching offer

Battle truth stays in repo code and generated artifacts. Supabase is for user and operational data, not the runtime source of truth for simulator mechanics.

> Note: Service worker requires HTTPS or localhost. Use `npx serve` for full PWA testing.

### Option D — Rebuild the single-file bundle
```bash
cd poke-sim
python tools/build-bundle.py
```

Use the canonical builder for module inclusion, inline-script escaping, and release-manifest handling. Do not use the historical three-script inline recipe. Building locally is not deployment; follow the current gates in `STATUS.md` before publishing.

### Dependencies
| Dependency | Required? | Used for |
|------------|-----------|----------|
| Any modern browser (Chrome/Firefox/Safari) | YES | Running the app |
| Python 3.x | Only for bundle rebuild | `rebuild` script |
| Node.js + `npx serve` | Optional | Local dev server with PWA |
| No npm packages | — | None needed |

---

## 9. Testing Checklist

### Simulator Tab
- [ ] Change Doubles ↔ Singles — format label updates
- [ ] Change Bo1/Bo3/Bo5/Bo10 — series results change
- [ ] Swap teams — left/right roster cards update
- [ ] Run single sim — win %, series stats, replay entries, inline pilot card all populate
- [ ] Run All Matchups — full matrix appears, Pilot Guide tab populates, PDF button appears

### Teams Tab
- [ ] All current seeded teams display with correct members
- [ ] Export buttons generate valid Showdown text
- [ ] Archetype tags visible and match team style

### Set Editor
- [ ] Edit moves, EVs, item, nature on player team
- [ ] Save — changes persist in active TEAMS object
- [ ] Run sim after edit — updated stats reflected

### Replay Log
- [ ] Logs appear after sim
- [ ] All / Wins / Losses / Clutch filters work, active filter highlighted
- [ ] Turn-by-turn logs readable and believable

### Sources Tab
- [ ] Team source table loads with pokepast.es links
- [ ] Meta Threat Radar renders 10 threats, color-coded
- [ ] Speed Tier widget collapsible per team

### Pilot Guide Tab
- [ ] After Run All, per-matchup advice appears for all 12 opponents
- [ ] Content references actual team members

### Strategy Tab
- [ ] Renders on load
- [ ] Updates when player team changed via dropdown
- [ ] Shows: archetype, setup plays, counters, Pokémon move notes

### Import / Export
- [ ] Raw Showdown paste — team imports correctly
- [ ] Nicknamed Pokémon parsed correctly (Species extracted from parentheses)
- [ ] Replace slot shows confirmation before overwriting
- [ ] Export generates valid Showdown text

---

## 10. Commit Log Summary

| Commit | Date | Author | Description |
|--------|------|--------|-------------|
| `8f8e7d8` | 2026-04-23 | TheYfactora12 | docs: MASTER_PROMPT v3 — htmlpreview URL fix, Phase 6 change log |
| `0b41074` | 2026-04-23 | TheYfactora12 | docs: README + runbook + master prompt |
| `261120b` | 2026-04-23 | TheYfactora12 | fix: COVERAGE_CHECKS TDZ, showInlinePilotCard, runAllMatchups conflict |
| `f52949b` | 2026-04-23 | alfredocox | chore: clean repo structure |
| `837ebc7` | 2026-04-23 | alfredocox | fix: replace empty index.html |
| `cfc924f` | 2026-04-23 | alfredocox | extracted files and reuploading |
| `c9a4f7a` | 2026-04-23 | alfredocox | feat: push real poke-sim source files |
| `614be7e` | 2026-04-23 | alfredocox | feat: expand workspace with source files |
| `c4abc21` | 2026-04-23 | TheYfactora12 | Add files via upload (new file) |
| `eb4efb5` | 2026-04-23 | TheYfactora12 | Add files via upload (initial) |
