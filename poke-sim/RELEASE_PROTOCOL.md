# Release Task Protocol

> **This file is referenced by `MASTER_PROMPT.md`. It defines the mandatory release task process whenever a milestone is closed or a major patch lands.**

---

## When this triggers

| Event | Trigger condition |
|-------|------------------|
| Milestone closed | Any Mx milestone moves to `closed` state in GitHub |
| Major patch | A PR increments the version chip MINOR or MAJOR (e.g., v2.1.x → v2.2.0 or v3.0.0) |
| Coaching phase closeout | Any Phase 4c, 4d, 4e, 5, or 6 merges to `main` |
| Engine mechanics batch | Any T9j.N batch (e.g., T9j.17) merges to `main` |

---

## What to do: file a release task GitHub Issue

Assigned to: **@alfredocox**  
Labels: `release`, `assigned-alfredo`  
Milestone: the one just closed (or next milestone if closing a patch)

### Issue title format
```
release: v{MAJOR}.{MINOR}.{PATCH} — {milestone or patch name} [@alfredocox]
```

### Issue body template
```markdown
## Release task: v{version}

### What ships
- [ ] {feature 1 — one line}
- [ ] {feature 2}
- ...

### Pre-release checklist
- [ ] All validation gates green (see MASTER_PROMPT.md - VALIDATION GATES)
- [ ] Bundle rebuilt: `python3 tools/build-bundle.py`
- [ ] CACHE_NAME bumped: `./tools/release.sh {tag}`
- [ ] Build chip updated in index.html: `v{version}`
- [ ] MASTER_PROMPT.md VERSION RELEASE LOG row added
- [ ] GitHub Release created with tag `v{version}` and release notes
- [ ] GitHub Pages auto-deploy confirmed live
- [ ] Space files re-uploaded if source files changed

### Release notes draft
{3-5 bullet user-facing summary of what changed}

Refs: #{milestone issue numbers}
```

---

## AI assistant hard-stop rule

If a session ends a milestone, closes a phase, or merges a major patch and no release task issue has been filed, the AI **must** say:

> ⚠️ **Release task required.** Milestone/patch [{name}] just closed. A release issue must be filed and assigned to @alfredocox before this session ends. Shall I draft it now?

---

## VERSION RELEASE LOG

Update on every versioned release. Most recent at top.

| Version | Date | Milestone / patch | CACHE_NAME | Key changes | Release issue |
|---------|------|------------------|------------|-------------|---------------|
| v2.1.8-emptystate.1 | 2026-04-25 | Phase 4b+ empty-state | `champions-sim-v5-emptystate1` | Record bar legacy vs new empty-state guidance (PR #121) | — |
| v2.1.7-mirror.1 | 2026-04-25 | Phase 4b+ both-sides | `champions-sim-v5-mirror1` | Opponent-only teams populate Strategy/Record bar via sim log mirroring (PR #120) | — |
| v2.1.6-recordbar.1 | 2026-04-25 | Phase 4b+ record bar | `champions-sim-v5-recordbar1` | Record bar total W-L + per-archetype splits; 10/50/100/500 sim presets (PR #119) | — |
| v2.1.5-pilotfix.1 | 2026-04-25 | Phase 4b+ pilot fix | `champions-sim-v5-pilotfix1` | Pilot Guide upserts after every single sim (PR #118) | — |
| v2.1.4-phase4b | 2026-04-24 | Phase 4b adaptive coaching | `champions-sim-v5-phase4b` | Adaptive state machine, team_history, consistency score (PR #115) | — |
| v2.1.3-phase4a | 2026-04-23 | Phase 4a sim log | `champions-sim-v5-phase4a` | champions_sim_log_v1, per-game koEvents (PR #113) | — |
| v2.1.2-phase3 | 2026-04-22 | M2 coaching Phase 3 | `champions-sim-v5-phase3` | Strategy tab persistence, Section 7 localStorage schema (PR #108) | — |
| v2.1.1-phase2 | 2026-04-21 | M2 coaching Phase 2 | `champions-sim-v5-phase3` | Strategy tab, 12-section theory engine, 22-team V2 adapters (PR #106) | — |
| v2.1.0-t9j10 | 2026-04-20 | T9j.10 Team Preview | `champions-sim-v3` | Bring-N-of-6, bring picker UI, T9j10 test suite | — |
| v2.0.0-t9j9 | 2026-04-18 | T9j.9 move data | `champions-sim-v3` | MOVE_CATEGORY + MOVE_BP tables, data-driven isPhysical() | — |
| v1.0.0 | 2026-04-01 | M1 Engine Truth foundation | `champions-sim-v1` | Initial PWA, 13 teams, Bo1/3/5/10, Singles/Doubles | — |

> When filing a new row: copy the bottom row, update all fields, set Release issue to `#N`.
