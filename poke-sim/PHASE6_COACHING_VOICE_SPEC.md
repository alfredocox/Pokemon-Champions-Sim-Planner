# Phase 6 - Coaching Voice + Output Templates (SPEC)

> **Status:** Ready for review. No code written yet.
> **Author:** Computer (drafted 2026-04-25 for `@alfredocox`)
> **Parent:** `COACHING_NORTH_STAR.md` Section "User-locked decisions" - Voice = direct + grounded + evidence-backed
> **Depends on:** Phase 4c (detector outputs to cite), Phase 4d (`consistency_score` for RNG gating), Phase 5 (per-turn data for IN/POST templates)
> **North-star coverage** (from `COACHING_NORTH_STAR.md` Section 2): N§1, N§2, N§5, N§10, N§11, N§12
> **Acceptance criteria moved** (from `COACHING_NORTH_STAR.md` Section 3): #2 (every recommendation cites evidence), #5 (data-cited coaching), #6 (advice changes after 100 sims - via wording diff)

---

## 1. Why Phase 6

Phases 4c/4d/4e/5 produce the data. Phase 6 turns it into coaching language a user can act on.

The risk this phase eliminates: **shipping good detectors with bad words**. We will not say "you should bring Whimsicott" when the data says "your wincon mon was lost early in 38% of losses." The voice rules below force every sentence to a data citation or be cut.

User quote (verbatim, binding): *"focus on accuracy"*.

---

## 2. Scope

### In scope
1. Style guide: direct + grounded + evidence-backed voice, with hard rules and 8 banned phrasings
2. Three output templates: PRE-game, IN-game, POST-game (Section 5)
3. RNG-blame gating: only blame RNG if `consistency_score.rng_dependency > 0.6`
4. Inline pilot card redesign to use POST template
5. Headless tests for template rendering, blame gating, citation invariants
6. A **wording diff test** that confirms phrasings change when underlying detector outputs change (extension of Phase 4e regression)

### Out of scope
- Engine policy changes
- New detectors (Phase 4c owns)
- Solver changes (Phase 4d owns)
- Multi-language output (English only v1)

---

## 3. Voice rules

### 3.1 The four hard rules

1. **Every claim cites a number.** "Your team loses 52% of games when Trick Room goes unanswered (47-game sample)." NOT "you struggle vs TR."
2. **Numbers come from struct, not vibes.** Every cited percentage maps to a field on `team_history`, `branchResult`, or `turnLog`. If the field doesn't exist, the sentence doesn't ship.
3. **No RNG blame unless `consistency_score.rng_dependency > 0.6`.** Phase 4d struct is the only source. If we lose 12 games in a row but `rng_dependency = 0.3`, we say "this is a positional problem, not luck."
4. **Action verbs only.** "Bring Garchomp." "Lead Arcanine + Incineroar." NOT "you might consider thinking about possibly bringing Garchomp."

### 3.2 Banned phrasings

| Banned | Why | Replacement |
|---|---|---|
| "you might want to" | Hedge | "do X" |
| "this team is okay" | Vague | "win rate is N% over M games (confidence: med)" |
| "unlucky" / "RNG" (without struct citation) | Blames variance | Cite consistency_score or remove |
| "consider running" | Hedge | "swap X for Y" |
| "in general" | Vague | Cite a sample |
| "could be" | Hedge | "is" with a number |
| "feels like" | Vibes | Citation or remove |
| "you should probably" | Hedge | "do X" |

### 3.3 Citation format

Inline in parentheses, lowercase, n + sample size always:

- `(47-game sample, high confidence)`
- `(38 of 47 games, 81%)`
- `(variance 0.18, stable)`

Multiple citations on one sentence are OK if natural.

### 3.4 Tense

Past for what happened ("Trick Room landed unanswered in 24 of 47 losses"). Imperative for what to do ("set Trick Room turn 1"). Never future-tense speculation ("you will probably lose").

---

## 4. RNG-blame gating (the most-violated rule)

`consistency_score` lives on every Phase 4d branch result. The voice layer reads it and applies this rule:

```js
function maySayItWasRNG(branchResult) {
  return branchResult.consistency_score.rng_dependency > 0.6;
}
```

**If `false`:** every line that mentions luck/RNG/crit/miss/freeze must be removed or rewritten as a positional/strategic claim.

**If `true`:** we may include exactly one line per output: "RNG flipped N% of decisive turns this set (consistency: low)." Do not chain multiple RNG mentions.

Tests in Section 7 enforce this with a wording grep.

---

## 5. Output templates

Three templates, exact section order, all sections required (no skipping).

### 5.1 PRE-game template (before a series)

