# Curated Homepage Coverage - August 30, 2026

## Scope And Current State

Primary owner: Source/Data Engineer, with Experience and Release responsibilities.
Independent read-only reviewers: Turing (release/cache) and Goodall (source trust).
This implements the user's explicit news-refresh request as a separate public
information surface. It does not improve or approve battle mechanics, legality,
coaching evidence, team imports, or Supabase rows.

Local candidate: `v2.2.135-curated-news`. Engine remains 1.1.2.
Branch: `audit/project-open-items-2026-07-05`; cached origin comparison is 9 ahead,
3 behind. Existing unrelated edits were preserved. No commit, push, hosted Actions
run, deployment, production migration, or source-truth promotion was performed.

## Sources

Five configured sources were fetched successfully on August 30. The generated
snapshot contains 16 eligible items: four official news, four Victory Road,
one Play! Pokemon Worlds broadcast, four CybertronVGC, and three WolfeyVGC.
This is a curated directory, not a claim that these are currently the best players.

- [Official Champions news](https://champions.pokemon.com/en-us/news/): parse dated article cards, title, outbound source link and publisher artwork. Official announcements still require a separate rules review before affecting legality.
- [Victory Road](https://victoryroad.pro/): use its working `/feed/` endpoint; the previously configured `victoryroadvgc.com` endpoint failed locally. Filter for Champions/current competitive coverage and exclude older-game reports.
- [Play! Pokemon](https://www.youtube.com/@PlayPokemon): channel `UCimuIKQp7_Wlk9lcoSgtaFA`, VGC-titled uploads only. Worlds items are broadcast links, not structured replay evidence or a promise that a stream has ended.
- [CybertronVGC](https://www.youtube.com/@CybertronVGC): channel `UCYoTO-akZCsiusTe4rBxfhA`, Champions-titled uploads only.
- [WolfeyVGC](https://www.youtube.com/@WolfeyVGC): channel `UC9OZkS1Mhl5UvKSiPrYqsxg`, Champions-titled uploads only.

Channel IDs were read from RSS links on the publishers' own profiles. The adapter
checks both feed author/channel identity and each video's channel/URL identity,
including Shorts links and the observed feed-level channel ID without the `UC`
prefix. [YouTube's documented feed topic](https://developers.google.com/youtube/v3/guides/push_notifications)
supports this channel-based intake; no YouTube API key or model API is used.

## Implemented Contracts

- Sort by publication time, not fetch time; date-only official announcements use UTC deterministically.
- At most four items per source, 24 total and 90 days old. Old articles are never relabeled newly published.
- Preserve publication date separately from sync time, source, tier, channel identity, source-policy fingerprint, content type and stale state.
- Strip tracking parameters, deduplicate article URLs, reject unsafe/off-list links and constrain each source's image/CDN hosts. Unknown artwork falls back locally.
- Bounded requests: exact fetch-host allowlists including redirects, 15-second deadline, four redirect attempts and 4 MiB responses.
- No full article bodies, video descriptions, video copies or transcripts are republished. Titles, links, thumbnails and short app-authored category descriptions are shown.
- Partial failures retain only recent, policy-compatible items from the affected source, marked stale. Empty-but-valid feeds differ from malformed feeds.
- Total outage sanitizes the local candidate, retains only compatible stale content and preserves its prior successful timestamp. The job fails visibly; it cannot publish that failed candidate automatically. A currently deployed older artifact is not retroactively changed by a failed job.
- Health report records each source's status, raw-response hash, last success and attempted-check time. Never confuse reachable with exhaustive or rules-approved.
- Home has All, News, Player videos and Worlds broadcasts views, channel links, checked/overdue indicators, previous/next, pause, hover/focus suspension and reduced-motion behavior. Headline and dot clicks use actual item IDs/indices rather than positions in a combined control list.
- Mutable news assets refresh network-first with offline fallback. Response copies are created before asynchronous cache writes, including the same preexisting race in HTML and ordinary-asset writes.
- Windows path resolution in both news tools uses file URL conversion; bundle stdout uses explicit LF newlines so it matches direct file generation byte-for-byte.

No new DB is needed for this public read-only feed: the versioned source registry
and generated static snapshot fit the existing Pages architecture. A later
Supabase-backed editorial/archive service would require its own schema, ownership,
RLS and server-side ingestion review. News never writes approved mechanics rows.

## Schedule And Release Boundary

`.github/workflows/news-feed-sync.yml` prepares candidates every six hours and on
manual dispatch, restricted to canonical repository `main`. GitHub schedules are
best effort, not a guaranteed freshness SLA. The UI marks checks older than a day
overdue. [GitHub scheduling reference](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

The job installs locked tooling, checks all offline tests and creates/updates one
review PR. Existing PR discovery is paginated; multiple candidates, foreign
repository/author, malformed branch/SHA and non-news file changes fail closed.
It checks the three-file boundary before branch checkout and before pushing.
After merging current main, all pending generated JS/HTML is restored from trusted
main before any tool or test runs. It rebuilds only `generated/news_feed.js`, the
HTML bundle and `generated/release_artifact.json`. No force push or direct main
push, Pages dispatch, DB credential or automatic merge is used.

Operators must allow Actions to create PRs, approve the resulting workflow runs,
wait for required checks, review the source-health artifact and merge normally.
[GitHub documents approval-required runs for token-created PRs](https://docs.github.com/en/actions/concepts/security/github_token).
Production Pages gates and deployed artifact readback remain mandatory.

An already-open bundled page keeps its loaded snapshot until navigation/reload;
the eight-second slide rotation is not a background news download. Open-tab feed
polling is a separate follow-up, not a shipped capability.

This is automatic collection and PR preparation, NOT unattended production
publishing. Review throughput limits live freshness. Do not bypass release gates
to hide that distinction. For hands-off publishing later, first design an isolated
data-only deployment that cannot publish pending application code or rules.

## Verification And Remaining Work

Local targeted proof:

- 38 pipeline checks, four resilience checks and eight source-trust guards.
- Eight delayed-cache fetch scenarios, with the response consumed before cache completion.
- 14 executable review-policy scenarios and 24 workflow/diagnostic governance checks.
- Live image-health check: 12 remote thumbnails and four local fallbacks passed.
- Browser: desktop 1682 x 1272, category selection, Worlds image, player-video next navigation, pause and profile links checked. No desktop document overflow observed.
- A 390-pixel iframe preview demonstrated responsive text wrapping and thumbnail rendering. This is not native-device emulation or a complete mobile interaction audit.
- No interactive battles were run for this news task; there are no new battle logs to reconcile and no simulation-accuracy claim.

Full gate: 144 fast files and 12 offline/mock DB files pass. Output:
`poke-sim/artifacts/news-project-gate-closeout.txt`. Earlier failed
runs are retained separately; they exposed stale build/header expectations and
tests requiring obsolete hard-coded news titles. Six release-manifest checks pass,
including exact stdout/file byte equality on Windows. Final bundle SHA-256:
`322e1e37ae01a9cc3b32e188c6f380f1b399fc79f7d0e65379b6b5cb2873510f`.
The release artifact JSON remains the authority for subsequent bundle digests.

Both independent reviewers closed their named findings locally. Hosted workflow,
permissions, PR creation/update and deployed-browser freshness remain unverified.

Next actions:

1. Reconcile the existing branch, review and merge this candidate through the normal gates; enable/verify the scheduled job and its PR permissions on GitHub.
2. Run a hosted refresh, approve/check its PR, deploy and verify the live feed timestamp, artifact digest, categories and cache update.
3. Add a reviewed event-playlist/archive source for complete Worlds coverage. The recent-upload feed is a limited window; this snapshot contains one VGC Worlds broadcast, not every match or the finals.
4. Consider additional verified creator channels and title-filter exceptions through source-registry review. Strict filtering deliberately misses ambiguous titles.
5. Design the data-only publishing boundary if unattended updates are required. Keep that separate from the still-open regulation approval and battle-parity gates.

Disable/rollback: disable an offending source in `tools/news_sources.json`, regenerate
and review the feed; or disable News Feed Sync and deploy the last reviewed artifact.
Changed source policies invalidate incompatible outage fallback data.
