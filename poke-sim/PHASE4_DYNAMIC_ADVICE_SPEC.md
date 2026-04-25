# Phase 4 — Dynamic, Data-Driven Coaching Layer

**Status:** DRAFT (for alfredocox review)
**Author:** Computer (on behalf of alfredocox)
**Base branch:** `main` @ `81083fe`
**Target version:** `v2.2.0-phase4.1` (minor bump — new feature surface)
**Target CACHE_NAME:** `champions-sim-v6-phase4`
**Related:** Refs #52 #53 #54 #55 (Phase 4 Trend Analysis hook)

---

## Why

The coaching layer today is **static rule-based** — e.g., "Do not lead Froslass into Fake Out pressure" fires from a type/BST heuristic, not from what actually happened in your sims. The user wants:

> "real analitical feed back and dynamic advice that is tailored off the rating and more battle you sim with that team"

Translation: coach should get **smarter the more you sim**, and surface patterns from **your actual battle history**, not just archetype rules.

---

## Scope (4 deliverables approved by user)

1. **Confidence badges on existing static tips** — "High confidence · 18/20 sims"
2. **Loss-pattern generated tips** — mined from sim history
3. **Rating-driven overall team grade** — single letter grade with breakdown
4. **Per-matchup postgame debriefs** — auto-generated after any Bo-series

Each is independently shippable. Recommended merge order below.

---

## Architecture

### New storage key: `champions_sim_log_v1`

Separate from `champions_strategy_report_v1` (Phase 3) because:
- Strategy reports are **computed/snapshot** data (re-derivable)
- Sim log is **raw event history** (append-only, source-of-truth for Phase 4 analytics)

**Schema:**
```json
{
  "version": 1,
  "entries": [
    {
      "id": "sim_<timestamp>_<rand>",
      "ts": 1714000000000,
      "playerKey": "aurora_veil_froslass",
      "oppKey": "rin_sand",
      "format": "doubles",
      "bo": 3,
      "games": [
        {
          "result": "win",
          "turns": 14,
          "leads": { "player": ["Froslass-Mega","Tapu Koko"], "opponent": ["Tyranitar","Excadrill"] },
          "bring": { "player": [...4], "opponent": [...4] },
          "playerSurvivors": 2,
          "oppSurvivors": 0,
          "winCondition": "Sweep",
          "trTurns": 0,
          "twTurns": 4,
          "koEvents": [
            { "turn": 2, "victim": "Tyranitar", "side": "opp", "byMove": "Moonblast", "byAttacker": "Tapu Koko" }
          ]
        }
      ],
      "seriesResult": "win"
    }
  ]
}
```

**Storage strategy:**
- Cap at **500 entries total** (LRU eviction). At ~1 KB/entry worst case = 500 KB, well under 5 MB localStorage budget.
- Separate cap of **100 entries per (playerKey, oppKey) pair** to prevent one heavy matchup from crowding out others.
- QuotaExceededError → purge oldest 25% (same pattern as Phase 3).

### New engine return field: `koEvents[]`

To avoid log-string parsing (fragile), extend `simulateBattle` return with structured KO events:

```js
koEvents: [
  { turn: 2, victim: 'Tyranitar', side: 'opp', byMove: 'Moonblast', byAttacker: 'Tapu Koko' },
  { turn: 5, victim: 'Whimsicott', side: 'player', byMove: 'Rock Slide', byAttacker: 'Excadrill' }
]
```

Plumb from the existing faint hooks at `engine.js:1523/1839/1999/2009/2020/2028/2040`. Already tracking `attacker` + `move` at those sites; just need to push structured event alongside log line.

**Risk:** Non-attack faints (hazards, weather, recoil) need special casing — `byAttacker: null, byMove: "Stealth Rock"` or `"Sandstorm"`.

### Phase 4 UI surface: `#strategy-tab` additions

New subsection **after** the existing Section 7 ("Mistakes to Avoid"):

