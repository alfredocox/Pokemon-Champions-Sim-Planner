# MASTER PROMPT — Poke-e-Sim Champion 2026

> **(c) 2026 Alfredo Cox (@alfredocox) and Kevin Medeiros (@TheYfactora12). All Rights Reserved.**
> **Proprietary - see `LICENSE`. Pokemon IP attribution: see `NOTICE.md`.**
> **Canonical product tagline: "Battle-tested. Always evolving."**
>
> **HOW TO USE:** Copy everything from the `--- COPY FROM HERE ---` line to the very end of this file.
> Paste it as your **first message** in a new Perplexity AI chat.
> The AI will have full project context instantly.

---

--- COPY FROM HERE ---

You are continuing development of **Pokémon Champion 2026**, a production-grade VGC competitive team simulator built as a static, offline-capable PWA.

**GitHub repo:** https://github.com/alfredocox/Pokemon-Champions-Sim-Planner
**Default branch:** `main`
**Active dev branch:** `main` (fix/champions-sp-and-legality was merged; all work goes to main)
**Space name:** Pokesim (use this context for all Space-based chats)
**Owner / committer identity:** `user.email=5zyxn9yrnt@privaterelay.appleid.com user.name=TheYfactora12`
**All new feature tickets:** assigned to `@TheYfactora12`

---

## LIVE APP — HOW TO ACCESS

> ⚠️ **htmlpreview.github.io does NOT work** for the multi-file dev version (`poke-sim/index.html`). It works fine for the self-contained bundle.

### ✅ Working ways to open the app

**Option 1 — htmlpreview bundle link (easiest, no setup):**
```
https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html
```

**Option 2 — GitHub Pages (same bundle, auto-deploys on push):**
```
https://alfredocox.github.io/Pokemon-Champions-Sim-Planner/
```

**Option 3 — Clone and open locally:**
```bash
git clone https://github.com/alfredocox/Pokemon-Champions-Sim-Planner.git
cd Pokemon-Champions-Sim-Planner/poke-sim
open pokemon-champion-2026.html   # macOS
start pokemon-champion-2026.html  # Windows
```

**Option 4 — Local dev server (full PWA, service worker active):**
```bash
cd poke-sim
npx serve .
# Open: http://localhost:3000
```

**Option 5 — Perplexity Space deploy (preview URL only visible to owner):**
Space instruction `deploy_website(project_path="poke-sim/poke-sim", site_name="Champions Sim", entry_point="index.html", should_validate=False)`

---

## RELEASE PROCEDURE (mandatory before merging any PR that touches source files)

Any PR that modifies `poke-sim/engine.js`, `poke-sim/data.js`, `poke-sim/ui.js`, `poke-sim/style.css`, `poke-sim/strategy-injectable.js`, or `poke-sim/index.html` **must** complete these steps before merging:

### Step 1 — Rebuild the bundle
```powershell
# Windows PowerShell (from repo root)
cd poke-sim\poke-sim
python tools\build-bundle.py
```
```bash
# macOS / Linux / Git Bash (from repo root)
cd poke-sim/poke-sim
python3 tools/build-bundle.py
```
> ⚠️ **Windows note:** Python must be installed. If `python` is not found, install via: `winget install Python.Python.3.12` then refresh PATH: `$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")`

### Step 2 — Bump CACHE_NAME in sw.js
`sw.js` lives at `poke-sim/sw.js` (not `poke-sim/poke-sim/sw.js`).

```powershell
# Windows PowerShell — replace old tag with new tag
(Get-Content poke-sim\sw.js) -replace 'champions-sim-v5-<old-tag>', 'champions-sim-v5-<new-tag>' | Set-Content poke-sim\sw.js

# Verify
Select-String "CACHE_NAME" poke-sim\sw.js
```
```bash
# macOS / Linux / Git Bash (from repo root)
bash tools/release.sh <new-tag>
```
Format: `champions-sim-v{major}-{release-tag}`. Current after PR #135: `champions-sim-v5-wire-storage-adapter`.

### Step 3 — Commit and push both artifacts
```bash
git add poke-sim/poke-sim/pokemon-champion-2026.html poke-sim/sw.js
git commit -m "build: rebuild bundle + bump CACHE_NAME to <tag> - Refs #N"
git push
```

### Step 4 — Wait for CI
Both checks must go green before merging:
- **Verify bundle is fresh** — runs `bash poke-sim/tools/check-bundle.sh` (SHA compares committed bundle vs fresh rebuild)
- **Verify sw.js CACHE_NAME bumped** — confirms `poke-sim/sw.js` was modified

> ⚠️ **CI only runs the enforcement step if it detects source file changes.** If checks pass with "No app source files changed" but you DID change source files, the path pattern in the workflow may be wrong — file a bug immediately.

---

## CI WORKFLOWS — KNOWN STATE

Both workflows live in `.github/workflows/`. Fixed in PRs #136 + #135 (2026-04-26).

| Workflow | File | Watches | Enforces |
|---|---|---|---|
| Bundle Freshness Check | `bundle-freshness-check.yml` | `poke-sim/(engine\|data\|ui\|style\|strategy-injectable\|index).(js\|css\|html)` | `bash poke-sim/tools/check-bundle.sh` (SHA compare) |
| Cache Bump Check | `cache-bump-check.yml` | same source files | `poke-sim/sw.js` was modified |

