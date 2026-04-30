# Pokémon Champion 2026 — VGC Team Simulator

A production-grade VGC competitive team simulator for April 2026 meta play. Built as a fully offline-capable PWA with no server required.

**Live single-file app:** [`pokemon-champion-2026.html`](./poke-sim/pokemon-champion-2026.html) — open in any browser, works offline.

## QC Gate - M4 / POK-20

Status: NO-SHIP until DB adapter/RLS conflict cleanup is complete.

Do not implement M4, wire `saveAnalysis`, rebuild the bundle, push to `main`, or merge until the blockers in [`docs/M4_QC_READINESS_REPORT.md`](./docs/M4_QC_READINESS_REPORT.md) are resolved.

Current source-of-truth notes:
- Active GitHub repository: `TheYfactora12/Pokemon-Champions-Sim-Planner`.
- Clean PR base checkout: `C:\Users\kevin\OneDrive\Documents\GitHub\New folder\Pokemon-Champions-Sim-Planner` on `main`.
- DB/Supabase work checkout: `C:\Users\kevin\OneDrive\Documents\GitHub\Pokemon-Champions-Sim-Planner` on `feat/db-rls-supabase-adapter`; this branch contains unresolved conflicts.
- Empty directory to avoid: `C:\Users\kevin\OneDrive\Documents\New project`.
- Conflict triage plan: [`poke-sim/db/CONFLICT_RESOLUTION_PLAN.md`](./poke-sim/db/CONFLICT_RESOLUTION_PLAN.md).

## Where the App Lives (Shareable URLs)

Three ways to open the sim without cloning. Each points to a different snapshot of the bundle.

| Channel | Name | What it serves | Updates when | Use it for | Status |
|---|---|---|---|---|---|
| **PR preview** | `docs/qc-m4-readiness` | Current docs/QC readiness branch | Every push to this PR branch | Reviewing M4 no-ship documentation before merge | Live |
| **Stable** | `main` branch | Last merged bundle on the working repository | Only after a PR from a feature branch is merged into `main` | Reviewing current owner repo state | Live |
| **Production reference** | `alfredocox/main` | Production branch after cleaned work is pushed upstream | Only after explicit upstream push/merge | Sharing the production reference build | Pending cleanup |
| **Static host** | GitHub Pages | Clean short URL, no proxy | Re-publishes on every push to `main` once enabled | Giving out a permanent link; best mobile experience | Not yet enabled |

