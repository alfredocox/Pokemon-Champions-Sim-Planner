# Seasonal Change Checklist

## Inventory And Scheduling

Inspect existing sources and commands rather than inventing a new feed:

- `poke-sim/tools/champions_source_inventory.json`: trusted source inventory.
- `.github/workflows/regulation-watch.yml`: discovery, source-health evidence,
  deduplicated issues and baseline advancement.
- `.github/workflows/regulation-stage.yml`: candidate staging approval boundary.
- `.github/workflows/showdown-sync.yml`: baseline synchronization, not legality.
- `.github/workflows/battle-audit.yml`: scoped mechanics regression evidence.
- `poke-sim/source/reg-m-c-source-review.json`: an existing quarantine example,
  not a permanent assumption about which regulation is current.

Read recent hosted results, artifacts and effective workflow revision. Report
disabled, stale, failed, skipped and incomplete separately from healthy. Check
that recurring alerts do not duplicate issues and a failed capture cannot erase
the last reviewed baseline. Do not print secret values or trigger production
workflows merely to check whether they exist.

## Impact Matrix

For each announced delta, record affected IDs and evidence:

| Change | Required boundaries |
|---|---|
| Regulation dates | Before/at/after UTC start and end; extensions, gaps and overlaps; explicit user selection; unknown future regulations |
| Pokemon/form | Canonical species versus registered member identity; aliases, gender/form, base/Mega state, stats, abilities and learnsets; unknown rows and removals |
| Items/abilities/moves | Introduced versus eligible dates; held-item ownership; per-form and combination restrictions; allowed and rejected import fixtures |
| Mechanics | Singles and doubles independently; priority, ties, mid-turn speed, terrain/weather, targeting, spread/allies, protection, PP, replacement, residual order |
| Assets | Exact form sprite or visibly identified fallback; missing files; no inference of stats or legality from artwork |
| Existing teams/results | Revalidate against selected regulation without silently rewriting registered sets; retain old package, engine and team digests; prevent stale advice reuse |
| Evidence/release | Visible/exported replay agreement, candidate hashes, source gaps, cache/bundle identity, rollback and explicit approval |

Do not transfer a singles pass to doubles or a species allowance to every form,
move or held-item combination. Fail closed when required restrictions are
unknown. If a notice lists some additions, do not infer the complete roster.
Invalid or unsupported reference inputs are harness/setup outcomes, not proof
that a Champions team is illegal.

Unknown registered moves, items, abilities or stats remain unresolved. Never
fill them from a species-matching catalog team or reuse that team's identity,
simulation results or advice. Require actual set evidence and verified mapping.

## Existing Test Entry Points

Run from `poke-sim`. Read scripts before execution; identify local versus
network/write behavior. Add a failing regression for uncovered changed rules.

- `node --test tests/regulation_watch_tests.mjs`: watcher/source-health contracts.
- `node --test tests/regulation_candidate_staging_tests.mjs`: immutable staging boundaries.
- `node --test tests/regulation_selection_tests.mjs tests/regulation_gate_execution_tests.mjs`: selection and fail-closed execution.
- `node tests/species_ability_legality_tests.js`, `node tests/replay_species_parser_tests.js`, `node tests/sprite_fallback_chain_tests.js`: entity/form/asset boundaries.
- `node --test tests/showdown_reference_tests.mjs`: existing pinned oracle cases;
  new mechanics need their own cases, not regenerated expectations alone.
- `npm run test:fast`: broader local regressions after shared changes.
- `npm test`: existing merge gate, after inspecting its current execution scope.
- `npm run roadmap:build` then `npm run roadmap:check`: maintained roadmap outputs.

Use the battle audit skill for changed mechanics and engineering lane guidance
for database, security and deployment. Existing tests cover only declared cases.
No count of battles proves comprehensive accuracy or approved game legality.

## Adversarial Review Prompts

Evaluate these without touching production:

1. The official page is unavailable but Showdown adds a form and a sprite exists.
2. A previously reviewed candidate has one changed item row under the same name.
3. A regulation extends its deadline while older replays retain original dates.
4. A new form shares a base species but has different abilities and learnsets.
5. A doubles spread/ally interaction passes in singles but disagrees in doubles.
6. A saved team's identical species overlap a catalog team with different sets.
7. The watcher is enabled but its latest scheduled runs are failing.

The reviewer should give permitted next actions, missing evidence, test cases
and approval requirements. Check the decisions, not the presence of keywords.
