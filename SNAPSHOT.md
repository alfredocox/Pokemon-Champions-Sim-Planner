# Snapshot: alfredocox/Pokemon-Champions-Sim-Planner — April 27, 2026

## Purpose
This repository (`TheYfactora12/Pokemon-Champions-Sim-Planner`) is serving as a
**dated backup** of Alfredo's upstream main branch, taken before upcoming changes.

## Upstream Reference
- **Source repo:** https://github.com/alfredocox/Pokemon-Champions-Sim-Planner
- **Branch:** `main`
- **Commit SHA:** `820cc0fc2c8d05ff9e07b88eafd4ccba5c7e3573`
- **Snapshot date:** April 27, 2026
- **Snapshot by:** TheYfactora12 via Perplexity AI

## App Version at Snapshot
- **Build version:** `v2.1.9-phase4c.1`
- **SW cache name:** `champions-sim-v7-phase4c1`
- **Active format:** Poke-e-Sim Champion 2026 · Reg M-A · Doubles/Singles

## Files Captured (poke-sim/)
| File | Upstream SHA | Notes |
|---|---|---|
| `index.html` | `a30d779` | App shell, all tabs, SW registration |
| `sw.js` | `6b2dffe` | CACHE_NAME: champions-sim-v7-phase4c1 |
| `manifest.json` | `4df836f` | PWA manifest |
| `legality.js` | `ab966b7` | Reg M-A ban list + item checks |
| `storage_adapter.js` | `288d36b` | champions:* key schema (Issue #79) |
| `supabase_adapter.js` | `9769a87` | Supabase sync layer |

> Note: Large files (data.js ~175KB, engine.js ~123KB, ui.js ~314KB, style.css ~67KB,
> strategy-injectable.js ~37KB, pokemon-champion-2026.html ~711KB) are not duplicated
> here due to API payload limits. Reference upstream SHA above for full file recovery.
> To restore those, run:
> ```bash
> git clone https://github.com/alfredocox/Pokemon-Champions-Sim-Planner.git
> git checkout 820cc0fc2c8d05ff9e07b88eafd4ccba5c7e3573
> ```

## How to Restore
If Alfredo's main breaks after changes and you need to get back to this state:

```bash
# Option 1: Checkout the exact upstream commit
git clone https://github.com/alfredocox/Pokemon-Champions-Sim-Planner.git
cd Pokemon-Champions-Sim-Planner
git checkout 820cc0fc2c8d05ff9e07b88eafd4ccba5c7e3573

# Option 2: Use this backup repo for the small config files
git clone https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner.git
```

## Live App (from upstream)
- htmlpreview: https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html
- GitHub Pages: https://alfredocox.github.io/Pokemon-Champions-Sim-Planner/
