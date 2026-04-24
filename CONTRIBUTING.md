# Contributing to Pokemon Champions 2026 Sim

Thanks for your interest in contributing. This project is a competitive VGC
simulator for Pokemon Champions 2026, and accuracy is the highest priority.
Every mechanic change must cite a primary source (Game8, Bulbapedia, Serebii,
RotomLabs, Victory Road, or official Pokemon Champions patch notes).

## Project Layout

All source lives under `poke-sim/`:

- `index.html` — main app shell, tabs, PWA meta, service worker registration
- `style.css` — mobile-first dark theme
- `data.js` — `BASE_STATS`, `POKEMON_TYPES_DB` (500+ mons), `DEX_NUM_MAP`, `TEAMS` (13 tournament teams), `MOVE_TYPES`, `CHAMPIONS_MEGAS`
- `engine.js` — battle simulation engine, damage formula, Bo series runner
- `ui.js` — UI logic, team selects, import/export, pilot guide, PDF report, speed tiers, meta radar, coverage checker
- `legality.js` — Reg M-A legality checker
- `pokemon-champion-2026.html` — self-contained single-file bundle (inlined build)
- `manifest.json`, `sw.js`, `icon-*.png` — PWA assets

## Rebuild Command

After any source edit, regenerate the single-file bundle:

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

## Development Workflow

1. **File an issue first.** Describe the bug/feature, link the primary source, tag appropriately (mechanic, bug, feature, etc.).
2. **Branch from `main`.** Name branches `fix/<topic>` or `feat/<topic>`.
3. **Research before editing.** Cite Game8 / Bulbapedia / RotomLabs / Victory Road for any mechanic change. Accuracy is non-negotiable.
4. **Draft a diff first.** For non-trivial changes, write a `*_DIFF_DRAFT.md` showing before/after snippets and rationale before touching source files.
5. **Syntax-check every file** you edit: `node -c poke-sim/data.js`, same for engine.js and ui.js.
6. **Rebuild the bundle.** Do not commit source-only changes without the regenerated `pokemon-champion-2026.html`.
7. **Run tests.** At minimum:
   - `/tmp/coverage_tests.js` — coverage widget regression suite
   - `/tmp/audit.js` — 5070-battle matchup audit (watch for JS errors and unexpected win-rate shifts)
8. **Commit message format:** present tense, no em-dashes, reference issues with `Refs #N T<ticket>` (not `Fixes #N`). Example:
   ```
   add dynamic mega evolution with base form lead and stone trigger (Refs #23 T9j7)
   ```
9. **Open a PR** against `main`. Fill out the PR template including test evidence.

## TDZ-Safe Globals

Some globals (notably `COVERAGE_CHECKS` in `ui.js`) are referenced during init
**before** their declaration line is reached. These **must** be declared with
`var`, not `const` or `let`, or the app will throw a Temporal Dead Zone error
on load. If you add a new init-time global, use `var`.

## Issue Labels

- `mechanic` — engine rule or damage-formula correctness
- `data` — stats, moves, types, team definitions
- `ui` — interface, tabs, widgets
- `pwa` — manifest, service worker, install experience
- `legality` — Reg M-A format checker
- `docs` — specs and reports under repo root

## Closing Issues

Only close an issue when you are **100% confident** the fix fully addresses it.
Partial fixes get a context comment on the issue but remain open. When closing,
post evidence (test output, sample log, or commit SHA) in a comment first.

## Primary Source Citation Examples

- Game8 Pokemon Champions hub: https://game8.co/games/Pokemon-Champions
- Bulbapedia: https://bulbapedia.bulbagarden.net
- RotomLabs Champions dex: https://rotomlabs.net/dex/champions
- Victory Road regulations: https://victoryroad.pro/champions-regulations/
- Serebii: https://www.serebii.net

## Questions

Open a GitHub Discussion or issue. Thanks for helping keep the sim accurate.
