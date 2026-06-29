# Public Release Milestone Plan - 2026-06-06

## Direction

Release the simulator as a public website only after the simulation-truth gate is strong enough to support public users.

The public site should be boring in the best way:

- one canonical URL
- HTTPS enforced
- GitHub PR checks before merge
- GitHub Pages deployment from `main`
- Supabase public reads guarded by RLS
- no service-role or private keys in browser code
- rollback path documented before launch
- Showdown-mirrored data and Champions overrides approved before generated app assets ship

## Hosting Recommendation

Use GitHub Pages with GitHub Actions for the first public release.

Why:

- the app is a static PWA-style bundle, so Pages is a natural fit
- GitHub Actions can build, test, inject public runtime config, upload the Pages artifact, and deploy
- Pages supports custom domains and HTTPS
- deployment history ties directly to commits and workflow runs
- rollback can be a Git revert or redeploy of a known-good commit

Consider Cloudflare Pages, Netlify, or Vercel later only if we need stronger preview environments, edge functions, commercial analytics, form handling, or more complex server-side routing.

## Official Guidance Anchors

- GitHub Pages custom workflows can build and deploy via Actions using Pages artifacts and `actions/deploy-pages`.
- GitHub environments can add deployment protection rules, environment secrets, variables, and required review patterns.
- GitHub Pages supports custom domains and HTTPS enforcement.
- Supabase requires RLS on tables in exposed schemas such as `public`; service-role keys must never be exposed in browser code.

Reference links:

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/actions/deployment/environments
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
- https://supabase.com/docs/guides/database/postgres/row-level-security

Current release checklist:

- `docs/release/DEPLOYMENT_SECURITY_CHECKLIST_2026-06-28.md`

## Release Milestones

| Milestone | Name | Goal | Exit Criteria | Status |
|---|---|---|---|---|
| R0 | Repo Alignment | Make TheYfactora and Alfredo repos share one reviewed release candidate | Candidate PR is open, CI is green, branch parity is confirmed, merge path is documented | Open |
| R1 | Public Hosting Foundation | Make one stable public site URL deploy from `main` | Pages deploys through Actions, HTTPS works, canonical URL is documented, service worker cache is current | In progress |
| R2 | PR And CI Gates | Prevent untested bundle, data, or sim changes from reaching public users | Required checks include CI, bundle freshness, cache bump, priority/order tests, and relevant audit gates | In progress |
| R3 | Showdown Data Pipeline | Use Showdown-mirrored data plus Champions overrides as approved release input | Sync/audit tables exist, diffs are reviewed, approved views generate deterministic app assets | Planned |
| R4 | Supabase Security Baseline | Keep browser-accessible DB use safe before public traffic grows | RLS is enabled, anon policies are intentional, service keys stay server-side, live smoke passes | Planned |
| R5 | Simulation Truth Public Gate | Prove mechanics behavior before coaching grows | Turn order, damage, status, terrain, weather, abilities, items, switching, logs, and oracle cases pass | Planned |
| R6 | Public UX Readiness | Make the site usable by real users on common devices | Mobile smoke, accessibility pass, performance budget, feedback path, and public docs are ready | Planned |
| R7 | Launch And Rollback | Publish with a recovery path | Release note, known-good SHA, rollback steps, live smoke, and post-release monitoring are complete | Planned |
| R8 | Growth After Trust | Add accounts, saved history, premium, and coaching after sim truth | No new coaching claims ship until R5 is green and current | Paused |

## Issue Layout

### R0 - Repo Alignment

| Issue | Owner | Close When |
|---|---|---|
| Open TheYfactora merge candidate PR from `merge-candidate/alfredo-main-2026-06-06` | Kevin / engineering | PR exists, linked reports are included, CI starts |
| Open or mirror Alfredo PR for the same candidate branch | Alfredo / engineering | Alfredo repo has same candidate SHA and review path |
| Confirm both candidate branches are 1:1 | Engineering | `ls-remote` shows matching SHA on both remotes |
| Decide post-merge mirror process | Kevin + Alfredo | Team knows whether Alfredo tracks upstream by PR, fork sync, or manual mirror |

### R1 - Public Hosting Foundation

| Issue | Owner | Close When |
|---|---|---|
| Keep GitHub Pages deploy on `main` through `.github/workflows/pages.yml` | Engineering | Pages workflow is green after merge |
| Confirm canonical public URL | Kevin | Team agrees on `theyfactora12.github.io/...` or a custom domain |
| Verify HTTPS and custom domain plan | Kevin / engineering | HTTPS is enforced and any custom domain is verified before sharing |
| Confirm Pages artifact matches local layout | Engineering | `index.html`, `.nojekyll`, and `poke-sim/` files deploy correctly |
| Document rollback steps | Engineering | Known-good SHA and redeploy/revert process are written |

### R2 - PR And CI Gates

| Issue | Owner | Close When |
|---|---|---|
| Require CI for PRs into `main` | Repo owner | Branch protection requires green checks before merge |
| Require bundle freshness and cache bump checks | Engineering | UI/source changes cannot ship stale `pokemon-champion-2026.html` or service worker cache |
| Add release-blocking sim truth test group | Engineering | Priority/order/log tests and selected mechanics gates are required for sim changes |
| Separate docs-only and sim-impact release gates | Engineering | Docs can merge without full audit; sim-impact changes run stricter tests |
| Add live Pages smoke after deploy | Josh / engineering | Deployed URL is checked for bundle text, Supabase config, service worker version, and core tab load |
| Add hard-beta mobile/public guardrails | Engineering | Risky public devices are routed to capped paths and cannot trigger unsafe browser stress by default |