**Links:**
- **PR preview - branch `docs/qc-m4-readiness`**: [htmlpreview.github.io - docs/qc-m4-readiness](https://htmlpreview.github.io/?https://raw.githubusercontent.com/TheYfactora12/Pokemon-Champions-Sim-Planner/docs/qc-m4-readiness/poke-sim/pokemon-champion-2026.html)
- **Stable - TheYfactora12 `main`**: [htmlpreview.github.io - TheYfactora12/main](https://htmlpreview.github.io/?https://raw.githubusercontent.com/TheYfactora12/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html)
- **Production reference - alfredocox `main` after cleanup is pushed upstream**: [htmlpreview.github.io - alfredocox/main](https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html)
- **GitHub Pages**: will be `https://TheYfactora12.github.io/Pokemon-Champions-Sim-Planner/` once configured.

> **Note:** The htmlpreview links are live proxies. The PR preview shows `docs/qc-m4-readiness`; the owner stable link shows `TheYfactora12/main`; the production reference is `alfredocox/main` only after cleaned work is intentionally pushed upstream. Do not push to `alfredocox` unless explicitly instructed.

---
## Repository Structure

```
Pokemon-Champions-Sim-Planner/
├── README.md                          ← This file
├── DEVELOPMENT_RUNBOOK.md             ← Full dev + QA + replication guide
├── MASTER_PROMPT.md                   ← Copy-paste prompt for new AI sessions
├── index.html                         ← Landing redirect to bundle
└── poke-sim/                          ← App sources + bundle
    ├── pokemon-champion-2026.html     ← Self-contained single-file bundle (~400 KB)
    ├── index.html                     ← App shell, tabs, PWA meta
    ├── style.css                      ← Mobile-first dark theme
    ├── data.js                        ← BASE_STATS, TEAMS (13), POKEMON_TYPES_DB (500+)
    ├── engine.js                      ← Battle sim engine, damage formula, Bo runner
    ├── ui.js                          ← All UI logic, import/export, pilot guide, PDF
    ├── legality.js                    ← Team legality validator
    ├── strategy-injectable.js         ← Strategy tab knowledge base
    ├── manifest.json                  ← PWA manifest
    ├── sw.js                          ← Service worker (cache-first)
    ├── icon-192.png                   ← PWA icon
    ├── icon-512.png                   ← PWA icon large
    └── tests/                         ← Node regression suite (items, status, mega, coverage, audit)
```

---

## Quickstart — Zero Dependencies

1. Clone or download this repo
2. Open `poke-sim/pokemon-champion-2026.html` in Chrome, Firefox, or Safari
3. No install, no build step, no server needed

---

## Features

- Bo1 / Bo3 / Bo5 / Bo10 Monte Carlo simulation
- Doubles and Singles format toggle
- 13 tournament teams preloaded (Champions Arena, Chuppa, Rin Sand, Suica Sun, etc.)
- Poképaste + Showdown import/export
- Team Preview bring-N-of-6 picker with drag+tap UI and Random 4/6 opponent mode (T9j.10)
- Simulator-tab inline bring pickers for player + opponent sharing state with the Teams tab (T9j.12)
- Custom team bulk import/export via file + filter chips on Teams tab (T9j.11)
- Replay Log with All / Wins / Losses / Clutch filters
- Auto-generated Pilot Guide per matchup
- Strategy tab with team-level tactical guidance
- Meta Threat Radar, Speed Tiers, Team Coverage checker
- PDF report (after Run All Matchups)
- PWA — installable on iOS/Android/Desktop

---

## Run Tests

```bash
cd poke-sim
node tests/items_tests.js      # 14/14
node tests/status_tests.js     # 27/27
node tests/mega_tests.js       # 27/27
node tests/coverage_tests.js   # 9/9
node tests/t9j8_tests.js       # 47/47 — crit / flinch / abilities
node tests/t9j9_tests.js       # 24/24 — MOVE_CATEGORY / MOVE_BP
node tests/t9j10_tests.js      # 16/16 — bring N-of-6 picker state
node tests/t9j11_tests.js      # 16/16 — custom teams bulk I/O + filter chips
node tests/t9j12_tests.js      # 11/11 — simulator bring picker
node tests/t9j13_tests.js      # 47/47 — format-mismatch guard + SP rescale
node tests/t9j14_tests.js      # 25/25 — Shadow Pressure PDF + coaching notes
node tests/t9j15_tests.js      # 22/22 — Best Mega Trigger Turn card (Pilot Guide + PDF)
node tests/t9j16_tests.js      # 58/58 — Elite Coaching Engine + Strategy Report (17 rules)
node tests/audit.js            # 5070 battles, 0 errors

# Total: 343/343 across all suites

# Nightly (not in fast loop)
N=500 node tests/nightly_bring_harness.js   # end-to-end bring picker wiring check
```

Green baseline: **285/285** unit tests + 5070-battle audit with 0 JS errors.

---

## Rebuild Bundle (after any source file change)

```bash
cd poke-sim && python3 -c "
import re, os
with open('index.html','r') as f: html=f.read()
with open('style.css','r') as f: css=f.read()
with open('data.js','r') as f: data=f.read()
with open('engine.js','r') as f: engine=f.read()
with open('ui.js','r') as f: ui=f.read()
html=html.replace('<script src=\"data.js\"></script>','')
html=html.replace('<script src=\"engine.js\"></script>','')
html=html.replace('<script src=\"ui.js\"></script>','')
html=html.replace('<link rel=\"stylesheet\" href=\"style.css\"/>','')
html=re.sub(r'<script>\nif \(.serviceWorker.\).*?</script>','',html,flags=re.DOTALL)
html=html.replace('<link rel=\"manifest\" href=\"manifest.json\"/>','')
html=html.replace('<link rel=\"apple-touch-icon\" href=\"icon-192.png\"/>','')
html=html.replace('</head>','<style>\n'+css+'\n</style>\n</head>')
html=html.replace('</body>','<script>\n'+data+'\n\n'+engine+'\n\n'+ui+'\n</script>\n</body>')
with open('pokemon-champion-2026.html','w') as f: f.write(html)
print(f'Bundle: {os.path.getsize(\"pokemon-champion-2026.html\"):,} bytes')
"
```

---

## See Also

- [`DEVELOPMENT_RUNBOOK.md`](./DEVELOPMENT_RUNBOOK.md) — full dev history, QA log, replication steps, known issues
- [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) — copy-paste context for resuming in a new AI session
- [`CHAMPIONS_VALIDATOR_FRAMEWORK.md`](./CHAMPIONS_VALIDATOR_FRAMEWORK.md) — validator framework governing engine change tickets
