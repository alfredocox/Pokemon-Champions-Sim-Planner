# LLM Brain Context

Date: 2026-07-05
Status: documentation-only context for the evidence-backed LLM Brain analyst layer

## Purpose

The LLM Brain is an analyst layer for Poke-E Sim Champion. It is not the battle engine, not an autonomous battler, and not a replacement for deterministic Pokemon Champions simulation.

The product goal is to make simulator evidence easier for players and the team to understand:

```text
existing simulator
  -> deterministic analysis tools
  -> evidence bundle
  -> no-API Brain Composer
  -> BrainAnalysis validation guardrails
  -> evidence-based UI cards
  -> feedback and improvement packs
  -> Codex regression loop
  -> optional DB persistence later
  -> real LLM endpoint later
```

The first user-facing version should be labeled as Evidence Mode Beta. It should explain what the simulator saw and what remains uncertain. It should not claim perfect coaching, complete legality proof, or real ladder truth.

## Beginner-Friendly Mental Model

Use this explanation when onboarding the team:

```text
The sim creates facts.
The Brain explains the facts.
```

Think of the system like a tournament review team:

- The simulator is the referee. It decides damage, speed order, priority, legality, weather, terrain, Trick Room, status, abilities, items, KOs, turn results, and replay logs.
- The analysis tools are the stat sheet. They extract facts like speed relationships, damage pressure, lead candidates, legal/illegal/unknown status, and replay events.
- The EvidenceBundle is the game film. It is the controlled packet of facts the Brain is allowed to use.
- The Brain Composer is the coach. It turns evidence into useful feedback using deterministic local rules and templates.
- The validator is the fact checker. It blocks fake evidence IDs, unsupported claims, illegal suggestions marked legal, fake confidence, and one-replay claims overstated as global truth.
- Feedback is the player teaching the coach. It becomes an improvement pack for Codex to review, not an automatic production mutation.

## Source Of Truth

The simulator remains the source of truth for:

- battle rules
- team legality
- Pokemon and form legality
- move legality
- damage calculation
- speed order
- move priority
- weather
- terrain
- Trick Room
- status
- abilities
- items
- targeting
- RNG
- battle outcome
- replay logs
- validation logic

The LLM Brain must never calculate damage, decide legality, invent turn order, override RNG, promote unknown Champion legality to legal, or replace `simulateBattle`.

## What The LLM Brain May Do

The Brain may explain, summarize, rank, and organize deterministic evidence.

Allowed output:

- team identity summaries
- win-condition explanations
- best lead candidates from deterministic lead evidence
- major threat summaries
- replay turning-point explanations
- recommended tests or changes with legality status
- confidence and uncertainty summaries
- evidence references for every major claim

Blocked output:

- mechanics claims without evidence IDs
- legal/illegal claims not backed by source-truth validation
- damage numbers invented by the model
- speed or priority claims not backed by simulator evidence or a clearly labeled pre-battle estimate
- replay-only observations stated as universal matchup truth
- hidden-information guesses
- high confidence when evidence is sparse or stale

## MVP Requires No New Infrastructure

The MVP should not call a real model, a remote API, or any network dependency.

The first build should use a deterministic no-API Brain Composer:

```text
simulator facts
  -> EvidenceBundle
  -> local rules and templates
  -> BrainAnalysis JSON
  -> BrainAnalysis validator
  -> UI cards
```

This proves the architecture before adding API keys, paid inference, Supabase Edge Functions, or any other model endpoint. The no-API Brain should remain the fallback and baseline even if a real LLM is added later.

## EvidenceBundle Control Boundary

`EvidenceBundle` is the packet of facts the Brain is allowed to use. It is the main safety boundary.

Every bundle should include:

- schema version
- bundle ID
- creation timestamp
- analysis type
- regulation and format metadata
- simulator and ruleset version metadata
- input references
- findings
- uncertainty

Every finding must include:

- `id`
- `category`
- `claim`
- `confidence_prior`
- `evidence`
- `provenance`

No evidence ID means no major Brain claim.

Required EvidenceBundle helpers:

- `createEvidenceBundle(input)`
- `addFinding(bundle, finding)`
- `validateEvidenceBundle(bundle)`
- `collectEvidenceIds(bundle)`
- `getFindingsByCategory(bundle, category)`
- `hasEvidence(bundle, evidenceId)`

Recommended initial files:

```text
poke-sim/analysis/schemas.js
poke-sim/analysis/evidence_bundle.js
poke-sim/analysis/confidence.js
poke-sim/analysis/provenance.js
```

