# Team Lab foundation spec

Date: 2026-06-29
Status: Build guidance and acceptance source for Team Lab backend/UI follow-up work.

## Core principle

The simulator is evidence-bound. It must not treat guessed Pokemon Champion data, Showdown data, or community meta as official truth.

Every rule, legality result, simulation result, and leaderboard ranking must carry:

- regulation_id
- ruleset_version
- engine_version
- source / verification status
- sample size, where applicable

Unknown Champion truth must be represented as `needs_verification`, not silently promoted to legal or verified.

## Truth layers

Keep these systems separate:

| Layer | Purpose | Trust rule |
| --- | --- | --- |
| Canonical battle mechanics | Damage, priority, status, weather, terrain, switching, targeting, ability/item timing | Mainline/Showdown can be a baseline reference only |
| Champion overrides | Anything Pokemon Champion does differently | Must be official, in-game verified, or replay-confirmed |
| Regulation legality | Legal Pokemon, forms, moves, abilities, items, Megas, restrictions | Must be tied to a specific regulation set |
| Meta intelligence | Usage, cores, archetypes, threats | Probabilistic coaching data, never rules |
| Coaching layer | Recommendations, matchup advice, risk analysis | Must cite the rules/meta evidence it depends on |

Do not mix legality, popularity, and mechanical truth.

## Rule fact concept

Future rule records should follow this shape:

```ts
type RuleFact = {
  id: string;
  category:
    | 'mechanic'
    | 'legality'
    | 'ranked_regulation'
    | 'team_building'
    | 'battle_flow'
    | 'pokemon_home'
    | 'meta';
  statement: string;
  champion_version: string;
  regulation_set?: string;
  effective_start?: string;
  effective_end?: string;
  source_tier: 'official' | 'in_game_verified' | 'replay_verified' | 'showdown_reference' | 'community_secondary';
  source_url?: string;
  source_quote_or_pointer?: string;
  verification_status: 'verified' | 'conflicting' | 'needs_test' | 'unverified';
  tests_linked: string[];
};
```

## Team Lab goal

Team Lab should rank teams based on simulator evidence, legality validation, matchup performance, confidence, and versioned rules.

It must not be a popularity leaderboard and must not claim real ladder truth.

A correct ranking sentence should be:

> Given regulation X, ruleset version Y, engine version Z, and N simulator battles, this team currently ranks here with this win rate, this confidence level, and these matchup strengths/weaknesses.

## Team Lab capabilities

Users should eventually be able to:

1. Save custom teams.
2. Validate teams against a Pokemon Champion regulation.
3. Run simulations against benchmark teams.
4. See team ranking, win rate, adjusted rating, matchup spread, confidence, and stale/version warnings.
5. Compare their team against top teams and common archetypes.

## Leaderboard fields

Leaderboard entries must expose:

- team name
- format: singles or doubles
- regulation_id
- legality_status
- archetype tags
- sim rating
- raw win rate
- adjusted win rate
- games played
- confidence label
- engine_version
- ruleset_version
- stale status
- last recalculated timestamp

## Required stale/ranking guardrails

The system must prevent misleading rankings by requiring:

- minimum sample size
- current engine version
- current ruleset version
- verified or explicitly flagged legality
- confidence labels
- stale result detection after engine/rules updates

Illegal teams must be excluded from leaderboard calculation.

Teams with `needs_verification` legality may appear only as experimental/provisional evidence, not official ranked truth.

## Visibility model

Custom teams may be:

- `private`: owner only
- `hidden_details`: public summary/stat visibility, but hidden tech details protected
- `public`: full public details

Hidden-detail teams must not leak hidden moves, held items, EVs, IVs, natures, abilities, or tech choices to non-owners.

## Backend Task 1 scope

Backend foundation only. Do not build full UI in this task.

Required:

1. Inspect repo structure.
2. Identify Supabase/database migration patterns.
3. Identify existing type conventions.
4. Add Team Lab database migrations.
5. Add Team Lab types/interfaces.
6. Add leaderboard calculation module with tests.
7. Add legality validation interface that returns `needs_verification` when source data is missing.
8. Add unit tests for ranking, confidence, stale status, and visibility filtering.

Do not invent game data.
Do not modify unrelated battle engine logic.
Do not add large UI changes in Task 1.

## Backend schema requested by product

Logical tables:

- teams
- team_members
- sim_runs
- leaderboard_entries
- team_matchups