### R3 - Showdown Data Pipeline

| Issue | Owner | Close When |
|---|---|---|
| Apply sync/audit DB migrations | Engineering | `showdown_sync_runs`, `showdown_source_files`, and validation tables are live |
| Add entity/diff/override tables | Engineering | `showdown_entities`, `showdown_entity_diffs`, and `champions_overrides` are live |
| Normalize Showdown moves/species/items/abilities/type chart | Engineering | Sync job writes stable IDs, source commit, source hash, and normalized payloads |
| Add Champions override approval flow | Kevin + engineering | Overrides require reason, owner, test, status, and source behavior |
| Generate app assets from approved views | Engineering | Static bundle data comes from approved Showdown rows plus approved Champions overrides |
| Block release on high-severity drift | Engineering | Workflow fails when unapproved critical diffs exist |

### R4 - Supabase Security Baseline

| Issue | Owner | Close When |
|---|---|---|
| Review RLS for all exposed tables | Engineering | Every public schema table has RLS and intentional anon/authenticated policies |
| Keep service-role writes out of browser code | Engineering | Service keys only appear in GitHub Actions, server-side jobs, or local admin workflows |
| Review anon runtime config | Engineering | Browser only receives public anon key and project URL |
| Add read-only public views where needed | Engineering | Public app reads from approved views or policies, not raw admin tables |
| Add live DB smoke tests for DB-relevant PRs | Engineering | CI runs live smoke only when DB/data paths change and secrets exist |

### R5 - Simulation Truth Public Gate

| Issue | Owner | Close When |
|---|---|---|
| Expand turn order gate | Engineering | Priority, Trick Room, Tailwind, paralysis, stat boosts, Choice Scarf, and speed ties pass |
| Expand damage gate | Engineering | Damage formula and Champions damage override path are covered |
| Expand battlefield gate | Engineering | Terrain, weather, status, Protect-family, Quick Guard, spread, and target behavior pass |
| Add long-tail public-beta mechanics gate | Engineering | Multi-effect moves, same-family priority suppression, field/state legality shifts, status interactions, and Fake Out suppression have deterministic tests and visible QA proof |
| Expand Pokemon identity gate | Engineering | Switches, faints, bench movement, leads, item ownership, and consumed items stay stable |
| Add Showdown oracle smoke harness | Engineering | Selected scenarios compare our behavior to Showdown or `@pkmn/sim` outputs |
| Require strict fresh live logs | Josh / Kevin | New exported logs pass `tools/validate-turn-logs.mjs --require-stable` |

### R6 - Public UX Readiness

| Issue | Owner | Close When |
|---|---|---|
| Mobile smoke test | Josh | Core sim, Overview, Review, export logs, and team selection work on common mobile viewport |
| Accessibility pass | Josh / engineering | Keyboard, labels, contrast, focus states, and screen-reader basics pass |
| Performance budget | Engineering | Public page load and interaction stay within agreed budget |
| Feedback and bug-report path | Kevin | Public users know where to submit logs, screenshots, and issues |
| Public-facing docs | Kevin + team | Overview tab, README, release note, and support wording match the actual state |

### R7 - Launch And Rollback

| Issue | Owner | Close When |
|---|---|---|
| Create launch release note | Kevin | Public note says what is supported, what is beta, and what is not coaching yet |
| Record known-good SHA | Engineering | Release doc names commit, workflow run, Pages URL, and bundle size |
| Run post-deploy smoke | Josh / engineering | Public URL passes browser smoke and direct bundle checks |
| Practice rollback | Engineering | Team can revert/redeploy previous known-good build |
| Monitor first feedback | Kevin + Josh | Bugs are triaged into sim truth, data drift, UX, DB, or coaching backlog |

### R8 - Growth After Trust

| Issue | Owner | Close When |
|---|---|---|
| Account and saved history design | Product + engineering | RLS-backed user storage is scoped and local-only mode still works |
| Premium scope | Kevin | Premium does not gate core simulator correctness |
| Human coaching workflow | Kevin / Josh / Alfredo | Human review is separate from automated sim-truth claims |
| Battle IQ / Coach Recommends restart | Product + engineering | R5 and R3 are green, current, and documented |

## Public Release Checklist

Before sharing the site widely:

- [ ] Candidate branch merged to `main` through PR
- [ ] CI green on PR
- [ ] Pages workflow green on `main`
- [ ] Live URL loads over HTTPS
- [ ] Bundle freshness and service worker cache checks pass
- [ ] Supabase anon runtime config works without exposing service-role secrets
- [ ] RLS reviewed for browser-readable tables
- [ ] Showdown DB mirror status is visible in Overview
- [ ] Sim truth gate has no untracked high-severity mechanics gaps
- [ ] Fresh live exported logs pass strict validation
- [ ] Rollback SHA and steps are documented
- [ ] Team knows what is closed, open, paused, and release-blocking

## Communication Rule

Every release update to the team should answer four questions:

1. What changed?
2. What proof do we have?
3. What is still open or risky?
4. Does this move simulator truth forward?

If a change does not improve correctness, verification, deployment safety, or public usability, it waits behind the simulation-truth gate.
