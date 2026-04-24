# Pokémon Champion 2026 — VGC Team Simulator

A production-grade VGC competitive team simulator for April 2026 meta play. Built as a fully offline-capable PWA with no server required.

**Live single-file app:** [`pokemon-champion-2026.html`](./poke-sim/pokemon-champion-2026.html) — open in any browser, works offline.

**Shareable links (no clone needed):**
- htmlpreview (current branch): https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/fix/champions-sp-and-legality/poke-sim/pokemon-champion-2026.html
- htmlpreview (main): https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html
- GitHub Pages: https://alfredocox.github.io/Pokemon-Champions-Sim-Planner/

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
node tests/audit.js            # 5070 battles, 0 errors
```

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