```
┌─ Team Rating ─────────────────────────────────────┐
│  B+     Win rate 67% (16W-8L)  ·  24 games logged │
│         Breakdown:                                 │
│         • Win rate ........... B  (67%)           │
│         • Lead survival ...... A  (88% alive T3)  │
│         • KO differential .... B+ (+1.2 avg)      │
│         • Closing speed ..... C  (avg 13.2 turns) │
└────────────────────────────────────────────────────┘

┌─ Learned from your sims ─────────────────────────┐
│  ⚠ Whimsicott dies turn ≤2 in 71% of your losses │
│     Suggested: Focus Sash or Misty Seed          │
│     (observed 5/7 losses · 3 to Rock Slide)      │
│                                                    │
│  ⚠ You average 14.8 turns vs Rin Sand (tied 3-3) │
│     You're grinding — consider Trick Room break  │
│     (observed across 6 Bo3s)                      │
└────────────────────────────────────────────────────┘

┌─ Recent matchups ─────────────────────────────────┐
│  ✓ vs Rin Sand (Bo3)        2-1    [Debrief ▸]   │
│  ✗ vs Chuppa Balance (Bo5)  2-3    [Debrief ▸]   │
│  ✓ vs Mega Dragonite (Bo1)  1-0    [Debrief ▸]   │
└────────────────────────────────────────────────────┘
```

---

## Feature Details

### 1. Confidence badges (cheapest, ~1 day)

**For each existing `csMistakes` rule,** if the team has ≥5 logged sims, compute how often the rule's predicted-bad-thing actually happened.

