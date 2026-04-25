# THREAD RECOVERY HANDOFF — 2026-04-25

> **Purpose:** This document reconstructs decision-state from a Perplexity session that ran out of credits before a handoff file could be saved. All facts below are sourced from verified artifacts: `poke-sim/MASTER_PROMPT.md` (live repo), Space files, and memory context captured in the Space session. Nothing here is inferred without a traceable source.

---

## 1. PROJECT IDENTITY

| Field | Value |
|-------|-------|
| **Product** | Pokémon Champion 2026 — production-grade VGC competitive team simulator |
| **Tagline** | "Battle-tested. Always evolving." |
| **Repo** | https://github.com/alfredocox/Pokemon-Champions-Sim-Planner |
| **Default branch** | `main` |
| **Copyright** | © 2026 Alfredo Cox (@alfredocox) and Kevin Medeiros (@TheYfactora12). All Rights Reserved. |

---

## 2. SOURCE OF TRUTH HIERARCHY

1. **`poke-sim/MASTER_PROMPT.md`** — canonical operating context. Single copy only. The former inner duplicate at `poke-sim/poke-sim/MASTER_PROMPT.md` was deleted in a consolidation PR. All edits go to `poke-sim/MASTER_PROMPT.md`.
2. **GitHub issues + milestones** — execution truth for sprint work.
3. **Phase spec files** (`PHASE4C_DETECTORS_SPEC.md`, `PHASE4D_THREAT_RESPONSE_SPEC.md`, `PHASE4E_POLICY_AUDIT_SPEC.md`, `PHASE5_TURN_LOG_SPEC_DRAFT.md`, `PHASE6_COACHING_VOICE_SPEC.md`, `COACHING_NORTH_STAR.md`) — all locked as of PR #127 (2026-04-25).
4. **Space files** — convenience mirrors. May lag behind repo until owner uploads fresh copies.
5. **This document** — recovery bridge only. Once absorbed into MASTER_PROMPT.md, delete this file.

---

## 3. OWNERSHIP MODEL

| Role | GitHub handle | Responsible for |
|------|--------------|-----------------|
| Product / feature scoping | `TheYfactora12` | Rule design, user-facing decisions, new feature ticket assignment |
| Engineering | `alfredocox` | Refactors, infra, perf, security, software validation |
| Testing / QA | `Jdoutt38` | Testing, math/table tickets, a11y, coaching validation, stress testing |

---

## 4. CURRENT BUILD STATE

| Field | Value |
|-------|-------|
| **Build chip** | `v2.1.8-emptystate.1` |
| **CACHE_NAME** | `champions-sim-v5-emptystate1` |
| **Last merged PR** | #121 — Record bar legacy vs new empty-state guidance |
| **Active branch** | `main` (all dev goes here; `fix/champions-sp-and-legality` is merged and closed) |

---

## 5. COACHING LAYER PHASE STATUS