## BrainAnalysis Output And Validation

Brain output should be structured JSON, not open-ended chat.

Recommended initial files:

```text
poke-sim/analysis/brain/brain_schema.js
poke-sim/analysis/brain/brain_rules.js
poke-sim/analysis/brain/brain_templates.js
poke-sim/analysis/brain/brain_composer.js
poke-sim/analysis/brain/brain_validator.js
poke-sim/analysis/brain/index.js
```

For the MVP, `brain_composer.js` should run locally from rules and templates only.

Initial composer rules:

- `detectTeamIdentity()`
- `detectSpeedRisk()`
- `detectLeadPlan()`
- `detectMajorThreats()`
- `detectWinConditions()`
- `detectReplayTurningPoint()`
- `detectSuggestedChanges()`
- `calculateBrainConfidence()`

Initial templates:

- team identity
- speed risk
- lead reason
- major threat
- win condition
- replay turning point
- low confidence
- medium confidence
- high confidence
- insufficient evidence
- unknown legality

The validator must reject output when:

- evidence IDs do not exist in the bundle
- major claims lack evidence IDs
- the model invents mechanics not present in evidence
- illegal suggestions are marked legal
- sparse evidence produces high confidence
- user-supplied claims override simulator evidence
- replay-only findings are overstated as global conclusions

Confidence should be validated or downgraded by code. It should not be freely invented by the model.

The main composer function should be:

```js
composeBrainAnalysis(evidenceBundle)
```

The main validator function should be:

```js
validateBrainAnalysis(output, evidenceBundle)
```

## UI Direction

The MVP should not be chat-first.

Use an evidence-based panel:

```text
AI Brain Analysis - Evidence Mode
```

Initial cards:

- Team Identity
- Win Conditions
- Best Leads
- Major Threats
- Recommended Changes
- Confidence
- Evidence Used
- Uncertainty
- Feedback Buttons
- Export Improvement Pack

The UI should show evidence IDs and uncertainty clearly. If evidence is missing, the UI should say that directly.

Example:

```text
Insufficient evidence: no damage matrix was available for this matchup.
```

## Privacy And Security Rules

Real LLM integration must come later behind a secure server-side endpoint. Do not call a real model directly from GitHub Pages or expose model API keys in browser code.

Treat the following as sensitive:

- imported teams
- replay logs
- usernames
- private Trainer Room data
- custom notes
- tournament preparation

Future model calls should receive validated evidence bundles or cleaned summaries, not raw user text. Raw team and replay input can contain prompt-injection text and should not be trusted as instructions.

## Supabase And Persistence

Supabase is optional persistence and audit infrastructure. It is not the battle engine and should not be required for the first Brain MVP.

Design table concepts can be drafted early, but runtime writes should wait until the evidence schema, BrainAnalysis schema, no-API composer, validator, feedback records, and benchmark tests are working.

Recommended persistence order:

1. evidence schema and local tests
2. deterministic analysis contracts
3. BrainAnalysis schema, local composer, and validator
4. local feedback and improvement-pack export
5. benchmark fixtures and regression tests
6. DB tables for requests, bundles, outputs, feedback, and benchmark results
7. optional Supabase/local adapter methods

Do not store unvalidated AI blobs as trusted analysis.

## Release Learning Loop

The Brain should improve through reviewed releases, not silent production self-training.

Recommended loop:

```text
app collects simulator and replay evidence
  -> users, QA, and Codex label what was useful, wrong, missing, or confusing
  -> Codex turns labels into rule updates, templates, guardrails, tests, and fixtures
  -> CI and benchmark checks prove the change
  -> a new release ships the improved Brain behavior
```

This keeps the learning path auditable. User feedback can create evidence for better prompts, templates, validators, and deterministic analysis tools, but it should not directly mutate mechanics, legality, source-truth rows, or production Brain behavior without review.

Every feedback item should eventually answer:

- what evidence was reviewed
- what the user or reviewer labeled good, bad, missing, or confusing
- which rule, template, validator, test, or fixture changed
- which release contains the improvement
- what the improvement still does not prove

### How This Works In Practice

This Brain system does not start as a live LLM or self-training AI. It starts as a controlled, no-API analysis layer that uses the simulator's own evidence to create coaching feedback.

The full loop works like this:

```text
1. User runs a team review, matchup, or replay review.

2. The simulator and analysis tools extract facts:
   - legality status
   - speed relationships
   - damage pressure
   - threat indicators
   - lead candidates
   - replay events
   - turning-point candidates

3. These facts are packaged into an EvidenceBundle.

4. The local Brain Composer reads the EvidenceBundle.

5. The Brain Composer applies deterministic rules and templates.

6. The Brain Composer produces BrainAnalysis JSON.

7. The Brain Validator checks the output before the user sees it.

8. The UI renders validated analysis cards:
   - Summary
   - Team Identity
   - Win Conditions
   - Best Leads
   - Major Threats
   - Recommended Changes
   - Confidence
   - Evidence Used
   - Uncertainty

9. The user gives feedback:
   - Helpful
   - Wrong Reason
   - Wrong Lead
   - Missed Turning Point
   - Too Vague
   - Illegal Suggestion
   - Accepted Suggestion
   - Rejected Suggestion

10. The app stores the feedback locally first.

11. The user exports a Brain Improvement Pack.

12. Codex reviews the improvement pack.

13. Codex updates:
   - brain_rules.js
   - brain_templates.js
   - brain_composer.js
   - brain_validator.js
   - benchmark fixtures

14. Every fix becomes a regression test.

15. The next release has a smarter Brain.
```

The Brain improves through controlled releases, not live mutation. The app does not secretly rewrite its own rules, retrain itself in production, or let user feedback override simulator truth automatically.

The safe learning loop is:

```text
Evidence -> Feedback -> Improvement Pack -> Codex -> Tests -> Release
```

### What Learning Means Here

Learning means the system gets better at:

- identifying common team weaknesses
- explaining lead choices
- spotting replay turning points
- choosing better coaching language
- avoiding vague advice
- avoiding illegal suggestions
- calibrating confidence
- turning repeated failures into benchmark tests

Learning does not mean:

- the LLM changes mechanics
- the app invents rules
- feedback instantly changes production logic
- a model retrains itself live
- Codex edits the battle engine without a specific mechanics task

### Why This Is The Best First Version

This approach gives the project the benefits of an AI-style coach without the risk of an uncontrolled LLM.

The first Brain is local, deterministic, testable, and evidence-backed. A real LLM can be added later, but only after the no-API Brain proves the evidence pipeline works.

The correct MVP is:

```text
Simulator facts
  -> EvidenceBundle
  -> Local Brain Composer
  -> Validator
  -> UI Cards
  -> Feedback
  -> Improvement Pack
  -> Codex Regression Loop
```

This creates a domain-specific Pokemon Champion analyst that learns from the actual simulator, actual replays, actual user feedback, and actual benchmark tests.

### Feedback And Improvement Packs

Feedback should be collected locally first, using the existing `champions:*` storage convention where available.

Suggested local keys:

```text
champions:brain:feedback:v1
champions:brain:outputs:v1
champions:brain:improvement_packs:v1
```

Initial feedback types:

- `helpful`
- `not_helpful`
- `wrong_reason`
- `wrong_lead`
- `missed_turning_point`
- `illegal_suggestion`
- `too_vague`
- `accepted_suggestion`
- `rejected_suggestion`

Recommended files:

```text
poke-sim/analysis/brain/brain_feedback.js
poke-sim/analysis/brain/improvement_pack.js
```

Required feedback functions:

- `recordBrainFeedback(feedback)`
- `listBrainFeedback()`
- `getBrainFeedbackByOutput(analysisOutputId)`
- `deleteBrainFeedback(feedbackId)`
- `summarizeFeedback()`

Required improvement-pack functions:

- `createImprovementPack(options)`
- `exportImprovementPackAsJson()`
- `downloadImprovementPack()`
- `summarizeImprovementPack()`

The local foundation also keeps optional helpers for the other two document keys:

- Brain outputs under `champions:brain:outputs:v1`
- saved improvement packs under `champions:brain:improvement_packs:v1`

Those helpers are storage plumbing only. They do not make the Brain self-training and they do not promote feedback into production behavior.

Every Brain improvement must include a regression test. No test, no learning.

## Benchmark Fixture Seeds

The first no-API Brain branch includes fixture seeds under:

```text
poke-sim/tests/fixtures/analysis/brain_cases/
```

Initial cases:

- missing evidence
- fake evidence ID
- bad confidence
- illegal suggestion
- replay overstatement
- wrong lead feedback
- missed turning point feedback

These fixtures are the start of the Codex improvement-pack loop. When feedback exposes a repeated Brain failure, the next fix should either extend one of these cases or add a new benchmark fixture before changing rules/templates.

## Files That Should Not Change For The MVP Foundation

Do not change these during the documentation and schema foundation slices:

