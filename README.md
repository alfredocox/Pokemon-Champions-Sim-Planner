# Pokémon Champion 2026 — VGC Team Simulator

A production-grade VGC competitive team simulator for April 2026 meta play. Built as a fully offline-capable PWA with a static-site deployment path and optional Supabase-backed user features.

**Live public site:** https://theyfactora12.github.io/Pokemon-Champions-Sim-Planner/

**Live single-file app:** [`pokemon-champion-2026.html`](./poke-sim/pokemon-champion-2026.html) — open in any browser, works offline.

## Where the App Lives (Shareable URLs)

Three ways to open the sim without cloning. Each points to a different snapshot of the bundle — know which one you are sharing.

| Channel | Name | What it serves | Updates when | Use it for | Status |
|---|---|---|---|---|---|
| **Dev preview** | current active PR branch | Newest work-in-progress bundle for the branch under active review | Every push to that branch | Testing the latest mechanics / tickets before merge | ✅ Live when branch preview is shared |
| **Stable** | `main` branch | Last merged bundle on the default branch | Only after a PR from a feature branch is merged into `main` | Sharing with teammates / VGC players who want a known-good build | ✅ Live |
| **Static host** | GitHub Pages | Clean short URL, no proxy | Re-publishes on every push to `main` | Giving out a permanent link; best mobile experience | ✅ Live |

**Links:**
- **Stable — branch `main`**: [GitHub Pages](https://theyfactora12.github.io/Pokemon-Champions-Sim-Planner/)
- **Stable raw preview — branch `main`**: [htmlpreview.github.io — main](https://htmlpreview.github.io/?https://raw.githubusercontent.com/TheYfactora12/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html)
- **Dev preview**: use the active branch preview URL shared in the PR under review

> **Note:** The htmlpreview link is a branch/raw preview tool, not the canonical public site. The stable public site is GitHub Pages on `main`. The local file at `poke-sim/pokemon-champion-2026.html` remains the source artifact that the site serves.
>
> For QA handoffs, always pin the exact repo, branch, commit SHA, preview target, and required local/DB credentials. Do not send branch-only review to GitHub Pages. See [`docs/release/QA_ENVIRONMENT_HANDOFF_RULES_2026-06-19.md`](./docs/release/QA_ENVIRONMENT_HANDOFF_RULES_2026-06-19.md) and [`docs/release/SIM_AND_DB_SNAPSHOT_2026-06-19.md`](./docs/release/SIM_AND_DB_SNAPSHOT_2026-06-19.md).

## Release Direction

This project should ship as a public site first, then add optional accounts, donations, subscriptions, and coaching on top of a trustworthy free core.

- Site: canonical public entry point for simulator, replay review, Battle Sensei, and team tools.
- Donations: optional support channel after the stable site is live.
- Subscription: for saved history, deeper analysis, and repeat workflow value, not for basic simulator trust.
- Coaching: separate premium human service layered on top of replay evidence and Battle Sensei outputs.

See [ROADMAP.md](./ROADMAP.md) `M6 Release Track` for the step-by-step launch, security, ownership, and revenue plan.

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
    ├── data.js                        ← BASE_STATS, TEAMS (29), POKEMON_TYPES_DB (700+)
    ├── engine.js                      ← Battle sim engine, damage formula, Bo runner
    ├── ui.js                          ← All UI logic, import/export, pilot guide, PDF
    ├── legality.js                    ← Team legality validator
    ├── strategy-injectable.js         ← Strategy tab knowledge base
    ├── manifest.json                  ← PWA manifest
    ├── sw.js                          ← Service worker (network-first app shell, cached assets)
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

- Bo1 / Bo3 / Bo5 Monte Carlo simulation
- Doubles and Singles format toggle
- 29 curated teams preloaded (Champions Arena, Chuppa, Rin Sand, Suica Sun, Mega variants, and review imports)
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
npm run test:fast              # current fast suite, skips live DB tests
node tests/audit.js            # 5070 battles, 0 errors

# Nightly (not in fast loop)
N=500 node tests/nightly_bring_harness.js   # end-to-end bring picker wiring check
```

Current review baseline: `npm run test:fast` passes all non-DB suites, with live DB suites skipped unless credentials are explicitly enabled. The latest local Showdown DB review run passed 84 non-DB test files, skipped 14 DB-gated files, and reported 0 failures.

When a change touches Showdown source data, generated runtime artifacts, fallback stats/types, or DB-generation wiring, also run `npm run test:source-truth` from `poke-sim/`. That is the focused drift guardrail suite for source-truth changes.

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
- [`docs/repo-sync-playbook.md`](./docs/repo-sync-playbook.md) — fastest safe process for syncing validated fixes into mirror repos
- [`CHAMPIONS_VALIDATOR_FRAMEWORK.md`](./CHAMPIONS_VALIDATOR_FRAMEWORK.md) — validator framework governing engine change tickets
