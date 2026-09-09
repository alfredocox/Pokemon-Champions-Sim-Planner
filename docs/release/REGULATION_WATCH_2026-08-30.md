# Regulation Watch And Review Gate

Status: implemented locally, not published or activated on GitHub or Supabase. Source/Data Engineer owns observation; Release and Database Engineers own activation. No competitive rules, runtime files, saved battles or approved data were changed by this slice.

## In Plain Language

The watcher notices a changed rulebook and opens a review task. It does not decide that the new rulebook is correct. A fingerprint identifies exactly what was captured, so a later step cannot quietly substitute different evidence.

New observations stay **Unverified**. The existing simulator still blocks unapproved M-A/M-B competitive runs. A private database candidate is not a public eligibility package.

## Implemented Locally

- `regulation-watch.yml`: daily at 12:43 UTC on canonical `main`, also manually runnable. Serial execution prevents this workflow from creating competing review issues. GitHub schedules are best-effort, not a precise delivery guarantee.
- Reads the official source inventory and discovers linked official articles, including news, strategy, regulation and championship season notices. No Showdown fact is treated as proof of Champions eligibility.
- Bounded requests, exact HTTPS host allowlist, checked redirects and response size limits. Challenge pages, unsupported layouts, PDF/HTML mismatches and outages are reported as unavailable, never unchanged.
- HTML content fingerprints ignore navigation/footer/script changes. PDF changes are byte-level only and explicitly need manual review. Paragraph hashes and small structured mentions are retained, not republished article bodies.
- Review reports show before/after regulation/date/entity mentions, added/removed links, paragraph-change counts and potentially affected bundled teams. Link-only rulebook replacements change the fingerprint, and linked official PDFs are watched. Mentioned entities are not asserted to be legal/banned; dates are not asserted to be effective dates. Imported/private teams and uncatalogued entities remain unassessed.
- One bot review issue per semantic transition, including previously closed issues. A separate reusable source-health issue reports failures. The semantic change key prevents raw navigation differences on retries from duplicating alerts; the candidate digest still binds every captured byte of the canonical evidence envelope. A retry keeps its original review reference. Persisted occurrence counters distinguish A-to-B-to-A-to-B recurrence: the issue reopens with the new exact candidate, preserving the previous review body in a comment.
- Evidence artifacts are retained before alerts; the successful-source baseline advances only after alert publication succeeds. Failed sources retain their last successful snapshot, and failed discovered links remain watched even across catalog/policy changes. Corrupt baselines fail rather than silently reset. Cache eviction can cause a new baseline review and lose recurrence counters; the cache is not approval authority. Durable counter storage remains a follow-up before treating this as a lossless event journal.
- Optional encrypted raw-source retention preserves the exact fetched HTML/PDF bytes without publishing plaintext article bodies. `REGULATION_EVIDENCE_PUBLIC_KEY` selects the operator's RSA public key (2048+ bits); each file uses a random AES-256-GCM key wrapped by RSA-OAEP-SHA256. `sealed-sources/<raw_sha256>.json` can be opened locally with `openSource` in `regulation-evidence.mjs`, the owner's private key and the expected source digest. Private keys are never sent to the watcher. Missing archive configuration is reported explicitly and blocks final rules approval, not observational alerts.
- A separate manual `regulation-stage.yml` selects an exact completed canonical watcher run, attempt and candidate digest. It downloads that artifact, not new upstream content. Protected environment and credential provisioning are activation requirements, not presumed configured.
- CLI staging defaults to offline dry run. Explicit writes require the expected digest and an operator provisioning attestation. Private rows are insert-only, with digest-checked readback; duplicates succeed only if the stored bytes are identical.
- Prepared migration: `poke-sim/db/migrations/20260830225335_regulation_review_candidates.sql`. Fixed `needs_review` / `competitive_use=false`, exact UTF-8 SHA-256 constraint, no public client access, and mutation-blocking triggers. No existing tables, rules or eligibility packages are rewritten.
- The unsafe Showdown writer `--approve` path and workflow approval input are removed/blocked. Unapproved observation/staging is retained. This deliberately disables the old approval shortcut; it does **not** implement the future atomic promotion service.

## Verification

Evidence is local under `poke-sim/artifacts/regulation-watch/`; `candidates.json` is the authoritative manifest for the latest run, and individual digest files identify captured candidates. Repeated local captures can leave older digest files; do not infer membership from directory listing alone.

