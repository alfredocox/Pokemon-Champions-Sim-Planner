# Phase Rollout Review - Master Index

> **Status:** Ready for `@alfredocox` review. Single pane of glass for Phases 4c -> 4d -> 4e -> 5 -> 6.
> **Purpose:** One page where the dev/reviewer can compare scope, effort, dependencies, and go/no-go gates across all upcoming phases without having to open 5 separate spec files.
> **Source of truth:** the individual phase specs linked at the bottom. If this doc and a phase spec disagree, the phase spec wins.

---

## 1. The rollout sequence (locked)

```
Phase 4c  ->  Phase 4d  ->  Phase 4e  ->  Phase 5  ->  Phase 6
detectors    threat       policy       turn log    coaching
             solver       audit        + rollouts  voice
```

User-locked decision (2026-04-25): no parallel branches; staged sequential rollout. Each phase blocks the next.

---

## 2. Side-by-side phase comparison

| Phase | Goal | Engine.js? | New tests | Approx LOC | Adds to UI | Adds to CI |
|---|---|---|---|---|---|---|
| **4c** Detectors | Fill the 4 stub arrays in `team_history` (dead moves, lead perf, loss conditions, confidence) | No | 3 fixtures | ~600 | 4 collapsible Strategy sections | Detector unit tests |
| **4d** Threat Response | 4-branch Monte Carlo solver (`safe`/`aggressive`/`counter`/`defensive`), line classification v1 | No | 6 tests | ~830 | Recommended line + 3 alts on Pilot Guide | Solver determinism + classifier rules |
| **4e** Policy Audit | Fake-good plays + behavior patterns + **same-advice regression** | No | 6 tests (T5 = blocker) | ~780 | Policy Audit section + STATIC ADVICE banner | T5 same-advice regression on every PR |
| **5** Turn Log | Per-turn struct, `positionScore`, `winProbabilityDelta` rollouts | Reads only; no writes | ~10 tests across 5a/5b/5c | ~1100 cumulative | Replay Log v2 + IN-game template body | Turn-log shape + rollout determinism |
| **6** Coaching Voice | PRE/IN/POST templates, RNG-blame gating, banned-phrasing linter | No | 6 tests | ~820 | Inline pilot card v2 + voice across all surfaces | Banned-phrasings + RNG-gating tests |

Cumulative new code budget: ~4,130 lines, all in `ui.js` + tests/. Zero engine.js writes.

---

## 3. Dependencies (visual)

```
                    +------ 4c (detectors)
                   /
    + (you are here)
   /                \
  /                  +------ 4d (solver)  -> needs Phase 4c outputs
 /                              \
/                                +-- 4e (policy audit)  -> needs 4c + 4d
                                          \
                                           +-- 5 (turn log)  -> upgrades 4e fake-good detector
                                                  \
                                                   +-- 6 (voice) -> needs 4c/4d/4e/5 data to cite
```

**Hard prerequisite chain:**
- 4c blocks 4d (solver needs `lead_performance` data)
- 4c + 4d block 4e (audit compares detector output deltas + solver classifications)
- 4c + 4d + 4e block 5 (Phase 5 approval gate fires only after 4e regression test is green)
- 4c + 4d + 4e + 5 block 6 (voice cites everything, including `positionScore` from Phase 5)

---

## 4. Effort + timeline estimates

These are working estimates assuming `@alfredocox` is the engineer. All numbers are calendar working days at his current cadence (1 PR/session, ~2-4 sessions/week).

| Phase | Implementation effort | Validation effort | Review + merge | Total calendar |
|---|---|---|---|---|
| 4c | 3-4 days | 1-2 days | 0.5 day | **5-7 working days** |
| 4d | 4-5 days | 1-2 days | 0.5 day | **6-8 working days** |
| 4e | 3-4 days | 2 days (regression test is the bulk) | 0.5 day | **6 working days** |
| 5 | 5-7 days (split across 5a/5b/5c) | 2-3 days | 1 day | **8-11 working days** |
| 6 | 4-5 days | 2-3 days | 0.5 day | **7-9 working days** |

**Total range: 32 - 41 working days** -> roughly **6 to 10 calendar weeks** at 4 sessions/week.

