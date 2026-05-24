# Pokémon Champion 2026 — Product Roadmap

> **Battle-tested. Always evolving.**
> Live App: [htmlpreview bundle](https://htmlpreview.github.io/?https://raw.githubusercontent.com/alfredocox/Pokemon-Champions-Sim-Planner/main/poke-sim/pokemon-champion-2026.html) | [GitHub Pages](https://alfredocox.github.io/Pokemon-Champions-Sim-Planner/)
> **Last updated:** 2026-05-16 | **Baseline:** Battle Sensei R1 + Battle IQ R1

---

## Milestone Index

| # | Milestone | Status | Gate Issue |
|---|---|---|---|
| M1 | Engine Truth | 🟡 83% (19/23) | #140 test coverage |
| M7 | Architecture Foundation | 🟡 In Progress | #78 namespace next |
| M9 | Observability & QA | 🟡 In Progress | CI ✅ live · #89 logger next |
| M2 | Dynamic Strategy Coach | 🟡 Partial | #141 classifier |
| M3 | Piloting Analytics | 🔴 Open | #142, #143 |
| M5 | Tournament Packet | 🔴 Open | #57 parent |
| M4 | Community & Sharing | 📝 Needs issue refresh | M3 gate |
| M6 | Polish & Launch | 🔴 Open | M1–M5 gate |
| M8 | Profile & Sync | 🟡 Unblocked | Supabase ✅ live |
| M10 | Performance & Quality | 🟡 Partial | #92, #93, #94 |
| M11 | Advanced Features | ⏳ Deferred | M8 gate |
| M12 | Battle Sensei | 🧪 R1/R2 MVP started | Stage 3 credibility gate |
| M13 | Meta Stress Lab | 📝 Planned | Source-labeled meta + legal stress testing |
| M14 | Launch Security & Premium Access | 🧱 Final Gate | #208 parent |

---

## ⛔ P0 — Blockers (Resolve Immediately)

| # | Issue | Owner | Required Action |
|---|---|---|---|
| **#147** | Ko-fi account missing | @alfredocox | Create `ko-fi.com/alfredocox` before merging PR #146 |

> ✅ **#87 CLOSED** — `ci.yml` live 2026-04-30 (commit `4f9579d`). Branch protection on `main` confirmed. Sprint 1 unblocked.
> ✅ **#158 CLOSED** — Supabase confirmed live. Current repo seed target: 26 teams and 156 canonical team_members.

---

## Current Product Direction

The product is now centered on a coaching intelligence loop:

1. **Sim Mode** tests what the team can do.
2. **Strategy** explains the team plan from sim data.
3. **Battle Sensei** explains what the player actually did from Showdown logs.
4. **Battle IQ** scores observable decision quality with confidence labels.
5. **Profile/DB** stores durable memory, trends, privacy-safe aggregate signals, and premium personalization.
6. **Meta Stress Lab** challenges the build with source-labeled meta snapshots and legal stress scenarios.
7. **Launch Security & Premium Access** is the final gate after the product, sim engine, data, DB, mobile UX, coaching, and deployment workflows are proven.

Near-term work should protect this sequence. Meta Stress Lab is valuable, but it should not jump ahead of evidence cleanup, sim-feedback packets, and persistence/privacy foundations.
Launch security is a parallel readiness lane, not the next thing to ship publicly. Keep GitHub Pages for the static demo while issues are being closed, but do not call this launched until M1/M2/M3/M7/M8/M9/M10/M12/M13 are validated and M14 passes. Premium login, payment, webhooks, rate limits, and private coaching memory must sit behind a server-capable host before paid launch.

## Current Execution Order

| Order | Issue | Why Next |
|---|---|---|
| Done | #201 Align Strategy coaching with Battle Sensei evidence standards | Closed after Strategy adopted the Battle Sensei evidence vocabulary. |
| Done | #194 Sim Feedback Packet | Closed after Battle Sensei began emitting replay-derived calibration signals without auto-mutating models. |
| 1 | #195 Replay persistence schema + privacy controls | Defines what can be saved, what stays local, and raw-log boundaries. |
| 2 | #197 Supabase replay schema migration | Implements the DB layer after privacy rules are explicit. |
| 3 | #198 Battle IQ profile schema + norm groups | Enables premium Battle IQ history and matched comparisons. |
| 4 | #199 Opt-in aggregate learning signals | Enables aggregate coaching while protecting users. |
| 5 | #200 Replay-to-sim calibration scenario queue | Bridges Battle Sensei logs into future Meta Stress Lab scenarios. |
| 6 | #203 M13 meta snapshot schema | Starts Meta Stress Lab after the evidence and DB loop is clear. |

Recommended next implementation issue: **#195**.

Parallel launch-readiness issue: **#208**. This should not block local Battle Sensei engine work, but it must be the last launch gate before public premium launch.

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
| #165 | Phase 4c: Archetype detectors | @TheYfactora12 | M2 | ✅ CLOSED |
| #166 | Phase 4d: Threat-response matrix | @TheYfactora12 | M2 | ✅ CLOSED |
| #167 | Phase 4e: Policy audit layer | @TheYfactora12 | M2 | ✅ CLOSED |
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
| #168 | Phase 5: Turn log (VGC-authentic) | @TheYfactora12 | M2 — ✅ CLOSED |
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
| #169 | Phase 6: Coaching voice + tone layers | @TheYfactora12 | M2 — ✅ CLOSED |

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
| TBD | Share team link (hash-based) | P2 |
| TBD | Team export to Pokémon Showdown | P2 |
| TBD | Embed widget (iFrame) | P3 |
| TBD | Social preview card generator | P3 |

> Issue numbers #62-#65 are no longer Community & Sharing tickets in GitHub. They now track meta-ingestion and threat-radar work and are superseded by M13 where appropriate.

---

## Backlog — Polish & Launch (M6)

| # | Issue | Priority |
|---|---|---|
| #66 | First-run onboarding tour | P3 |
| #67 | Accessibility full audit | P3 |
| #68 | Performance budget v2.0 | P3 |
| #69 | Usage docs and screencast walkthrough | P3 |
| #70 | v2.0 release notes and announcement | P3 |

---

## Backlog — Advanced Features (M11, Post-M8)

| # | Issue | Priority |
|---|---|---|
| #97 | Replay shortlink | P3 |
| #98 | Multi-team compare | P3 |
| #99 | Live team fingerprinting | P3 |

---

## Backlog — Battle Sensei (M12, Stage 3 Credibility)

> Product line: Sim Mode builds the team. Battle Sensei builds the player. Learn why the turn went wrong.
> Canonical spec: [`poke-sim/docs/SHOWDOWN_REPLAY_COACH_SPEC.md`](./poke-sim/docs/SHOWDOWN_REPLAY_COACH_SPEC.md)
> Battle IQ spec: [`poke-sim/docs/BATTLE_IQ_SPEC.md`](./poke-sim/docs/BATTLE_IQ_SPEC.md)

| Issue | Priority |
|---|---|
| #187 | Parent tracker: Battle Sensei + Sim Intelligence | P1 |
| #188 | Battle Sensei UI shell: paste/upload log, side select, review mode | ✅ CLOSED |
| #189 | Showdown parser MVP: players, turns, leads, moves, switches, faints, winner | ✅ CLOSED |
| #190 | Replay summary + readable turn timeline | ✅ CLOSED |
| #191 | Core replay coaching rules: lead, bring-four, speed-control, Protect, targeting, switching | ✅ CLOSED |
| #192 | Critical turn engine: first mistake, fatal mistake, biggest swing | ✅ CLOSED |
| #193 | Sim comparison card: sim lead/four/path vs actual replay lead/four/path | ✅ CLOSED |
| #194 | Sim Feedback Packet for replay-calibrated coaching signals | ✅ CLOSED |
| #198 | Battle IQ profile schema + norm groups | P2 |
| #199 | Opt-in aggregate learning signals | P2 |
| #200 | Replay-to-sim calibration scenario queue | P2 |
| #201 | Align Strategy coaching with Battle Sensei evidence standards | ✅ CLOSED |
| #195 | Replay persistence schema + explicit raw-log privacy controls | P2 |
| #196 | Multi-log Player Pattern Dashboard | P2 |
| #197 | Supabase replay schema migration | P2 |

## Backlog — Meta Stress Lab (M13, Build Challenge)

> Product line: Sim Mode builds the team. Battle Sensei builds the player. Meta Stress Lab challenges the build.
> Canonical spec: [`poke-sim/docs/META_STRESS_LAB_SPEC.md`](./poke-sim/docs/META_STRESS_LAB_SPEC.md)

| Issue | Priority |
|---|---|
| #202 | Parent tracker: Meta Stress Lab + Build Challenge Coach | P2 |
| #203 | Meta snapshot schema and source-labeled top usage loader | P2 |
| #204 | Constrained legal set generator for observed sets, role templates, and mutations | P2 |
| #206 | Stress Test Matrix for doubles and singles scenario queues | P2 |
| #205 | Strategy integration: replace static threat radar and upgrade `csStressTest()` with scenario-backed findings | P2 |
| #207 | Premium aggregate pattern suggestions for possible team changes | P2 |
| #200 | Battle Sensei integration: replay-derived stress scenarios and sim calibration signals | P3 |

## Backlog — Launch Security & Premium Access (M14, Final Launch Gate)

> Product line: Free users get immediate local coaching value. Premium users unlock durable memory, saved profiles, trend history, Battle IQ growth, and personalized coaching.
> Hosting direction: GitHub Pages is acceptable for the static free demo. A custom domain is recommended for public trust. Premium auth, payment webhooks, entitlement checks, rate limits, and private coaching memory require a server-capable deployment layer such as Vercel, Netlify, Cloudflare Pages/Workers, or a small backend service.
> Gate rule: M14 comes last. It should verify the finished product surface, not hide unfinished core issues behind hosting or payment work.

| Issue | Priority |
|---|---|
| #208 | Parent tracker: launch security, premium access, and deployment hardening | P2 |
| #209 | Auth/login and premium profile entitlement model | P2 |
| #210 | Payment checkout and entitlement verification | P2 |
| #211 | Free vs premium coaching boundary and upgrade UX | P2 |
| #212 | Supabase security, privacy, and RLS audit for coaching data | P2 |
| #213 | Deployment hardening, cache safety, and abuse protection | P2 |

Final launch exit criteria:

- All current P1/P2 engine, data, coaching, mobile, DB, and build issues are closed or explicitly deferred with product-owner approval.
- Battle Sensei, Strategy, Battle IQ, Meta Stress Lab, and replay persistence agree on evidence/confidence language.
- Free/local mode works without login and does not silently save raw logs.
- Premium saved profile paths are protected by auth, RLS, server-verified entitlements, and deletion/export policy.
- Payment webhooks, entitlement checks, and abuse/rate limits are server-side.
- GitHub Pages or the selected production host is deployable from CI, with cache/service-worker behavior validated on mobile Safari.
- Custom domain and launch smoke checklist are complete before public announcement.

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
| **M12 Battle Sensei** | Parse Showdown logs, diagnose real player decisions, compare replay paths to sim plans, and produce replay-calibrated coaching signals. |
| **M13 Meta Stress Lab** | Source-labeled meta snapshots, legal set templates, and targeted stress scenarios that challenge the team without pretending synthetic data is live usage truth. |
| **M14 Launch Security & Premium Access** | Final public/premium launch gate: deployment hardening, login, server-verified premium entitlements, Supabase RLS/privacy, rate limits, cache safety, custom-domain readiness, and launch smoke validation after core issues/builds are complete. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES2020+), HTML5, CSS3 — static PWA, no framework |
| Offline | Service Worker — `champions-sim-v6-wire-storage-adapter` |
| Persistence | localStorage (offline) + Supabase PostgreSQL (cloud, M8) |
| Database | Supabase — 8 tables, RLS enabled, seed SQL aligned to **26 teams** ✅ |
| Bundle | `pokemon-champion-2026.html` (~1.33 MB, single-file artifact) |
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
| `SHOWDOWN_REPLAY_COACH_SPEC.md` | Stage 3 Battle Sensei | 🧪 R1/R2 MVP started |
| `BATTLE_IQ_SPEC.md` | Stage 3 Battle Sensei scoring | 🧪 R1 shipped |
| `PHASE_ROLLOUT_REVIEW.md` | All | 📋 Review |
| `COACHING_NORTH_STAR.md` | All | ⭐ Reference |
| `META_STRESS_LAB_SPEC.md` | M13 Meta Stress Lab | 📝 Planned |

---

*© 2026 Alfredo Cox (@alfredocox) and Kevin Medeiros (@TheYfactora12). All Rights Reserved.*
*Pokémon IP attribution: see `NOTICE.md`. Canonical tagline: "Battle-tested. Always evolving."*
