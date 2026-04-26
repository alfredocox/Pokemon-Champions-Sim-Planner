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

## STORAGE ADAPTER WIRING — Issue #79 (ui.js)

**Status: shipped on `feat/wire-storage-adapter-ui` → merge into main + rebuild bundle**

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
`poke-sim/tests/ui_storage_integration_tests.js` — **9 test cases**, 3 suites:
- Suite 1 (3): custom teams save / load / no-preloaded-bleed
- Suite 2 (3): preloaded override save / clear / apply-to-TEAMS
- Suite 3 (4): bring-state save / load / empty-no-op / full roundtrip

Run: `node poke-sim/tests/ui_storage_integration_tests.js`

### No regressions
- `engine.js` / `data.js` — untouched
- `var COVERAGE_CHECKS` — untouched
- Bundle rebuild required after merge

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