**Critical path:** the regression test in Phase 4e is the single highest-risk item. If it fails to detect non-adaptive advice in seeded fixtures, Phase 4 cannot close out, and Phases 5/6 cannot start.

---

## 5. Go/No-Go gates

A phase is "Go" only if every gate from the previous phase passed. Gates are **measurable**, not vibes.

### Gate 4c -> 4d
- [ ] All 4 detector functions implemented and unit-tested
- [ ] Strategy tab renders 4 sections with confidence badges on >= 50-game team
- [ ] `confidenceBadge(15) === 'med'` and matches `CS_STATE_MATURE_THRESHOLD`
- [ ] Fixture C (200-game two-half regression) passes - this is the early signal that adaptivity works at the detector level

### Gate 4d -> 4e
- [ ] `solveThreatResponse` returns 4 branches with classifications
- [ ] `Run All Matchups` finishes <= 120 s on a 12-matchup case
- [ ] Determinism test (same seed -> same `win_rate`) passes 10/10 runs
- [ ] Low-sample guard prevents `recommended` flapping

### Gate 4e -> 5
**THIS IS THE PHASE 4 CLOSEOUT GATE.**
- [ ] `tests/phase4e_policy_regression.js` T5 passes
- [ ] T5 is wired into CI on every PR
- [ ] Manual: STATIC ADVICE WARNING visible when seeded with non-adaptive log
- [ ] PR description for the 4e merge answers: "What test guarantees the system gives different advice after 100 new battles?"
- [ ] User explicit sign-off: per `COACHING_NORTH_STAR.md` Phase 5 approval gate

### Gate 5 -> 6
- [ ] `turnLog` is in-memory-only (never localStorage)
- [ ] `positionScore()` formula is deterministic and tested at boundary cases
- [ ] `winProbabilityDelta` micro-rollouts complete inside per-turn budget
- [ ] Replay Log v2 renders without performance regression on a 25-turn game

### Gate 6 -> v1 ship
- [ ] All 6 voice tests pass
- [ ] Banned-phrasings linter wired into CI
- [ ] RNG gating verified on both fixtures (`rng_dependency` 0.3 vs 0.7)
- [ ] Side-by-side inline-pilot-card screenshot in PR (today vs Phase 6)
- [ ] Phase 4e regression still passes after voice changes (no spec drift)

---

## 6. Risk register

| Risk | Phase | Mitigation |
|---|---|---|
| Solver flapping (same input -> different recommended branch across runs) | 4d | Determinism test + tie-break rule + low-sample guard |
| `Run All` budget overrun on slow laptops | 4d | `budgetMsTotal` ceiling + clipping + low-sample annotation |
| Same-advice regression test passes locally but fails in CI | 4e | Fixed seed in fixtures; no randomness without seed |
| `turnLog` accidentally persisted to localStorage (memory leak / privacy) | 5 | Schema-level guard + lint rule |
| Voice layer cites a number that doesn't exist in any struct | 6 | T6 number provenance test (JSON path lookup) |
| Phase 6 RNG gate violated by an action verb that mentions "lucky" | 6 | T1 banned-phrasings linter |
| Spec drift: detector renamed in 4c but 6 still cites old name | 6 | Cross-reference test reads field names from a single constants file |

---

## 7. Out of scope across all phases

To prevent scope creep, the following are explicitly **not** in the 5 phases above:

