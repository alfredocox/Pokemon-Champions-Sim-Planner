# Pokemon Champions Sim — Product Roadmap (DRAFT for approval)

**Author role:** PM + Product Developer hat
**Status:** M1-M6 live on GitHub. M7-M11 infrastructure milestones added April 24 with 23 issues filed (#77-#99).
**Last updated:** 2026-04-24 (post-T9j.16 + infra audit)

---

## Product Vision

A competitive VGC simulator that does three things no other tool does together:

1. **Engine truth** — battle mechanics accurate enough that outcomes match real Champions tournament results within a tight tolerance.
2. **Dynamic coach** — recommendations that adapt to YOUR team, not generic matchup notes. Lead pair suggestions, win conditions, risks and mistakes, all computed from YOUR build vs. the live meta.
3. **Tournament-ready** — a single PDF packet you can print, carry, and use day-of: every matchup, every best-start, every risk, every mistake-to-avoid, indexed.

Plus a personal learning loop: track YOUR sim history, surface trends, point out your weak spots, and tighten the loop every session.

---

## Milestone Structure

Six outcome-based milestones, each with a user-facing goal, ship criteria, and the tickets that land under it. Existing open issues (#7–#36) are mapped in. New tickets are prefixed `NEW:` and will be filed at milestone creation time.

Milestones are **sequential** — each depends on the one before. Engine truth first, because dynamic coaching and analytics are only worth shipping on a correct engine.

---

## M1 — Engine Truth (v1.0)

**Outcome:** Every core Champions mechanic matches a cited primary source. Engine passes a 40-case golden regression pack before any new feature lands.

**Ship criteria:**
- 40/40 golden tests pass (includes: damage formula, spread reduction, Mega trigger, status stacking, item interactions, crits, Tera)
- 0 JS errors across a 5,000+ battle audit
- Every mechanic change cited in `CHAMPIONS_MECHANICS_SPEC.md`

**Tickets:**
- **T9j.7 Dynamic Mega Evolution** — closes #23 *(in progress, draft awaiting approval)*
- **T9j.4 Status Effects Phase 2** — Poison/Toxic/Freeze/Frostbite + Hail/Snow residuals — closes #17 (sleep), new Poison/Freeze tickets
- **T9j.5 Champions Status Rates** — 12.5% paralysis, 3-turn sleep cap, stacking rules — closes #17 + new
- **T9j.6 Item System** — Leftovers (#29), Focus Sash (#8), Choice lock (#18), Booster Energy (#11), Light Clay, Terrain Seed — closes #8 #11 #18 #29
- **T9j.8 Combat RNG & Abilities** — Crits (#27), flinch (#19), ability triggers (#30) — closes #19 #27 #30
- **T9j.9 Terastallization** — full Tera type + damage + defensive effects — closes #7
- **T9j.10 Golden Regression Pack** — 40-case floor, CI-style runner — closes #34
- **NEW: Cofagrigus / Aurora Veil 100% WR bug** — separate engine issue surfaced in T9j.3b audit

---

## M2 — Dynamic Strategy Coach (v1.1)

**Outcome:** Open the sim, pick your team, see coaching that is built FROM your team — not static notes. Lead recommendations, win conditions, risks to worry about, mistakes to avoid, all derived from YOUR build.

**Ship criteria:**
- Lead recommender produces a top-3 lead pair per matchup with cited reasoning (speed, coverage, synergy, pivot)
- Win condition generator writes a 2-3 sentence plan per matchup derived from team roles (setter/sweeper/support/redirect/disruptor)
- Risk card surfaces 3-5 specific threats per matchup (e.g., "Urshifu-Rapid ignores your Intimidate if Unseen Fist")
- Mistakes list surfaces 3-5 common errors for YOUR team shape (e.g., "Don't lead Incineroar vs. Rillaboom — Grassy Glide OHKO risk")

**Tickets (new, to be filed):**
- **NEW: Team Role Classifier** — auto-label each slot as Setter / Sweeper / Support / Pivot / Wincon / Redirect / Disruptor based on moveset + ability + item
- **NEW: Dynamic Lead Recommender** — compute top 3 lead pairs per matchup with reasoning (speed control, coverage, threat answers)
- **NEW: Win Condition Generator** — per-matchup plan narrative from team roles and opposing threats
- **NEW: Risk Card** — surface opposing threats your team has no clean answer to
- **NEW: Mistakes-to-Avoid Generator** — team-shape-aware anti-patterns (lead traps, item traps, speed traps)
- **NEW: Coaching Layer Spec Doc** — pseudocode + citations for all four generators before implementation

---

## M3 — Piloting Analytics (v1.2)

**Outcome:** The sim remembers what YOU did and helps you get better. Session history, decision replay, win-rate by lead pair, personal weakness dashboard.

**Ship criteria:**
- Every sim run persisted locally (IndexedDB) with team, opponent, lead pair, turn-by-turn decisions, outcome
- "My Trends" tab: win rate by lead pair, by matchup, by decision pattern
- Weakness detector: "You lose 70% of Kingambit matchups when leading Incineroar+Garchomp — try Whimsicott+Arcanine"
- Decision replay: walk a past battle turn by turn, flag suboptimal choices

**Tickets (new):**
- **NEW: Session Persistence Layer** — IndexedDB schema for battle history
- **NEW: Trend Dashboard Tab** — replaces/extends Replay Log with analytics
- **NEW: Lead Pair Win-Rate Table** — per team, per matchup
- **NEW: Suboptimal Decision Flagger** — compare user choice to engine's best-move for each turn, surface deltas
- **NEW: Personal Weakness Dashboard** — aggregate deltas into actionable coaching
- **NEW: Export My Data** — JSON dump for users who want their own analytics

---

## M4 — Tournament Ready PDF (v1.3)

**Outcome:** One button produces a tournament packet for YOUR team: cover sheet, per-matchup pages with leads + win condition + risks + mistakes, master matrix, quick-reference cheat sheet. Print once, carry to tournament, ready.

**Ship criteria:**
- Packet generates in <10s for a full 13-team matchup grid
- Mobile-viewable layout (iPad-friendly, 2-column on phone)
- Cover page with team overview + speed tiers + coverage summary
- Per-matchup page: opposing team sprite row, best leads, win condition, key threats, mistakes to avoid, pivot tree
- Appendices: speed tier reference, coverage reference, item cheat sheet

**Tickets (new):**
- **NEW: Tournament Packet PDF Generator** — upgrade existing print-to-PDF into full packet layout
- **NEW: Per-Matchup Page Template** — reusable component for packet + in-app use
- **NEW: Cover Page & Appendices** — speed/coverage/item reference pages
- **NEW: Compact Mobile Layout Mode** — so packet reads on a phone in a tournament hall
- **NEW: Packet Preview Tab** — review before export

---

## M5 — Meta Intelligence (v1.4)

**Outcome:** The sim knows what's trending in live Champions tournaments and factors real usage data into coaching.

**Ship criteria:**
- Weekly meta usage data ingested (top 30 Pokemon, top 10 team archetypes, top 5 lead pairs)
- Threat radar pulls from live data, not hard-coded
- Coaching layer factors meta frequency (e.g., "Kingambit is in 28% of top cut — prioritize this matchup")

**Tickets (new):**
- **NEW: Meta Usage Ingestion** — scheduled fetch of usage stats (source TBD: Victory Road, Limitless, Pikalytics equivalent for Champions)
- **NEW: Archetype Clustering** — group opposing teams by archetype (Sand, Sun, TR, Rain, Veil, Balance)
- **NEW: Counter-Team Recommender** — given your team, suggest tweaks vs. top 5 meta archetypes
- **NEW: Meta-Weighted Threat Radar** — upgrade existing radar to use live data

---

## M6 — Polish & Launch (v2.0)

**Outcome:** Public-ready product. Onboarding, accessibility, performance, docs.

**Ship criteria:**
- New-user onboarding flow (first-run guide)
- WCAG AA contrast across dark theme
- Bundle <400KB, <2s first paint on 4G
- Full docs site (README, USAGE, CONTRIBUTING already shipped)
- Install instructions for iOS, Android, desktop

**Tickets (new):**
- **NEW: First-Run Onboarding Tour**
- **NEW: Accessibility Audit & Fixes** — keyboard nav, screen reader labels, contrast
- **NEW: Performance Budget** — lazy-load non-critical JS, trim data.js
- **NEW: USAGE.md + Screencast**
- **NEW: v2.0 Release Notes**

---

## M7 - Architecture & Modularity (v2.1)

**Outcome:** ui.js (3,872 lines) split into focused modules. No more hidden globals. localStorage centralized. The TDZ landmine on COVERAGE_CHECKS gone.

**Ship criteria:**
- ui.js split into rendering / analytics / persistence / sim-glue modules, each under 1,200 lines
- Zero `window.*` writes outside `window.ChampionsSim` namespace
- Single Storage adapter; all four legacy localStorage key patterns migrated
- COVERAGE_CHECKS lazy-init replaces hoisted-var workaround
- All 343 tests still pass, audit clean

**Tickets:** #77, #78, #79, #80 (all alfredocox)

---

## M8 - Profile & Sync (v2.2) - the headline ask

**Outcome:** Users have profiles. Profiles export to a single file. Multiple profiles for different goals (Tournament / Ladder / Theorymon). Schema versioned for forward compat. Optional cross-device sync via signed URL + PIN. Per-profile coaching rule preferences.

**Ship criteria:**
- Profile schema documented, default profile auto-built from current data with zero loss
- `.champions-profile` export/import round-trips perfectly
- Multi-profile picker with three preset bundles
- Migration runner walks v0 -> vN cleanly
- Sync flow zero-knowledge (PIN-derived AES key); opt-in only
- 17 coaching rules each have toggle + weight slider + difficulty preset

**Tickets:** #81, #82, #83, #84, #85, #86 (TheYfactora12 product, alfredocox migration #84)

---

## M9 - Observability & QA (v2.3)

**Outcome:** GitHub Actions runs every test + audit + bundle freshness on every PR. Structured logging replaces scattered console.log. Analytics surface (buildAnalysisPayload / generatePilotGuide / showInlinePilotCard) finally test-covered. Local opt-in rule telemetry tells us which rules fire most.

**Ship criteria:**
- CI green required on `main`
- Source change without bundle rebuild fails PR
- All 14 console.log sites moved to namespaced logger
- 30+ new test assertions on the analytics layer
- Local-only rule fire counter behind off-by-default toggle

**Tickets:** #87, #88, #89, #90, #91 (alfredocox + Jdoutt38 #90)

---

## M10 - Performance & Quality (v2.4)

**Outcome:** Strategy report memoized. Battle log retention bounded. innerHTML XSS surface audited. Service worker cache bumps every release. Tab navigation works for keyboard and screen reader users.

**Ship criteria:**
- buildStrategyReport second call under 1ms
- 200-line cap per matchup log
- All 35 innerHTML sites classified, hostile-input fixture test passes
- CI rule: source change forces CACHE_NAME bump
- WAI-ARIA Tabs Pattern compliance, NVDA + VoiceOver pass recorded

**Tickets:** #92, #93, #94, #95, #96 (alfredocox + Jdoutt38 #96)

---

## M11 - Advanced Features (v2.5)

**Outcome:** Replay shortlinks, multi-team comparison view, live opponent fingerprinting from partial reveal.

**Ship criteria:**
- Encode/decode round-trip identical sim results
- Compare tab: 2-4 teams x meta gauntlet matrix with heatmap + delta column
- Pilot Guide live-update panel narrows candidates as observed mons added, sub-100ms recompute

**Tickets:** #97, #98, #99 (TheYfactora12)

---

## Proposed Sequencing & Timing

| Milestone | Target | Gate |
|---|---|---|
| M1 Engine Truth | Shipped | 40/40 golden tests, T9j.7-15 done |
| M2 Dynamic Coach | Shipped | T9j.14 + T9j.16 v3 coaching engine live |
| M3 Piloting Analytics | Partial | Replay log live, trends + decision flagger pending |
| M4 Tournament PDF | Shipped | T9j.14 PDF master sheet + T9j.16 Strategy Report sections |
| M5 Meta Intelligence | Pending | Awaiting external data source decision |
| M6 Polish & Launch | Pending | M1-M5 + M7-M10 close first |
| M7 Architecture | Next 2 weeks | Foundation for M8 |
| M8 Profile & Sync | +3 weeks | M7 modules + #84 migration runner |
| M9 Observability | +2 weeks | Run in parallel with M7 |
| M10 Performance & Quality | +2 weeks | After M7 modular split |
| M11 Advanced Features | +3 weeks | After M8 profile container |

M7 and M9 can parallelize. M10 follows M7. M11 follows M8.

---

## Open Decisions

1. **External data source for M5** - any preference for Victory Road, Limitless, or defer sourcing decision until we reach M5?
2. **Sync provider for M8 #85** - Gist (auth friction) vs S3 presigned (we run a tiny serverless) vs defer entirely.
3. **Difficulty preset granularity for M8 #86** - three levels (Beginner / Standard / Expert) is the current proposal; happy to expand.
4. **Bundle size budget** - currently 547KB (above the original M6 < 400KB target). Re-baseline or stay strict?

## Standing Assignment Policy (binding)

- **TheYfactora12** - product / feature scoping, rule design, user-facing capability decisions
- **alfredocox** - engineering refactors, infra, perf, security
- **Jdoutt38** - testing + a11y

All tickets get plain-English explanations. No em-dashes in commit messages.
