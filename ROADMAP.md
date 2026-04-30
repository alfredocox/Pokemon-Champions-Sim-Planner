# Pokémon Champion 2026 — Product Roadmap

> **Battle-tested. Always evolving.**
> Live App: [htmlpreview bundle](https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html) | [GitHub Pages](https://alfredocox.github.io/Pokemon-Champions-Sim-Planner/)
> **Last updated:** 2026-04-30 | **Baseline:** T9j.17 (343 tests · 5,070 battles/audit)

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
> ✅ **#158 CLOSED** — Supabase confirmed live 2026-04-30: 8 tables, RLS enabled, 22 teams seeded, 210 team_members loaded.

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
| **M6 Polish & Launch** | Performance, accessibility, keyboard nav, dark mode — public launch quality. |
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
| Offline | Service Worker — `champions-sim-v6-wire-storage-adapter` |
| Persistence | localStorage (offline) + Supabase PostgreSQL (cloud, M8) |
| Database | Supabase — 8 tables, RLS enabled, **22 teams / 210 team_members seeded** ✅ |
| Bundle | `pokemon-champion-2026.html` (710 KB, single-file artifact) |
| CI/CD | GitHub Actions — CI ✅ + Bundle Freshness ✅ + Cache Bump ✅ (3 workflows active) |
| Hosting | GitHub Pages (`alfredocox.github.io/Pokemon-Champions-Sim-Planner`) |
| Tests | Vanilla JS runner — 343 cases (T9j.17 baseline), 5,070 battles/audit |

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