- Engine policy upgrade (the AI's move-selection stays single-shot greedy)
- Public sharing / leaderboards
- Cloud-saved sim history (local only)
- Live opponent telemetry (Showdown integration)
- Auto-team-edit suggestions (we surface flaws but never modify the team)
- Mobile-only IN-game overlay (Phase 5 IN template is a stub; full body is post v1)

### Small follow-on (post Phase 6, ~1 day effort)

- **In-page language switcher** (locked 2026-04-25 Q3 of Phase 6): Google Translate Element on the Sources tab or top nav. Source strings remain English; switcher operates on rendered DOM. Falls back to English-only if Google Translate Element is unavailable. Spec stub in `PHASE6_COACHING_VOICE_SPEC.md` Section 12.

---

## 8. What ships at the end of Phase 6 (v1)

Concrete user-visible deliverables when all 5 phases are done:

1. Strategy tab: 5 collapsible sections with confidence-badged data (Phase 4c + 4e)
2. Pilot Guide: per-matchup recommended line + 3 alternatives, classified (Phase 4d)
3. Replay Log v2: turn-by-turn with `positionScore` chart (Phase 5)
4. Inline pilot card v2: PRE before sim, POST after, citation-required wording (Phase 6)
5. STATIC ADVICE WARNING: red banner if detectors stop changing
6. CI: 4 new test files, ~30 new tests, all required for merge

---

## 9. Credit / cost awareness

User constraint (verbatim, binding): *"try keep aware how many credit we use because get low want do this phase on budget without affixing anything."*

Credit-saving guardrails for every phase implementation PR:

- Single-shot edits via `write` / `edit` (avoid agent re-reads)
- One PR per phase (not per sub-feature)
- No deploys until phase is fully validated; deploy = one push at end of phase, not per commit
- Headless tests run locally first; CI is the second pass, not the first
- No `wide_research`, no `browser_task` for spec-only or bug-only PRs
- Subagents only when strictly necessary (e.g. wide test fixture generation)
- `node --check` instead of full bundle rebuild for quick syntax checks

These rules apply across all 5 phases and should be repeated in each PR description.

---

## 10. Sub-skills cross-reference (the user's North Star)

Every phase pulls from the canonical north star (`COACHING_NORTH_STAR.md` Section 2). This table maps north-star sections to the phase that owns them.

| North-star section | Owning phase |
|---|---|
| N§1 win-rate citation in voice | 6 |
| N§2 always-cite-evidence | 6 |
| N§3 best response not best lead | 4d |
| N§4 repeated failure pattern | 4c + 4e |
| N§5 data-cited coaching | 6 |
| N§6 dead move / lead / loss-condition detectors | 4c |
| N§7 line classification | 4d |
| N§8 confidence in language (light) | 4c |
| N§9 confidence badge UI + advice changes | 4c + 4e |
| N§10 PRE/IN/POST output structure | 6 |
| N§11 voice tone | 6 |
| N§12 inline pilot card v2 | 6 |
| N§13 hard invariants (no draws, same-advice = failing) | 4e + 6 |

---

## 11. Locked decisions summary (from `@alfredocox` review 2026-04-25)

All 19 open questions across the 4 specs were answered in the staging review. Quick lookup:

### Phase 4c
- Q1: Include Coverage & Roles section (5 sections total)
- Q2: Flag count=0 moves (severity low if n >= 25)
- Q3: Inline + section summary confidence badges
- Q4: 'Insufficient data' placeholder when n < 5

### Phase 4d
- Q1: Bring-swap only for `aggressive` branch (no item changes)
- Q2: Co-recommend when 2+ branches tie at `strong`
- Q3: Phase 4c data first, TEAM_META fallback for `counter` branch
- Q4: Hide consistency_score numbers (classification + tooltip only)
- Q5: Background re-queue clipped matchups via `requestIdleCallback`

### Phase 4e
- Q1: Banner only, no auto-issue
- Q2: Fixed seed for T5 regression test
- Q3: Soft yellow 'stabilized' banner for legitimate stable teams
- Q4: Live UI at 50, regression test at 100 (two-threshold model)
- Q5: Aggregated v1, per-mon v2 for fake-good play attribution

### Phase 6
- Q1: Inline soft 400 / hard 1000 words; PDF no cap; truncation links to PDF
- Q2: IN template stub only in Phase 6, full body in Phase 5
- Q3: English source v1; in-page Google Translate switcher as small follow-on
- Q4: One canonical voice, no toggle
- Q5: Fall back to TEAM_META + '(no game history yet)' prefix

Full rationale lives in each spec's "Locked decisions" table.

---

## 12. Cross-references

- `PHASE4_DYNAMIC_ADVICE_SPEC.md` - the parent spec for Phases 4c/4d/4e
- `PHASE4C_DETECTORS_SPEC.md`
- `PHASE4D_THREAT_RESPONSE_SPEC.md`
- `PHASE4E_POLICY_AUDIT_SPEC.md`
- `PHASE5_TURN_LOG_SPEC_DRAFT.md`
- `PHASE6_COACHING_VOICE_SPEC.md`
- `COACHING_NORTH_STAR.md` - the standing brief
- `MASTER_PROMPT.md` - the canonical agent prompt + storage keys + invariants