### Bugs fixed (2026-04-26)
- **Path pattern bug** — both workflows previously watched `poke-sim/poke-sim/` instead of `poke-sim/`. This caused CI to always skip enforcement ("No app changes detected") even when source files changed. Fixed in PR #136.
- **Wrong build script** — `bundle-freshness-check.yml` was calling `python3 tools/build.py --check` (file does not exist). Correct command is `bash poke-sim/tools/check-bundle.sh`. Fixed in PR #135 + #136.
- **sw.js path** — `cache-bump-check.yml` was checking for `poke-sim/poke-sim/sw.js` but actual path is `poke-sim/sw.js`. Fixed in PR #136.

---

## STORAGE ADAPTER WIRING — Issue #79 (ui.js) ✅ COMPLETE

**Status: shipped in PR #135 `feat/wire-storage-adapter-ui` — merged into main**

### 7 call-site swaps (ui.js)

| # | Function | Before | After |
|---|---|---|---|
| 1 | `loadCustomTeamsFromStorage` | `localStorage.getItem(CUSTOM_TEAMS_STORAGE_KEY)` + `JSON.parse` | `Storage.get('teams:custom')` |
| 2 | `saveCustomTeamsToStorage` | `localStorage.setItem(...)` + `JSON.stringify` | `Storage.set('teams:custom', out)` |
| 3 | `loadPreloadedOverridesFromStorage` | `localStorage.getItem(PRELOADED_OVERRIDES_KEY)` + `JSON.parse` | `Storage.get('overrides:preloaded')` |
| 4 | `savePreloadedOverride(key)` | get + parse + set + stringify | `Storage.get/set('overrides:preloaded')` |
| 5 | `clearPreloadedOverride(key)` | get + parse + set + stringify | `Storage.get/set('overrides:preloaded')` |
| 6 | `_loadBringState` | `localStorage.getItem(_BRING_LS_KEY)` + `JSON.parse` | `Storage.get('bring:default')` |
| 7 | `_saveBringState` | `typeof localStorage` guard + `setItem` | `Storage.set('bring:default', {...})` |

### Zero data loss
`Storage.migrate()` (in `storage_adapter.js`) auto-migrates all 3 legacy keys on first load. No user data lost.

### Integration tests added
`poke-sim/tests/ui_storage_integration_tests.js` — **33 assertions**, 3 suites:
- Suite 1 (10): custom teams save / load / schema version / no-preloaded-bleed / empty-storage no-op
- Suite 2 (13): preloaded override save / clear / load roundtrip / `_hasOverride` flag / missing-key false return
- Suite 3 (10): bring-state save / load / 4-slot bring / mode persistence / empty-storage no-op / static source check

Run: `node poke-sim/tests/ui_storage_integration_tests.js`

### No regressions
- `engine.js` / `data.js` — untouched
- `var COVERAGE_CHECKS` — untouched (TDZ-safe, must remain `var`)
- CACHE_NAME after this PR: `champions-sim-v5-wire-storage-adapter`

---

## CRITICAL BUG — DO NOT CHANGE THIS

```javascript
// In ui.js — MUST be declared as var, NOT const or let
var COVERAGE_CHECKS = [...];
```

This is referenced during initialization before its declaration line is reached. `const`/`let` would throw a Temporal Dead Zone (TDZ) ReferenceError and break the app completely on load. Do not "fix" it without restructuring initialization order. Every rebuild must verify `var` is preserved.

---

## FILE LOCATIONS — CANONICAL PATHS

> ⚠️ Source files live at `poke-sim/` (one level). There is NO `poke-sim/poke-sim/` nesting for source files.

```
Pokemon-Champions-Sim-Planner/
├── .github/workflows/
│   ├── bundle-freshness-check.yml
│   └── cache-bump-check.yml
├── tools/
│   └── release.sh
├── poke-sim/
│   ├── index.html
│   ├── style.css
│   ├── data.js
│   ├── engine.js
│   ├── ui.js
│   ├── strategy-injectable.js
│   ├── storage_adapter.js        ← Issue #79 (PR #134)
│   ├── sw.js                     ← PWA service worker (CACHE_NAME lives here)
│   ├── manifest.json
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── pokemon-champion-2026.html ← rebuilt bundle (never edit directly)
│   ├── tools/
│   │   ├── build-bundle.py       ← canonical rebuild script
│   │   ├── check-bundle.sh       ← SHA compare for CI
│   │   └── README.md
│   └── tests/
│       ├── storage_adapter_tests.js        ← 40 cases
│       ├── ui_storage_integration_tests.js ← 33 cases (PR #135)
│       ├── items_tests.js
│       ├── status_tests.js
│       ├── mega_tests.js
│       ├── coverage_tests.js
│       ├── t9j8_tests.js
│       ├── t9j9_tests.js
│       ├── t9j10_tests.js
│       └── audit.js
├── MASTER_PROMPT.md              ← this file (single canonical copy)
└── README.md
```

---

## MILESTONES

- M1 Engine Truth (v1.0) — 19/23 closed, T9j.17 pending to fully close
- M2 Dynamic Strategy Coach (v1.1) — T9j.16 coaching engine shipped
- M3 Piloting Analytics (v1.2) — partial (replay log live, trends pending)
- M4 Tournament Ready PDF (v1.3) — T9j.14 + T9j.16 PDF sections shipped
- M5 Meta Intelligence (v1.4) — pending external data source
- M6 Polish & Launch (v2.0) — pending M1-M5 and M7-M10 close
- M7 Architecture & Modularity (v2.1) — #77-#80
- M8 Profile & Sync (v2.2) — #81-#86 (headline ask)
- M9 Observability & QA (v2.3) — #87-#91 | **#95 ALL 3 PHASES DONE** | **#88 ALL PHASES DONE**
- M10 Performance & Quality (v2.4) — #92-#96
- M11 Advanced Features (v2.5) — #97-#99 plus deferred #7 Tera
