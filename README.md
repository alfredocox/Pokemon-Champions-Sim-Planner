# Pokémon Champion 2026 — VGC Team Simulator

[![Ko-fi](https://img.shields.io/badge/Buy%20us%20a%20coffee-ff5e3a?style=flat&logo=ko-fi&logoColor=white)](https://ko-fi.com/alfredocox)

A production-grade VGC competitive team simulator for April 2026 meta play. Built as a fully offline-capable PWA with no server required.

**Live single-file app:** [`pokemon-champion-2026.html`](./poke-sim/pokemon-champion-2026.html) — open in any browser, works offline.

> ☕ Built free on evenings & weekends by 3 developers. If it helped your prep, [tip the devs on Ko-fi](https://ko-fi.com/alfredocox) — no Pokémon IP involved, just a personal thank-you to the team.

## Where the App Lives (Shareable URLs)

Three ways to open the sim without cloning. Each points to a different snapshot of the bundle — know which one you are sharing.

| Channel | Name | What it serves | Updates when | Use it for | Status |
|---|---|---|---|---|---|
| **Dev preview** | `fix/champions-sp-and-legality` (current active dev branch) | Newest work-in-progress bundle — what Alfredo and the agent push fixes to today | Every push to `fix/champions-sp-and-legality` | Testing the latest mechanics / tickets before merge | ✅ Live |
| **Stable** | `main` branch | Last merged bundle on the default branch | Only after a PR from a feature branch is merged into `main` | Sharing with teammates / VGC players who want a known-good build | ✅ Live |
| **Static host** | GitHub Pages | Clean short URL, no proxy | Re-publishes on every push to `main` once enabled | Giving out a permanent link; best mobile experience | ⚠️ Not yet enabled — see setup below |

**Links:**
- **Dev preview — current branch `fix/champions-sp-and-legality`** (latest work-in-progress bundle, updates on every push): [htmlpreview.github.io — fix/champions-sp-and-legality](https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/fix/champions-sp-and-legality/poke-sim/pokemon-champion-2026.html)
- **Stable — branch `main`** (last merged bundle, updates only after PR merge): [htmlpreview.github.io — main](https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html)
- **GitHub Pages** (not yet enabled): will be `https://alfredocox.github.io/Pokemon-Champions-Sim-Planner/` once configured — to enable, go to repo → Settings → Pages → Source: `Deploy from a branch`, select `main` branch, folder `/ (root)`, save

> **Note:** The two htmlpreview links are *live proxies* — they pull the raw HTML from GitHub at load time, so a push to that branch updates what viewers see on next reload. The **dev preview** shows whatever is on `fix/champions-sp-and-legality` (the branch we are actively iterating on); the **stable** link shows whatever is on `main`. The local file at `poke-sim/pokemon-champion-2026.html` is the *source of truth* — everything above is a hosted view of it.

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

## Support the Developers

This tool is and always will be **free**. If it helped your tournament prep:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/alfredocox)

> Tips go to the individual developers — not to any Pokémon product or project. Ko-fi is a personal thank-you.

---

## See Also

- [`DEVELOPMENT_RUNBOOK.md`](./DEVELOPMENT_RUNBOOK.md) — full dev history, QA log, replication steps, known issues
- [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) — copy-paste context for resuming in a new AI session
- [`CHAMPIONS_VALIDATOR_FRAMEWORK.md`](./CHAMPIONS_VALIDATOR_FRAMEWORK.md) — validator framework governing engine change tickets