- Watcher/alert/artifact-policy regression suite: `node --test tests/regulation_watch_tests.mjs` (35 tests, including independent review reproductions and exact encrypted-byte recovery). Recovery applies each source's pending extraction policy exactly once, and relative rulebook links resolve against the final redirect URL.
- Private staging suite: `node tests/regulation_candidate_staging_tests.mjs` (39 checks). HTTP mocked and SQL constraints inspected statically; this is not executed RLS/database proof.
- Legacy approval regressions: `node tests/showdown_db_writer_tests.js` (6 checks) and `node tests/showdown_sync_workflow_tests.js` (4 checks).
- Independent bounded re-review confirmed the identified watch-history, recurrence, challenge-page, link-discovery and policy-recovery defects are fixed. Workflow YAML parsed successfully; hosted execution is still untested.
- Full offline project gate: `npm test`; **146 fast files and 12 offline/mock DB files passed**, zero failures. Retained output: `poke-sim/artifacts/regulation-project-gate.txt`. This is not hosted CI or live SQL execution.
- Live read-only source exercise at `2026-08-30T23:04:56.294Z` discovered all 22 article links on the official Champions index and attempted 31 distinct sources: 7 captured, 24 unavailable (22 required). Official article requests returned challenge layouts, support access varied, and championship pages required JavaScript. The collector intentionally returned nonzero with `--require-complete`. This is incomplete source coverage, not a clean rules validation.
- All 7 captured candidates passed offline staging/digest validation. Production raw-source encryption was not configured; encryption/decryption was tested with ephemeral fixture keys only. No GitHub issues or production DB rows were created in this implementation session.

## Activation Checklist

- [ ] Review/merge the local branch and reconcile outstanding remote changes. Publish workflows to canonical `main`; protect it and require CI.
- [ ] Verify the hosted watcher runs, retains artifacts and can create/update its deduplicated issues. Check subsequent runs and alert delivery, not merely workflow existence. Alfredo's fork intentionally does not independently raise duplicate alerts.
- [ ] Resolve blocked/JavaScript sources through a reviewed permitted capture adapter or manual timestamped evidence. Do not bypass access controls or treat search snippets as complete regulations.
- [ ] Assign an evidence owner, provision `REGULATION_EVIDENCE_PUBLIC_KEY`, keep its private key in the owner's secure storage, and demonstrate decrypt/hash readback. Transfer reviewed encrypted captures into durable private retention before the 90-day Actions artifact expiry. Key recovery and rotation are owner responsibilities; a missing key/capture means a new review is needed.
- [ ] Database owner applies the new migration through the established reviewed process; execute anon/auth denial, insert/readback, duplicate, mutation, digest and malformed-payload tests against the target project.
- [ ] Provision and verify a genuinely limited server-side staging identity. A renamed service-role secret still bypasses RLS and is **not** least privilege. The migration limits service-role privileges on this candidate table only; it does not restrict that role on other tables.
- [ ] Configure GitHub environment `regulation-staging` with required reviewers and main-only access. Only then add `SUPABASE_URL`, `SUPABASE_REGULATION_STAGING_KEY` and set environment variable `REGULATION_STAGING_PROVISIONING_VERIFIED=true` after permissions readback. The variable records operator attestation, not automated proof.
- [ ] Stage one exact retained candidate and record hosted run plus byte-for-byte DB readback. Expired/missing artifacts require a new observation and review, not a silent approval-time refetch.

## Approval And Publication Still Open

Observation and quarantine are implemented. Actual rules approval/publication remains deliberately unavailable until these contracts are delivered:

1. Immutable reviewer decisions must reference the exact candidate digest, complete source evidence, game, regulation revision, format and approved scope. Issue closure/labels and source origin alone are not authorization. If original linked content has changed, obtain a new versioned capture and review its new digest.
2. Compile complete versioned eligibility packages, including species/form relationships, moves, abilities, items, combinations, clauses and effective dates. Missing/contradictory facts remain unknown. The current extractor is a review aid, not an exhaustive rule parser.
3. Validate legality, stats, mechanics, imports and replay fixtures for that package. Existing mechanics and visible-log mismatches are independent blockers.
4. Promote an exact package digest atomically with an immutable approval/release receipt. Do not fetch fresh Showdown or official data during approval; do not mix rows from different historical snapshots or resurrect removed rows.
5. Preserve older packages, bind saved battles to the package they used, and verify DB-to-browser snapshot parity. No runtime reader may consume the private candidate table.
6. Only after staging permissions, retention and failure recovery are proven should daily candidate-to-DB staging be automated. Today's daily observer has no DB credential; DB staging is explicit and protected.

No percentage-of-game-accuracy claim follows from these tooling tests.

## Sources And Related Contracts

- [Official Champions news index](https://champions.pokemon.com/en-us/news/) provides discovery links, not complete eligibility proof.
- [GitHub workflow triggers](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) documents event/permission boundaries.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) documents why service-role bypass is not a restricted client policy.
- [Regulation eligibility contract](../../poke-sim/docs/REGULATION_CONTEXT_AND_ELIGIBILITY.md) remains the separate publication milestone.