**Example — the Fake Out rule we just fixed:**
- Rule fires when fragile vulnerable leader + Fake Out in opp team
- Badge logic: of last 20 sims where opponent had Fake Out, how many times was that fragile leader KO'd by turn 2?
- Render: `High · 14/20` (green), `Medium · 8/20` (amber), `Low · 2/20` (red — rule may not apply to this user's playstyle)

**Min sample:** 5 sims. Below that, show neutral "Static rule" pill (no color).

**Storage:** computed at render time from sim log, no new persistence.

### 2. Loss-pattern generated tips (meat of the work, ~2-3 days)

**Pattern detectors** (each returns 0..N tips):

| Detector | Signal | Example output |
|----------|--------|----------------|
| Early-KO victim | Member KO'd by turn ≤2 in >50% of losses, min 5 losses | "Whimsicott dies turn ≤2 in 71% of losses. Try Focus Sash." |
| Repeat killer | Same opp move/mon KOs you ≥3 times across sims | "Rock Slide from Excadrill KO'd your leads 4 times." |
| Grind games | Avg turns >13 in wins vs a specific opp | "You're closing slow vs Rin Sand (avg 14.8 turns)." |
| Lead-trap | Your same lead pair loses T1 momentum ≥3 times | "Your Incineroar/Arcanine lead loses Fake Out war 60% vs Fake Out users." |
| Survivor gap | You finish with avg ≤1 survivor while losing | "You're trading 1-for-1 instead of 2-for-1." |

**Scoring:** Each tip gets a severity (`critical`/`warning`/`info`) based on frequency × cost. Cap 3 tips shown (expand to see more).

**Threshold:** Minimum **10 sims total** for this section to render. Below that, show "Keep simming — dynamic advice unlocks at 10 games."

### 3. Rating-driven team grade (~1 day after 1+2)

Single letter grade (A+ / A / A- / B+ / ... / D) computed as weighted average:

```
grade_score =
  0.40 * norm(win_rate, 0.30, 0.80)          // 30% = F, 80% = A+
  + 0.20 * norm(lead_survival_t3_pct, 0.50, 0.90)
  + 0.20 * norm(ko_diff_avg, -2.0, +2.0)
  + 0.10 * norm(inv(turns_to_win_avg), 10, 20)  // fewer turns = better
  + 0.10 * norm(closeout_rate_in_wins, 0.60, 1.0)
```

`norm()` clamps to [0,1], then maps linearly to 0..100. Letter grade bands: A+ ≥ 93, A ≥ 87, A- ≥ 83, B+ ≥ 77, B ≥ 73, B- ≥ 70, C+ ≥ 65, C ≥ 60, D ≥ 50, F < 50.

**Min sample:** 15 sims. Below that, show "Rating available at 15 games (X more)."

**Breakdown card** shows each component's grade so the user knows what to improve.

### 4. Per-matchup postgame debrief (~1-2 days)

After any Bo-series completes, auto-append an entry. Clicking "Debrief" shows:

```
vs Rin Sand · Bo3 · 14 Apr 2026 9:41pm
Result: 2-1 (W-L-W)

Game 1 (W, 12 turns): Swept with Froslass-Mega Aurora Veil
Game 2 (L, 18 turns): Tyranitar set sand, you lost tempo — Whimsicott KO'd T2
Game 3 (W, 9 turns): Tapu Koko Terrain flip closed fast

Key turning points:
  • T2 Whimsicott KO in G2 (Rock Slide, Excadrill)
  • T1 Protect read in G3 (Froslass-Mega survived Fake Out chip)

Across series:
  • Your avg turns: 13.0 (league avg 11.2 — slightly slow)
  • KO diff: +0.7 (positive)
  • Recommend: bring Focus Sash on Whimsicott for G2-style openings
```

**Data source:** the 3 games in the last sim_log entry. Debrief is deterministic — no LLM, all template + data.

---

## Recommended rollout order

Ship as **4 separate PRs**, each mergeable independently:

| PR | Scope | Version chip | Estimated effort |
|----|-------|--------------|-------------------|
| 4a | `champions_sim_log_v1` storage + `koEvents` engine plumbing + log capture in `runBoSeries` handler | v2.1.3-simlog.1 | 1 day |
| 4b | Confidence badges on existing mistakes | v2.1.4-confidence.1 | 1 day |
| 4c | Loss-pattern detectors + "Learned from your sims" section | v2.1.5-patterns.1 | 2-3 days |
| 4d | Team grade + per-matchup debrief | v2.2.0-phase4.1 (minor bump — feature complete) | 2 days |

**Why this order:** 4a is foundation (no user-visible change but required). 4b is the smallest user-visible win and validates the data flow. 4c+4d build on it.

---

## Open questions for alfredocox

1. **Do losses in a `Bo3` count as 1 entry or 1-3 entries in the sim log?** My recommendation: **1 entry per series, containing N game sub-records**. Cleaner for per-matchup debrief; still allows per-game stats.
2. **Should the sim log track sims run with swapped sides** (user as opp)? My recommendation: **No** — only log when the team in question is `playerKey`. Keeps stats honest.
3. **Should static rules that contradict history be suppressed** (e.g., if a static warning has fired 20 times but the predicted bad thing never happened, hide it)? My recommendation: **Demote, don't hide** — show it with "Low confidence · this rule rarely applies to your playstyle" so the user can still see what the archetypic rule is.
4. **Grade letter vs numeric**: current spec shows `B+`. Alternatives: 0-100 number, star rating (★★★★☆), or both. My recommendation: **letter + number-in-tooltip** (e.g., `B+ (78)`).
5. **Reset controls**: should there be a "Clear sim history for this team" button? My recommendation: **Yes**, in the Strategy tab footer alongside existing clear controls.

---

## Out of scope for Phase 4

- Cross-team aggregate stats ("your overall record across all teams")
- Social/shareable stat cards
- LLM-generated prose advice (current plan is 100% deterministic templates)
- Live in-battle coaching (still postgame only)

---

## Success criteria

- [ ] User can sim 10+ battles with a team and see at least one dynamically-generated tip referencing their specific loss pattern
- [ ] Team grade reflects actual performance (validate: simulate 20 stomps → grade ≥A; simulate 20 losses → grade ≤D)
- [ ] Existing static tips get badges that match observed frequency
- [ ] Per-matchup debrief renders in <100ms for any logged series
- [ ] Zero new `pageerror`/`console.error` across all 22 teams
- [ ] localStorage usage stays under 1 MB after 100 sims

---

**Review checkpoints:** alfredocox sign-off required before each of the 4 PRs is cut.
