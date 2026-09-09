# Seasonal Agent Readiness

## Delivered

- Repository skill: `.agents/skills/pokemon-season-update/SKILL.md`, with a
  seasonal impact/test checklist and discovery metadata. A byte-identical copy
  was installed in the local user's Codex skills directory. This is not a claim
  that every teammate's machine has loaded it; the repo is the maintained source.
- Read-only reviewer definition: `.codex/agents/season-reviewer.toml`.
- Existing engineering skill, AGENTS.md and reviewer roster route seasonal work
  to this skill. Existing mechanics, trust and release specialists remain owners
  of their respective gates; no duplicate autonomous production agents added.

The loop is observe sources, classify deltas, stage an unverified candidate,
test impacted contracts, independently review, then obtain human approval of
the exact artifact. New Pokemon/forms/items/moves/abilities are not legal merely
because a baseline row or artwork exists. Old regulations and saved identities
remain intact. Unknown sets cannot be borrowed from a matching catalog team.

## Validation

- Skill Creator validator passed for repo and local copies. Its PyYAML dependency
  was initially missing; installed only into a temporary validation directory,
  not project dependencies. Both copies match byte-for-byte.
- Reviewer TOML parses and declares `sandbox_mode = "read-only"`.
- Independent subagent forward-test exercised an official-source outage,
  post-review item mutation, failed active watcher, incomplete registered set,
  and failing doubles case despite singles passing. It withheld release and
  required missing source, mapping, parity and fresh digest-bound approval.
- Reviewer feedback improved explicit read-only/no-network scope handling,
  unknown-set treatment and separation of scenario claims from executed tests.
- Existing regulation watcher, candidate staging, regulation selection and
  execution-gate test files passed. These use local/mock evidence and do not
  prove production source health or database security.
- No new runtime bundle, rules approval, production database mutation, scheduler,
  workflow dispatch, merge or deployment was performed.

The forward-test used a generic independent subagent with the checked-in skill;
it did not prove that this session could select the new custom role by name.
Model decisions are not enforcement: deterministic tests and human approval
remain necessary. Skills do not run continuously by themselves.

## Live Watcher Concern

GitHub reports Regulation Watch, Showdown Sync and Battle Audit active. However,
the latest three scheduled Regulation Watch runs all failed:

- [September 7](https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner/actions/runs/34149511818)
- [September 6](https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner/actions/runs/34043437086)
- [September 5](https://github.com/TheYfactora12/Pokemon-Champions-Sim-Planner/actions/runs/33975192729)

These ran main revision `81bb0ef250dab05d46c7435f3a1a25899c9521b1`, not the current
candidate. September 7 reported `incomplete: true`, zero candidates and 28
unavailable sources, then exited at the explicit completeness guard. At least
one required Pokemon.com M-B announcement reported source layout/content
unavailable and manual parser review required. Some Champions pages were
unchanged; this is not a total network outage diagnosis. The guard should not be
disabled to make CI green.

Next: inspect retained per-source evidence, distinguish outdated URLs, challenge
pages and parser drift, reproduce locally without changing truth, add fixtures,
and verify a reviewed repair in a successful scheduled run. No monitoring-health
or automatic seasonal-readiness claim is justified yet.

## Design References

Followed the existing repository skill/agent conventions and checked current
[OpenAI skill documentation](https://learn.chatgpt.com/docs/build-skills) and
[subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents).