```
LINE
  Recommended: <line> (<win_rate>% over <n>, <classification>)
  Lead       : <lead pair>
  Bring      : <bring 4>

WIN CONDITION
  <one sentence: how this team typically wins, cited from sim log>

LOSS CONDITION
  <top loss condition from Phase 4c, with lift cited>

TURN 1 PLAN
  <action verbs only: who clicks what>
```

**Example (Mega Altaria matchup):**
```
LINE
  Recommended: Safe (61% over 200, stable)
  Lead       : Arcanine | Incineroar
  Bring      : Arcanine, Incineroar, Garchomp, Whimsicott

WIN CONDITION
  Pressure Altaria off the field before turn 4 (28 of 38 wins follow this pattern, 74%).

LOSS CONDITION
  Tailwind expires on opponent before we close (32% of losses, lift +0.18).

TURN 1 PLAN
  Arcanine click Heat Wave (covers steel + fairy switch-ins).
  Incineroar click Fake Out into Altaria.
```

### 5.2 IN-game template (per turn, optional v2 - Phase 5 dependent)

Stub only in this spec; full implementation when Phase 5 turnLog ships:
```
THREAT TABLE
  <opp mon> -> <our mon>: <speed> | <damage range>
SPEED ORDER
  <ordered list this turn>
POSITION SCORE
  <0..1>, delta from last turn
DECISION
  <action verb> | <category: damage / speed / setup / pivot / answer>
```

### 5.3 POST-game template (after a sim or series)

```
ROOT CAUSE
  <one sentence, cites sample>

WHAT WENT WRONG (3-5 bullets, severity-ranked)
  - <action that should have been different> (<turn N>, <sim-log evidence>)
  - ...

TEAM-LEVEL FLAW (1 bullet, only if Phase 4c flagged anything)
  <e.g. "Beat Up averages 0.04 calls/game over 47 games - drop or replace.">

BEHAVIOR TO CHANGE (1 bullet, from Phase 4e)
  <e.g. "Protect streak >= 3 in 38% of games. Cap at 2.">

CONFIDENCE
  <badge> based on <n> games
```

**Example:**
```
ROOT CAUSE
  Trick Room landed unanswered in 11 of last 14 losses (78%, lift +0.34).

WHAT WENT WRONG
  - Turn 2: did not click Taunt on Whimsicott into setting Cofagrigus (sim 145).
  - Turn 3: protected Garchomp into a Fake Out target (sim 145, 167).
  - Turn 4: switched Incineroar after KO, lost Intimidate cycle (sim 167).

TEAM-LEVEL FLAW
  Beat Up averages 0.04 calls/game over 47 games. Drop it.

BEHAVIOR TO CHANGE
  Protect streak >= 3 in 38% of games. Cap at 2.

CONFIDENCE
  high (47 games)
```

---

## 6. Inline pilot card redesign

Today's inline card (after every single sim) is freeform. Phase 6 redesigns it to use the POST template above, truncated:

- ROOT CAUSE (1 line)
- WHAT WENT WRONG (top 2 bullets)
- CONFIDENCE badge
- "View full POST report" link expands to the full template

CSS reuses Phase 4c badge classes plus `.cs-pilot-card-v2`.

---

## 7. Validation tests

`tests/phase6_coaching_voice.js`:

### T1 - Banned phrasings
Render PRE/POST templates from a fixture. Grep output for each banned phrase from Section 3.2. Assert all greps return empty.

### T2 - Citation invariant
Every sentence in PRE/POST output must contain either:
- A parenthesized citation `(... over N ...)` or `(N of M ...)`, OR
- An imperative verb at the start (action lines)

Else fail.

### T3 - RNG gating
Fixture A: `rng_dependency = 0.3`. Render POST. Grep for `RNG | luck | crit | miss | freeze | flipped`. Assert empty.
Fixture B: `rng_dependency = 0.7`. Render POST. Grep for `RNG`. Assert exactly one match.

### T4 - Wording diff (extension of Phase 4e regression)
Same setup as Phase 4e T5: 200-game log, halves with different dominant patterns. Render POST template at n=100 and n=200. Assert the rendered POST text differs by at least one bullet in WHAT WENT WRONG. Plain-text diff > 0 lines.

### T5 - Template completeness
Each template has all required sections (PRE: 4, POST: 5). Missing section = fail.

### T6 - Number provenance
Pick a random claim from the rendered output. Assert the cited number maps to a field on `team_history` or `branchResult` or `turnLog`. Tested via JSON path lookup.

---

## 8. Implementation plan

