# Pokémon Champion 2026 — Product Roadmap

> **Battle-tested. Always evolving.**
> Live App: [htmlpreview bundle](https://htmlpreview.github.io/?https://raw.githubusercontent.com/TheYfactora12/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html) | [GitHub Pages](https://theyfactora12.github.io/Pokemon-Champions-Sim-Planner/)
> **Last updated:** 2026-06-19 | **Baseline:** simulation-truth gate active; `npm run test:fast` green on current Showdown DB review branch

---

## Current Direction Override - 2026-06-06

Simulation truth is the active product gate. New coaching, premium, Battle IQ, Coach Recommends, and replay-derived claim work is paused until the simulator is accurate enough to safely support those claims.

Active order:

1. Align both repos through PR + CI.
2. Prove battle mechanics and turn logs against strict tests.
3. Wire Showdown-mirrored data plus Champions overrides as the source-of-truth path.
4. Add release gates for unresolved high-severity drift.
5. Resume coaching expansion only after the sim-truth gate is green.

Current direction doc: [`docs/release/SIMULATION_FIRST_REALIGNMENT_2026-06-06.md`](docs/release/SIMULATION_FIRST_REALIGNMENT_2026-06-06.md).

Older coaching-first roadmap items remain useful product research, but they are not the active build priority until this gate passes.

---

## Milestone Index

| # | Milestone | Status | Gate Issue |
|---|---|---|---|
| M1 | Engine Truth | 🟡 83% (19/23) | #140 test coverage |
| M7 | Architecture Foundation | 🟡 In Progress | #78 namespace next |
| M9 | Observability & QA | 🟡 In Progress | CI ✅ live · #89 logger next |
| M2 | Dynamic Strategy Coach | 🔴 Open | #141 classifier |
| M3 | Piloting Analytics | 🔴 Open | #142, #143 |
| M5 | Tournament Packet | 🔴 Open | #57 parent |
| M4 | Community & Sharing | 🔴 Open | M3 gate |
| M6 | Polish & Launch | 🔴 Open | M1–M5 gate |
| M8 | Profile & Sync | 🟡 Unblocked | Supabase ✅ live |
| M10 | Performance & Quality | 🟡 Partial | #92, #93, #94 |
| M11 | Advanced Features | ⏳ Deferred | M8 gate |

---

## ⛔ P0 — Blockers (Resolve Immediately)

| # | Issue | Owner | Required Action |
|---|---|---|---|
| **#147** | Ko-fi account missing | @alfredocox | Create `ko-fi.com/alfredocox` before merging PR #146 |

> ✅ **#87 CLOSED** — `ci.yml` live 2026-04-30 (commit `4f9579d`). Branch protection on `main` confirmed. Sprint 1 unblocked.
> ✅ **#158 CLOSED** — Supabase confirmed live. Current canonical seed alignment verified 2026-05-24: 8 tables, RLS enabled, 25 teams seeded, 150 canonical team_members loaded.

---

## Sprint 1 — Foundation

> **Gate:** All items here must ship before any Sprint 2 code merges.

| # | Issue | Owner | Milestone | Status |
|---|---|---|---|---|
| #87 | GitHub Actions CI (ROOT NODE) | @alfredocox | M9 | ✅ **CLOSED** |
| #78 | Namespace `window.ChampionsSim` | @alfredocox | M7 | 🔴 Open |
| #138 | `data.js` placeholder guard (T9j.18 §A) | @Jdoutt38 | M1 | 🔴 Open |
| #149 | Unit tests for `classifyPokemon()` | @Jdoutt38 | M1 | 🔴 Open |
| #150 | Stat panel HTML markup | @Josh | M3 | 🔴 Open |
| #151 | `CONTRIBUTING.md` | @Josh | M7 | 🔴 Open |

---

## Sprint 2 — Classifier + Role Engine

> **Gate:** Sprint 1 complete.

| # | Issue | Owner | Milestone | Priority |
|---|---|---|---|---|
| #141 | **`classifyPokemon()` 7-role classifier** | @TheYfactora12 | M2 | P1 — critical path |
| #142 | Stat panel (EVs/IVs/Nature display) | @TheYfactora12 | M3 | P1 |
| #143 | Bug: lead-selector highlight in Auto mode | @TheYfactora12 | M3 | P1 |
| #165 | Phase 4c: Archetype detectors | @TheYfactora12 | M2 | P1 |
| #166 | Phase 4d: Threat-response matrix | @TheYfactora12 | M2 | P2 |
| #167 | Phase 4e: Policy audit layer | @TheYfactora12 | M2 | P2 |
| #140 | T9j.18 status immunity tests | @Jdoutt38 | M1 | P2 |
| #139 | T9j.18 mirror-match hard assertion | @Jdoutt38 | M1 | P2 |
| #80 | TDZ lazy-init crash risk | @alfredocox | M7 | P2 |
| #89 | Structured logger | @alfredocox | M9 | P2 |
| #94 | XSS innerHTML audit | @alfredocox | M10 | P2 |

---

## Sprint 3 — Module Split

> **Gate:** #77 (split `ui.js`), #78, #80, #89 all closed.

| # | Issue | Owner | Milestone |
|---|---|---|---|
| #77 | Split `ui.js` into feature modules | @alfredocox | M7 |
| #84 | Schema versioning for localStorage | @alfredocox | M8 |
| #90 | Performance profiling harness | @alfredocox | M9 |
| #92 | Memoize `buildStrategyReport()` | @alfredocox | M10 |
| #93 | Cap battle-log array size | @alfredocox | M10 |
| #96 | Focus management NVDA/VO audit | @alfredocox | M10 |
| #168 | Phase 5: Turn log (VGC-authentic) | @TheYfactora12 | M2 |
| #53 | Lead pair win-rate table | @TheYfactora12 | M3 |
| #54 | Suboptimal decision flagger | @TheYfactora12 | M3 |
| #55 | Personal weakness dashboard | @TheYfactora12 | M3 |
| #56 | Head-to-head delta tracking | @TheYfactora12 | M3 |
| #72 | Pilot confidence score overlay | @TheYfactora12 | M3 |

---

## Sprint 4 — Profile & Sync

> **Gate:** Sprint 3 complete. Supabase already live ✅ — no additional setup required.

| # | Issue | Owner | Milestone |
|---|---|---|---|
| #81 | Player profile schema | @alfredocox | M8 |
| #82 | Cloud sync (Supabase) | @alfredocox | M8 |
| #83 | Cross-device import/export | @alfredocox | M8 |
| #85 | Cross-device sync (live) | @alfredocox | M8 |
| #86 | Profile badge system | @alfredocox | M8 |
| #91 | localStorage migration runner | @alfredocox | M8 |
| #169 | Phase 6: Coaching voice + tone layers | @TheYfactora12 | M2 |

---

## Backlog — Tournament Packet (M5)

| # | Issue | Priority |
|---|---|---|
| #57 | Tournament packet PDF generator (parent) | P2 |
| #58 | Per-matchup page template | P2 |
| #59 | Cover page + appendices | P3 |
| #60 | Compact mobile layout | P3 |
| #61 | Packet Preview tab | P3 |

## Backlog — Battle Sensei Player-Learning Expansion

These items define the coaching flow needed to turn sim and replay evidence into player-useful decisions. They remain gated by simulation truth and evidence confidence.

| Item | What it teaches | Required data |
|---|---|---|
| Lineup Matrix Report | Best roster subset for BO1/BO3/BO5 | registered six, format, series format, all legal lineup combos, scored/evaluated lineups |
| Lead Matrix Report | Best opener and what it answers | selected lineup, opponent lead, turn-one board, speed order, field state |
| Move Tree Turning-Point Report | Better move/target/protect/switch on the critical turn | legal options, actual actions, targets, damage/effect events, post-turn position score, alternative branch scores |
| Speed-Control Payoff Interpreter | Whether Tailwind, Trick Room, Icy Wind, and priority created advantage, got neutralized, or reversed the opponent plan | turn-by-turn speed moves, TR/Tailwind state, natural speed order, KOs/damage within T+3, position-score delta |
| Switch and Preservation Report | When to pivot, sacrifice, or preserve the win condition | roster state, HP, field state, speed order, threats, win-condition role |
| Decision Opportunity Ledger | Denominator-based coaching: how many meaningful decisions existed and how many were executed correctly | decision nodes, category, outcome quadrant, positive/negative notes, score contribution |
| Loss Cause Classifier | Why the player lost | result, turning point, issue tags, position-score path, key KOs/field events |
| Practice Drill Generator | What to practice next | repeated mistake pattern, confidence, matchup context, recommended correction |

Required loss-cause labels:

- lineup choice
- lead choice
- move choice
- target choice
- switch timing
- speed control
- resource trade
- variance
- matchup disadvantage

Current alignment note:

- `#223` is the foundation layer: speed-control state interpretation plus deferred payoff checks. It prevents false negatives like penalizing Trick Room when it correctly reverses Tailwind.
- `#224` comes after `#223`: the Decision Opportunity Ledger should score opportunities only after the tactical interpreter can classify speed-control contests correctly.
- Later items remain: move-tree alternatives, target-choice comparison, switch/preservation logic, lineup/lead matrix ranking, and practice drill generation from repeated patterns.

---

## Backlog — Community & Sharing (M4)

| # | Issue | Priority |
|---|---|---|
| #62 | Share team link (hash-based) | P2 |
| #63 | Team export to Pokémon Showdown | P2 |
| #64 | Embed widget (iFrame) | P3 |
| #65 | Social preview card generator | P3 |

---

## Backlog — Polish & Launch (M6)

| # | Issue | Priority |
|---|---|---|
| #66 | VGC format calendar integration | P3 |
| #67 | Accessibility full audit | P3 |
| #68 | Performance budget v2.0 | P3 |
| #69 | Keyboard shortcuts | P3 |
| #70 | Dark mode override toggle | P3 |

### M6 Release Track — Public Site, Security, and Revenue Readiness

This is the concrete release path for turning the simulator into a trustworthy public site. Core battle truth ships through reviewed code and deterministic generated artifacts. Supabase may store the audited Showdown mirror, Champions overrides, users, saved teams, replays, subscriptions, notes, and operational metadata, but the public app should consume only approved views or generated release assets.

Current public-release plan: [`docs/release/PUBLIC_RELEASE_MILESTONE_PLAN_2026-06-06.md`](docs/release/PUBLIC_RELEASE_MILESTONE_PLAN_2026-06-06.md).

| Step | What | Why | Owner | Exit Criteria | When |
|---|---|---|---|---|---|
| M6.1 | Stable public site on GitHub Pages or equivalent static host | Give users one canonical URL for the known-good build | Kevin | `main` deploy is live, HTTPS works, bundle loads, mobile smoke passes | Before public sharing |
| M6.2 | Security baseline for site and data flows | Prevent avoidable release mistakes before real users arrive | Kevin + engineering | Secrets not exposed in client bundle, Supabase keys scoped correctly, RLS reviewed, no unsafe admin paths in browser code | Before accounts or payments |
| M6.3 | Release gates and rollback path | Avoid shipping broken simulator logic or stale bundles | Engineering | CI green, bundle freshness green, heartbeat green, rollback steps documented, previous stable build recoverable | Before every release |
| M6.4 | Trust UX for sim confidence | Do not fake confidence on partially modeled mechanics | Engineering + product | UI can distinguish verified / baseline / incomplete move support and legality warnings remain visible | Before paid coaching claims |
| M6.5 | Free public core experience | Grow usage before monetization | Kevin + product | Public users can sim, import teams, review replays, and get basic Battle Sensei output without account friction | First public launch |
| M6.6 | Donations layer | Allow early supporters to fund hosting and iteration without gating core utility | Kevin | Donation link/page live with clear disclaimer that donations do not affect simulator truth | After stable public launch |
| M6.7 | Account + saved history layer | Support retention and premium workflow without moving battle truth into DB | Engineering | Users can save teams, replays, notes, and history in Supabase with RLS | After launch stability |
| M6.8 | Premium subscription layer | Monetize repeat value, not basic correctness | Kevin + product | Premium features are scoped to history, deeper analysis, and workflow convenience rather than core sim access | After free adoption signal |
| M6.9 | Human coaching offer | Turn software usage into higher-value expert service | Kevin / Josh / Alfredo as assigned | Coaching flow is separate from simulator truth and clearly labeled as human review | After replay trust layer is proven |

### M6 Security Checklist

- Keep canonical mechanics behavior in reviewed code, with generated data artifacts produced from approved Showdown mirror rows plus Champions overrides.
- Keep Supabase for audited Showdown mirror data, Champions overrides, users, saved teams, replays, subscriptions, notes, and operational metadata.
- Do not make browser runtime reads from raw battle-truth tables; expose approved views or ship generated release assets.
- Require green CI, bundle freshness, cache bump, and daily heartbeat before release promotion.
- Verify GitHub Pages or host config uses HTTPS and only serves the merged `main` bundle.
- Audit client-visible keys and environment wiring so browser code only gets intentionally public values.
- Review Supabase RLS and roles before enabling accounts, saved history, or subscriptions.
- Keep a rollback path: last known-good bundle SHA, previous release note, and restore steps.

### M6 Roles

- Kevin: product owner, release approval, public messaging, monetization sequencing.
- Engineering repo owner: battle-truth changes, CI gates, bundle/build integrity, release rollback readiness.
- Josh: workbook/data review, trust-layer QA, pre-release spot checks.
- Alfredo mirror repo owner: mirror validation and parity once the source repo release is stable.

---

## Backlog — Advanced Features (M11, Post-M8)

| # | Issue | Priority |
|---|---|---|
| #97 | Replay shortlink | P3 |
| #98 | Multi-team compare | P3 |
| #99 | Live team fingerprinting | P3 |

---

## Milestone Definitions

| Milestone | Definition |
|---|---|
| **M1 Engine Truth** | All battle-sim math is auditable, tested, reproducible. 343+ test cases pass. |
| **M2 Dynamic Strategy Coach** | `classifyPokemon()` + Phase 4c/d/e detectors + Phase 5 turn log + Phase 6 coaching voice — one coherent coaching layer. |
| **M3 Piloting Analytics** | Stat panel, lead pair table, weakness dashboard, decision flagger, confidence overlay all live. |
| **M4 Community & Sharing** | Users can share teams and replays externally. |
| **M5 Tournament Packet** | Full tournament-ready PDF: per-matchup pages, cover, mobile layout. |
| **M6 Polish & Launch** | Public site, security baseline, trust UX, launch gates, donations/accounts/subscription sequencing — public launch quality. |
| **M7 Architecture Foundation** | Namespace, `ui.js` module split, TDZ safety, CI/CD all operational. |
| **M8 Profile & Sync** | Per-user profiles, Supabase cloud sync, cross-device support. Supabase layer already live. |
| **M9 Observability & QA** | Structured logger, CI workflows, performance profiling harness. |
| **M10 Performance & Quality** | Memoization, log caps, XSS audit, NVDA/VO focus management — measurable gains. |
| **M11 Advanced Features** | Replay shortlinks, multi-team compare, live fingerprinting. Post-M8 only. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES2020+), HTML5, CSS3 — static PWA, no framework |
| Offline | Service Worker — current cache `champions-sim-v49-approved-showdown-db` |
| Persistence | localStorage (offline) + Supabase PostgreSQL (cloud, M8) |
| Database | Supabase — app DB live; current repo target is 29 canonical teams plus staged Showdown sync/entity/approved-view migrations |
| Bundle | `pokemon-champion-2026.html` single-file artifact |
| CI/CD | GitHub Actions — CI ✅ + Bundle Freshness ✅ + Cache Bump ✅ (3 workflows active) |
| Hosting | GitHub Pages (`theyfactora12.github.io/Pokemon-Champions-Sim-Planner`) |
| Tests | Vanilla JS runner — current fast suite plus focused Showdown DB/runtime tests; live DB suites are opt-in |

---

## Spec Documents

All spec files live in [`poke-sim/docs/`](./poke-sim/docs/).

| File | Phase | Status |
|---|---|---|
| `PHASE4_DYNAMIC_ADVICE_SPEC.md` | 4 | ✅ Final |
| `PHASE4C_DETECTORS_SPEC.md` | 4c | ✅ Final |
| `PHASE4D_THREAT_RESPONSE_SPEC.md` | 4d | ✅ Final |
| `PHASE4E_POLICY_AUDIT_SPEC.md` | 4e | ✅ Final |
| `PHASE5_TURN_LOG_SPEC_DRAFT.md` | 5 | 📝 Draft |
| `PHASE6_COACHING_VOICE_SPEC.md` | 6 | ✅ Final |
| `PHASE_ROLLOUT_REVIEW.md` | All | 📋 Review |
| `COACHING_NORTH_STAR.md` | All | ⭐ Reference |

---

*© 2026 Alfredo Cox (@alfredocox) and Kevin Medeiros (@TheYfactora12). All Rights Reserved.*
*Pokémon IP attribution: see `NOTICE.md`. Canonical tagline: "Battle-tested. Always evolving."*
