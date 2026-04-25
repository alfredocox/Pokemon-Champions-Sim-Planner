# poke-sim/tools

Build and validation scripts for the Champions Sim project.

---

## Scripts

### `build-bundle.py`
Assembles the single-file bundle `poke-sim/pokemon-champion-2026.html` from the five source files:
- `poke-sim/index.html`
- `poke-sim/style.css`
- `poke-sim/data.js`
- `poke-sim/engine.js`
- `poke-sim/ui.js`

**Run from the `poke-sim/` directory:**
```bash
cd poke-sim && python3 tools/build-bundle.py
```

**Options:**
- `--to-stdout` -- prints bundle to stdout instead of writing to disk (used internally by `check-bundle.sh`)

---

### `check-bundle.sh`
Verifies that the committed bundle matches what the build script would produce.
Returns exit code `0` if fresh, `1` if drift is detected.

**Run from repo root:**
```bash
bash poke-sim/tools/check-bundle.sh
```

Called automatically by CI on every PR (wired in `.github/workflows/ci.yml`, issue #87).

---

## Fixing a Bundle Drift Failure

If CI fails with `Bundle drift detected`, it means source files were changed but the bundle was not rebuilt. Fix:

```bash
# 1. Rebuild the bundle
cd poke-sim && python3 tools/build-bundle.py

# 2. Commit the updated bundle
git add poke-sim/pokemon-champion-2026.html
git commit -m "chore: rebuild bundle after source changes"

# 3. Push
git push
```

---

### `release.sh`
Auto-bumps `sw.js` CACHE_NAME on release. See [MASTER_PROMPT.md > RELEASE PROCEDURE](../MASTER_PROMPT.md) for full steps.