Implementation note: this repo already has runtime catalog tables named `teams` and `team_members`, so the backend foundation uses namespaced Team Lab tables to avoid destructive collisions:

- team_lab_teams
- team_lab_team_members
- team_lab_sim_runs
- team_lab_leaderboard_entries
- team_lab_matchups

## Service layer functions

Needed service functions:

- createTeam(input, userId)
- updateTeam(teamId, input, userId)
- getTeam(teamId, viewerUserId)
- listLeaderboard(filters)
- getTeamMatchups(teamId, filters)
- compareTeamToLeaderboard(teamId, filters)
- markLeaderboardStale(reason, engineVersion?, rulesetVersion?)

## Legality report shape

```ts
type LegalityReport = {
  status: 'verified' | 'needs_verification' | 'illegal' | 'stale';
  regulation_id: string;
  ruleset_version: string;
  errors: LegalityIssue[];
  warnings: LegalityIssue[];
  source_gaps: LegalityIssue[];
};

type LegalityIssue = {
  code: string;
  severity: 'error' | 'warning' | 'needs_source';
  message: string;
  pointer?: string;
  affected_slot?: number;
};
```

Rules:

- If regulation data exists and team passes, return `verified`.
- If required Champion source data is missing, return `needs_verification`.
- If known illegal data is present, return `illegal`.
- Never silently pass unknown data as legal.

## UI follow-up scope

Task 2 is separate from backend foundation.

Required future UI pieces:

- TeamLabPage
- LeaderboardTable
- TeamCard
- TrustBadge
- VersionBanner
- TeamDetailPage or TeamDetailPanel

Filters:

- regulation
- format
- leaderboard scope
- confidence
- legality status
- stale/current

UI must clearly show:

- engine_version
- ruleset_version
- regulation_id
- sample size
- confidence
- stale warnings
- legality status

## Custom-team follow-up scope

Task 3 is separate from backend foundation.

Users should be able to:

1. Create a team.
2. Edit a team.
3. Set visibility.
4. Validate team legality against selected regulation.
5. Save legality_report.
6. See validation errors, warnings, and source gaps.

No team should enter official leaderboard scope unless legality_status is verified.

## Matchup/compare follow-up scope

Task 4 is separate from backend foundation.

For a selected user team, compare against:

- top N leaderboard teams
- archetype groups

Return:

- estimated win rate
- matchup confidence
- games played
- best matchups
- worst matchups
- stale warnings
- unresolved mechanics/source gaps

Label as simulator-derived evidence, not real ladder truth.

## Acceptance criteria

1. Database migrations compile and apply cleanly.
2. Types are added for Team, TeamMember, SimRun, LeaderboardEntry, TeamMatchup, LegalityReport.
3. Team visibility rules are represented in service logic.
4. Leaderboard calculation excludes illegal teams.
5. Leaderboard calculation marks needs_verification teams as experimental, not official ranked.
6. Leaderboard entries include regulation_id, format, engine_version, and ruleset_version.
7. Stale leaderboard entries are visibly marked.
8. Hidden-detail teams do not leak hidden moves/items/EVs in public API responses.
9. Unit tests cover raw win rate, adjusted rating, confidence assignment, illegal exclusion, experimental needs_verification handling, stale marking, and visibility filtering.
10. No Pokemon Champion-specific legality facts are hardcoded unless they come from an existing source-truth file in the repo.

## Challenge notes

- Do not use Team Lab to overclaim real-world best teams.
- Do not promote community/meta data into rules.
- Do not make login/profile promises until simulator math and RLS/privacy are hardened.
- Do not make hidden-detail teams appear secure only in UI; API/service responses must redact too.
- Recalculate or mark stale whenever engine or ruleset versions change.

## 2026-06-29 architecture spec intake

A later `.docx` architecture spec was ingested from `/Users/kevinmedeiros/Downloads/Pokemon_Champion_Sim_Team_Lab_Architecture_Spec.docx`.

Saved repo copies:

- `poke-sim/docs/team-lab/Pokemon_Champion_Sim_Team_Lab_Architecture_Spec_2026-06-29.txt`
- `poke-sim/docs/team-lab/TEAM_LAB_ARCHITECTURE_ALIGNMENT_2026-06-29.md`

The intake confirms the current Task 1 backend foundation and adds future planning for `rule_facts`, `ruleset_packages`, `replays`, `sim_jobs`, analytics aggregation, Team DNA, and Compare My Team. These are planning items only and do not promote any Champion-specific game data to verified runtime truth.