| Step | File | Lines (est) |
|---|---|---|
| 1 | `renderPreGameTemplate(branchResult, teamHistory)` in `ui.js` | +120 |
| 2 | `renderPostGameTemplate(simResult, teamHistory, audit)` in `ui.js` | +180 |
| 3 | `renderInGameTemplateStub(turn)` (Phase 5 finishes the body) | +50 |
| 4 | RNG-blame gate helper | +20 |
| 5 | Banned-phrasings linter (used in tests) | +60 |
| 6 | Inline pilot card v2 wiring | +90 |
| 7 | CSS | +40 |
| 8 | `tests/phase6_coaching_voice.js` | +260 |
| 9 | Bump version chip + CACHE_NAME | 2 lines |

Total: ~820 lines added, no engine changes.

---

## 9. Acceptance criteria

A reviewer can mark this phase complete when **all** are true:

1. `node --check ui.js` passes
2. All 6 tests in `tests/phase6_coaching_voice.js` pass headless
3. T1 (banned phrasings) and T3 (RNG gating) wired into CI as blockers
4. Manual: simulate 1 game on a team with >= 50 sims; inline pilot card v2 renders with citations on every claim
5. Manual: simulate against an opponent where `rng_dependency < 0.6`; output has zero RNG mentions
6. Manual: simulate against an opponent where `rng_dependency > 0.6`; output has exactly one RNG mention
7. Bumps version chip + CACHE_NAME
8. PR description shows side-by-side: today's inline card vs Phase 6 inline card on the same sim

---

## 10. Locked decisions (from `@alfredocox` review 2026-04-25)

| # | Decision | Implementation note |
|---|---|---|
| Q1 | **Inline POST: soft 400 / hard 1000 words. PDF report: no word cap, trust the rules.** | Inline pilot card truncates at hard cap with "more info located in your PDF report" link. PDF generated by existing `buildReportText()` carries the full template untruncated |
| Q2 | **Stub only in Phase 6, full body when Phase 5 lands** | Phase 6 defines IN template structure (threat table, speed order, position score, decision category); renderer body fills in once Phase 5 turnLog ships |
| Q3 | **English source v1; in-page language switcher (Google Translate or similar) if technically feasible, else English only** | See Section 12 - tracked as a small follow-on task in `PHASE_ROLLOUT_REVIEW.md`. Template strings remain English; switcher operates on rendered DOM |
| Q4 | **One canonical voice, no toggle** | Direct + grounded + evidence-backed is locked. A toggle would dilute the bar and create two systems to maintain |
| Q5 | **Fall back to TEAM_META, prefix with "(no game history yet)"** | First sim removes the prefix. User still gets actionable PRE coaching from static metadata. Citation rule waived only when n=0 and prefix is shown |

---

## 11. PDF report integration (locked Q1 2026-04-25)

Inline pilot card and the existing PDF report (built by `buildReportText()` in `ui.js`) share the same POST template renderer but apply different word caps:

| Surface | Soft cap | Hard cap | Truncation behavior |
|---|---|---|---|
| Inline pilot card | 400 words | 1000 words | Truncate with "more info located in your PDF report" link |
| PDF report | none | none | Full template, all bullets, no truncation |

This preserves the "direct, scannable" voice for the inline surface while giving the PDF its full coaching depth. Voice rules + banned phrasings + RNG gating apply identically to both surfaces.

Implementation: `renderPostGameTemplate(simResult, teamHistory, audit, { maxWords })` accepts an optional cap; inline passes 1000, PDF passes `null` (no cap).

---

## 12. Language switcher follow-on (locked Q3 2026-04-25)

**Not in Phase 6 critical path.** Tracked as a small follow-on task to be sized after Phase 6 ships:

- Add a language dropdown to the Sources tab (or top nav)
- Use Google Translate Element (free, in-page, no API key) as the v1 implementation - operates on rendered DOM, no source string changes needed
- All template strings remain English in the source
- If Google Translate Element is deprecated or removed, fall back to English-only with a note in the rollout review
- Sized at ~1 day effort post Phase 6

---

## 13. Cross-references

- `PHASE4_DYNAMIC_ADVICE_SPEC.md` - parent spec, voice is the visible layer of every feature
- `PHASE4C_DETECTORS_SPEC.md` - cites detector outputs by field name
- `PHASE4D_THREAT_RESPONSE_SPEC.md` - cites `branchResult` + `consistency_score`
- `PHASE4E_POLICY_AUDIT_SPEC.md` - extends regression test with wording diff (T4)
- `PHASE5_TURN_LOG_SPEC_DRAFT.md` - completes IN-game template body
- `COACHING_NORTH_STAR.md` - voice locked: direct + grounded + evidence-backed
- `MASTER_PROMPT.md` - hard invariants
- `ui.js` - `showInlinePilotCard`, `renderPilotGuide`