| Phase | Status |
|-------|--------|
| 1 — Spec doc | ✅ Merged |
| 2 — Strategy tab + theory engine | ✅ Merged |
| 3 — Per-team report persistence | ✅ Merged |
| 4a — Sim log foundation | ✅ Merged |
| 4b — Adaptive state machine + team_history + consistency score | ✅ Merged |
| 4b+ — Pilot Guide upsert (#118), Record bar (#119), both-sides mirroring (#120), empty-state guidance (#121) | ✅ All merged |
| **4c — Detectors (dead moves, lead perf, loss conditions, confidence badges)** | **Spec locked. Ready to implement.** |
| **4d — Threat Response System (MC solver, 200 sims/branch × 4 branches)** | **Spec locked. Ready after 4c lands.** |
| **4e — Policy audit + same-advice regression test** | **Spec locked. Regression test = Phase 4 closeout BLOCKER.** |
| 5 — Structured turnLog (DRAFT) | Draft only. Approval gate = after 4c lands. |
| 6 — Coaching voice spec | Spec locked. Implement after Phase 5. |

**Sequencing rule (locked):** 4c → 4d → 4e → 5 → 6. No parallel long-lived branches.

---

## 6. HARD INVARIANTS (DO NOT OVERRIDE)

1. **No draws surfaced.** Record bar excludes draw bucket from all UI renders.
2. **Same-advice regression test is Phase 4 closeout blocker.**
3. **No data fabrication across storage keys.** Phase 3 aggregates cannot be decomposed into Phase 4 sim-log entries.
4. **Population qualifier within one sentence of every percentage.**
5. **Banned tournament-claim phrasings** until Credibility Ladder advances: `tournament-grade`, `ladder-tested`, `meta-proven`, `competitive viable` (unqualified), `pro-approved`, `world's #1`.
6. **Surface candidates, not directives.** Use "consider" / "best candidate" / "first option to try".
7. **`var COVERAGE_CHECKS` in `ui.js` MUST stay `var`.** `const`/`let` causes TDZ ReferenceError on load. Do not change without restructuring initialization order.

---

## 7. RELEASE PROCEDURE SUMMARY

Any PR touching `engine.js`, `data.js`, `ui.js`, `style.css`, `strategy-injectable.js`, or `index.html` must:

1. Rebuild bundle: `cd poke-sim && python3 tools/build-bundle.py`
2. Bump cache: `./tools/release.sh <tag>`
3. Commit both alongside source changes
4. Update `poke-sim/MASTER_PROMPT.md`
5. Open PR — CI checks (#88 + #95) enforce steps 1 and 2

**Branch protection reminder (repo owner action required):** Add `Verify bundle is fresh` and `Verify sw.js CACHE_NAME bumped` to `main` required status checks at https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/settings/branches

---

## 8. DEFERRED DECISIONS (LOCKED — DO NOT REOPEN)

| Topic | Decision |
|-------|----------|
| Tera mechanic | Deferred. Not in current format scope. Tracked as M11 issue. |
| IndexedDB | Deferred to post-v1. v1 uses synchronous localStorage. |
| Phase 4d budget | 200 sims/branch × 4 branches/matchup. Non-negotiable without dedicated perf PR. |
| Coaching voice | Direct + grounded + evidence-backed. RNG blame gated on `consistency_score.rng_dependency > 0.6`. |
| `turnLog` persistence | Memory-only. Only summary fields stored. Never persisted to localStorage. |
| Sim-count ceiling | 500 series hard ceiling. Do not raise without dedicated perf PR. |

---

## 9. KNOWN LIMITATIONS / OPEN TECH DEBT

| Item | Detail |
|------|--------|
| Sprite gap | `Golurk-Mega` renders blank. Fix planned as separate PR. |
| Weather override priority | Mid-game weather override priority not fully modeled (P3 #8). |
| Remove-team UI | No first-class delete/remove team UI action in current build. |
| Space file lag | Space files may lag repo. Always treat GitHub repo as higher-priority source. |

---

## 10. NEXT SESSION STARTUP CHECKLIST

Before writing any code or spec in a new session, verify in order:

- [ ] Confirm current CACHE_NAME matches `sw.js` in repo
- [ ] Confirm active milestone and open issues for Phase 4c
- [ ] Confirm no open PRs touching the same files you plan to edit
- [ ] Check `poke-sim/MASTER_PROMPT.md` — Coaching Layer Rollout table for latest phase status
- [ ] Do NOT reopen any decision in Section 8 without an ADR
- [ ] If Phase 4c is still pending: that is the only thing to start

---

## 11. LIVE APP LINKS

| Access method | URL |
|---------------|-----|
| htmlpreview bundle (easiest) | https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html |
| GitHub Pages (auto-deploy) | https://alfredocox.github.io/Pokemon-Champions-Sim-Planner/ |

> ⚠️ htmlpreview does NOT work for `index.html` (multi-file dev version). Use the bundle link or clone locally.

---

*Generated: 2026-04-25. Sourced from `poke-sim/MASTER_PROMPT.md` (SHA: 5e248bc114b2f5f90966b0852675c333f7af26f9), Space files, and session memory context. After merging: absorb key facts back into `MASTER_PROMPT.md`, then delete this file.*
