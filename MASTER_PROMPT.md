# MASTER PROMPT — Pokémon Champion 2026

> Copy everything below this line and paste it as your first message in a new Perplexity AI chat to instantly resume this project with full context.

---

## COPY FROM HERE ↓

---

You are continuing development of **Pokémon Champion 2026**, a production-grade VGC competitive team simulator. The project lives at:

**GitHub:** https://github.com/alfredocox/Pokemon-Champions-Sim-Planner

---

## PROJECT STATE (as of April 23, 2026)

All source files live in `poke-sim/`. The self-contained single-file bundle is `pokemon-champion-2026-FINAL.html` (280 KB, works offline in any browser).

### Source Files
| File | Purpose |
|------|---------|
| `poke-sim/index.html` | App shell, all tabs, PWA meta tags, service worker reg |
| `poke-sim/style.css` | Full mobile-first dark theme (34 KB) |
| `poke-sim/data.js` | BASE_STATS, POKEMON_TYPES_DB (500+ mons), DEX_NUM_MAP (1025+), TEAMS object (13 tournament teams), MOVE_TYPES, getSpriteUrl() |
| `poke-sim/engine.js` | Battle simulation engine, Bo series runner, damage formula with `Math.random()` roll |
| `poke-sim/ui.js` | All UI logic, team selects, import/export, pilot guide, PDF report, speed tiers, meta radar, coverage checker, strategy tab |
| `poke-sim/strategy-injectable.js` | TEAM_META knowledge base: archetype tags, setup plays, counters, Pokémon move notes |
| `poke-sim/manifest.json` | PWA manifest |
| `poke-sim/sw.js` | Service worker (cache-first) |

---

## TABS
Simulator | Teams | Set Editor | Replay Log | Sources | Pilot Guide | Strategy

---

## 13 LOADED TEAMS (keys in TEAMS object)
| Key | Team |
|-----|------|
| `player` | TR Counter Squad (Incineroar / Arcanine / Garchomp / Whimsicott / Rotom-Wash / Garchomp-Scarf) |
| `mega_altaria` | Mega Altaria (pokepaste dfdfa66d317cf9d7) |
| `mega_dragonite` | Mega Dragonite (dd101585183c9ed6) |
| `mega_houndoom` | Mega Houndoom (4a87b07998f6c0c4) |
| `rin_sand` | Rin Sand (e97ac67f1ce79c33) |
| `suica_sun` | Suica Sun (cb48d8b06c73d33b) |
| `cofagrigus_tr` | Cofagrigus TR |
| `champions_arena_1st` | Hyungwoo Shin — Champions Arena Winner |
| `champions_arena_2nd` | Jorge Tabuyo — Champions Arena Finalist |
| `champions_arena_3rd` | Juan Benítez — Champions Arena Top 3 |
| `chuppa_balance` | Chuppa Cross IV — Pittsburgh Champion |
| `aurora_veil_froslass` | Aurora Veil Froslass team |
| `kingambit_sneasler` | Kingambit + Sneasler Core |

---

## KEY ARCHITECTURE
- Format toggle: `currentFormat` (`'doubles'`/`'singles'`)
- Your team key: `currentPlayerKey` (starts as `'player'`, user-selectable)
- Bo series: `currentBo` (1/3/5/10), `runSimulation(n, playerKey, oppKey)`
- Run all: `runAllMatchupsUI()` in ui.js (calls engine’s `runAllMatchups`)
- Sprites: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{dex_num}.png`
- Import: pokepaste URL or raw Showdown text → parses into `TEAMS[slot].members`
- Export: `openExportModal(teamKey)` → Showdown format text
- After every sim: `showInlinePilotCard(oppKey, res)` runs automatically
- After Run All: `generatePilotGuide()` populates Pilot Guide tab, PDF button appears

## CRITICAL BUG NOTE
`COVERAGE_CHECKS` MUST be declared as `var` (not const/let) in ui.js.
It is referenced during init before its declaration line is reached.
If changed to const/let the app throws a TDZ error and breaks completely.

---

## DAMAGE FORMULA
```
baseDmg = floor((floor((2*50/5+2) * BP * Atk / Def) / 50) + 2)
roll    = 0.85 + Math.random() * 0.15   ← NOT deterministic
total   = floor(baseDmg * STAB * typeEff * spreadMult * multiscale * roll)
```

---

## REBUILD COMMAND (run after any source file changes)
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
with open('pokemon-champion-2026-FINAL.html','w') as f: f.write(html)
print(f'Bundle: {os.path.getsize(\"pokemon-champion-2026-FINAL.html\"):,} bytes')
"
```

---

## FEATURES COMPLETE
- Bo1/Bo3/Bo5/Bo10 simulation with Monte Carlo variance
- Singles/Doubles toggle
- Pokepaste + Showdown import/export (copy-paste to/from Smogon)
- Add imported team as new slot OR replace existing (with confirmation)
- Both sides fully interchangeable via dropdowns + Swap button
- Pilot Guide tab — per-matchup verdict, leads, win conditions, risks, tips
- Inline Pilot Notes card auto-shown after every single sim
- Download Results & Pilot Notes (.txt report)
- PDF Report (print API) — appears after Run All Matchups
- Series Summary view in Replay Log
- Meta Threat Radar (Sources tab) — 10 top Reg M-A threats, color-coded
- Speed Tier widget — collapsible per team card
- Team Coverage checker — live in VS column
- Strategy tab — team-level strategy, setup plays, counters, Pokémon move notes, refreshes on team change
- PWA ready — manifest + service worker + icons (iOS Add to Home Screen / Android Chrome)
- Single-file bundle (280 KB) — works offline in any browser

---

## OPEN ISSUES (priority order)
1. **Mega form Speed stats** may use pre-Mega base in Speed Tier widget — verify `BASE_STATS` for Mega forms
2. **Set Editor edits** should invalidate sim cache — add dirty flag on `TEAMS[key]` edits before Run All
3. **Nicknamed Pokémon import** — test `Nickname (Species) @ Item` parsing edge cases
4. **Pokepaste URL fetch** fails silently offline — add `.catch()` error toast
5. **Weather override turns** not modeled when both teams have weather setters — last switch-in should win

---

## DOCS
- `README.md` — quickstart
- `DEVELOPMENT_RUNBOOK.md` — full dev history, architecture, QA log, replication guide
- `MASTER_PROMPT.md` — this file

---

## HOW TO TEST IMMEDIATELY
1. `git clone https://github.com/alfredocox/Pokemon-Champions-Sim-Planner.git`
2. Open `pokemon-champion-2026-FINAL.html` in Chrome
3. Simulator tab → Run Simulation → verify win %, replay log, pilot card
4. Run All Matchups → verify 12-team matrix, Pilot Guide tab, PDF button
5. Strategy tab → change team dropdown → verify content updates

---

**Last known good state:** April 23, 2026
**Last commit:** `72ba3e8` — docs complete
**Bundle size:** 280,023 bytes
**Engine:** Verified non-deterministic (Math.random() damage roll confirmed in engine.js)