- `poke-sim/engine.js`
- `poke-sim/data.js`
- `poke-sim/generated/*`
- `poke-sim/pokemon-champion-2026.html`
- `poke-sim/sw.js`
- `poke-sim/release_manifest.js`
- `poke-sim/index.html`
- `poke-sim/tools/build-bundle.py`
- `poke-sim/supabase_adapter.js`
- `poke-sim/db/migrations/*`
- `poke-sim/rulesets.js`
- `poke-sim/source/*`
- `poke-sim/legality.js`
- `poke-sim/team_lab.js`
- `poke-sim/source_truth.js`
- `poke-sim/legality_evidence_package.js`

No release bump is needed for documentation-only or schema-only work unless a later release task explicitly requests it.

## Recommended Phased Build Order

### Phase 0 - Documentation And Guardrails

Create the architecture context and audit docs. Do not change runtime behavior.

Exit criteria:

- source-of-truth boundaries are documented
- no runtime files changed
- no LLM calls added
- no DB writes added
- no release identity changed

### Phase 1 - EvidenceBundle Schema

Add:

```text
poke-sim/analysis/schemas.js
poke-sim/analysis/evidence_bundle.js
poke-sim/analysis/confidence.js
poke-sim/analysis/provenance.js
poke-sim/tests/analysis/evidence_bundle_tests.js
```

Exit criteria:

- valid bundles pass
- invalid analysis types fail
- invalid evidence categories fail
- invalid confidence levels fail
- missing finding fields fail
- duplicate evidence IDs fail
- missing provenance fails

### Phase 2 - Deterministic Analysis Tool Contracts

Add conservative tools under:

```text
poke-sim/analysis/tools/
```

Initial tools:

- `validate_team_analysis.js`
- `speed_tiers.js`
- `damage_matrix.js`
- `threat_detection.js`
- `lead_recommendations.js`
- `role_coverage.js`
- `replay_summary.js`
- `critical_turns.js`
- `index.js`

Each tool returns evidence findings and uncertainty, not final coaching prose.

### Phase 3 - No-API Brain Composer

Add structured BrainAnalysis output, local rules, local templates, composer, and validator.

Do not call external models, remote APIs, or network dependencies.

### Phase 4 - Feedback And Improvement Packs

Add local feedback collection and JSON improvement-pack export.

Feedback should not directly mutate production behavior. It should create reviewable cases that Codex can turn into rules, templates, guardrails, and tests.

### Phase 5 - Benchmarks And Red-Team Fixtures

Add fixtures for tricky simulator evidence:

- Trick Room
- priority moves
- speed ties
- item consumption
- faint and switch replacement
- weather and terrain
- status and action denial
- ability and item triggers
- replay parser gaps
- fake evidence IDs
- high confidence with weak evidence
- illegal suggestion mismatch
- replay-only overstatement
- missed turning point feedback

### Phase 6 - UI Cards

Render validated no-API BrainAnalysis output in Evidence Mode cards.

Do not add open-ended chat in the MVP.

### Phase 7 - Optional DB Persistence

Add DB tables and adapter methods only after schemas, validators, local feedback, improvement packs, and benchmarks are proven.

Store what the Brain saw, what it said, whether validation passed, and what evidence IDs were used.

### Phase 8 - Real LLM Endpoint

Add a disabled-by-default server-side endpoint only after the no-API composer, validator, feedback loop, and benchmarks are stable.

No model keys in browser code.

### Phase 9 - Learning And Meta Intelligence

Defer leaderboard, global meta, and large-scale learning until the simulator truth, evidence ledger, privacy model, and anti-poisoning controls are stronger.

## Accepted Direction As Of 2026-07-05

The accepted direction is:

- Evidence Mode Beta first
- schema before AI UI
- no-API Brain Composer before real model
- validator before persistence
- feedback and improvement packs before DB learning
- every Brain improvement requires a regression test
- privacy-aware LLM use later
- team-review first before broader matchup and replay coaching
- Milestone A active work before opening later phases as implementation issues

## Challenge Notes For The Team

The main risk is not adding AI too slowly. The main risk is making AI sound authoritative before the simulator evidence is complete enough.

If a Brain feature cannot answer these questions, it should not ship as user-facing coaching:

- What exact evidence supports the claim?
- Which simulator, ruleset, regulation, and source versions produced that evidence?
- What is missing or uncertain?
- Is the claim team-review, matchup-review, replay-only, or global?
- Could this expose private team or replay information?
- Would a stale ruleset, stale engine, or stale parser change the conclusion?

The Brain can help players understand evidence. It cannot change the rules.
