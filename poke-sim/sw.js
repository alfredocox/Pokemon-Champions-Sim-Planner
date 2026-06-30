// Poke-e-Sim Champion 2026 Preview — Service Worker
// Cache-first strategy for all app assets + sprite CDN
// CACHE_NAME scheme: champions-sim-v{major}-{release-tag}
// MUST be bumped on every release that changes engine.js, data.js, ui.js, or style.css
// Phase 2 automation tracked in #95 (tools/release.sh)
//
// v37-may-meta-roster [2026-05-22] — Added current May 2026 preloaded meta rosters, explicit species coverage, and synced DB seed artifacts.
// v38-battle-sensei-port [2026-05-24] — Added Battle Sensei replay review tab, replay URL loading, evidence-bound coaching reads, and lead-logic explanations.
// v39-replay-species-normalization [2026-05-24] — Fixed replay gender-token species parsing and Mega event species resolution.
// v40-replay-turn0-legality [2026-05-24] — Added Replay Turn 0 audit and Showdown-derived species/form move legality data.
// v44-trick-room-fix [2026-06-06] — Fixed Trick Room turn order inversion bug;
// added 175 lines of turn order tests; stable replay Pokemon identity; deterministic
// battle audit. Solves CORE_ISSUES #3 (Turn Order) completely.
// v41-move-support-heartbeat [2026-05-24] — Added move support trust layer, replay board sprites, and daily deterministic heartbeat.
// v43-sim-board-bootstrap [2026-05-25] — Refresh shipped assets after adding
// first-load simulator board bootstrap so the website opens closer to the
// preferred local board-first view.
// v36-ui-trust-copy [2026-05-22] — Trust/provenance copy tightening for preview labeling, source wording, and strategy evidence framing.
// v35-regional-form-stats [2026-05-19] — Canonical regional/form stat corrections + shipped form fallback fix.
// v34-mobile-shell-layout [2026-05-15] — Mobile shell layout + bring-order normalization.
// v13-m7-golden-battles [2026-05-09] — M7 (POK-23): golden_battles deterministic regression runner
//                                   fixture + VM runner + 8 test cases; CI enablement for db_m*.js
// v12-m6-history-tab [2026-05-09] — M6 (POK-22): loadAnalysesForPlayer + loadAnalysisLogs;
//                                   history section in Replay Log tab; lazy-load on expand
// v11-m5-import-persist [2026-05-09] — M5 (POK-21): _upsertTeamToDB + saveTeam wired;
//                                     teams + team_members normalized upsert; 3 call sites
// v10-m4-save-analyses [2026-05-09] — M4 (POK-20): _buildAnalysisPayload + saveAnalysis wired in ui.js;
//                                     adapter validation (bo, policy_model, win_rate); fail-soft saves
// v9-m3-init-wired [2026-04-27] — M3 (POK-19): ui.js awaits loadTeamsFromDB() on DOMContentLoaded;
//                                 [DB offline] chip; loadRulesets(); __DISABLE_SUPABASE__ test override
// v8-supabase-live [2026-04-27] — Supabase DB fully wired (real URL + anon key in supabase_adapter.js)
// v7-phase4c2      — previous

// v44-showdown-priority [2026-06-05] - Showdown priority alignment plus exported turn-log validation.
// v45-overview-alfredo-sync [2026-06-06] - Project Overview tab plus Alfredo merge-candidate sync.
// v46-network-first-app-shell [2026-06-06] - Force app-shell HTML refreshes so live exports cannot use stale simulator bundles.
// v47-recoil-faint-cleanup [2026-06-06] - Recoil KOs now mark the attacker fainted before replacement snapshots.
// v48-showdown-primary-moves [2026-06-06] - Showdown move metadata is primary for imported/custom move facts.
// v49-approved-showdown-db [2026-06-07] - Approved Showdown DB migration/generator path staged.
// v50-runtime-data-bridge [2026-06-19] - Added a runtime data/override bridge so
// battle logic reads approved metadata and damage-roll overrides from site code.
// v53-sim-context-team-load [2026-06-21] - Force browser cache/client-state
// rotation after central sim-context and DB team normalization fixes.
// v54-lethal-berry-guard [2026-06-21] - Prevent damage-trigger berries from
// restoring holders that were reduced to 0 HP before faint cleanup.
// v55-champion-item-sp-gate [2026-06-21] - Positive Champions item allowlist,
// SP import/export gate, and stale DB-team rejection before selector rebuild.
// v58-ability-inventory-parity [2026-06-22] - Curated ability inventory coverage,
// ability mechanic guards, and source-drift visibility in the Overview tab.
// v59-target-parity-guard [2026-06-22] - Canonical Showdown target bridge,
// stale opposing-target retarget guard, and target vocabulary drift tests.
// v60-overview-truth-notes [2026-06-22] - Overview truth-board updates for
// current build state, known gaps, and large-run QA log-retention limits.
// v61-qa-artifact-export [2026-06-22] - Retained-evidence QA artifact export
// with build/source metadata and explicit browser retention caps.
// v62-mechanics-stack-guard [2026-06-22] - Type multiplier audit, typed held-item
// damage boosts, and stat/effective-speed turn-log evidence.
// v63-knock-off-guard [2026-06-22] - Knock Off removable-item boost/removal,
// corresponding Mega Stone protection, no-item guard, and Sticky Hold coverage.
// v64-spread-legality-guard [2026-06-22] - Champion SP caps enforced across
// bundled teams, import/editor saves, DB merge, and generated seed artifacts.
// v65-editor-builder-roadmap [2026-06-22] - Overview note for full team-builder UX.
// v66-tera-blast-parity [2026-06-22] - Tera Blast dynamic type/category parity.
// v67-log-target-guard [2026-06-22] - No-valid-target log guard and Overview sync status.
// v68-live-log-proof [2026-06-22] - Overview updated with v2.1.33 live log proof.
// v69-low-kick-weight-parity [2026-06-23] - Showdown species weights and Low Kick variable base-power parity.
// v70-core-move-parity [2026-06-23] - Remaining shipped move parity, secondary effects, accuracy, and special-case damage coverage.
// v71-damage-log-team-catalog [2026-06-23] - Applied-vs-calculated damage logs and approved Champion top-10 runtime catalog.
// v72-log-validator-replacement [2026-06-23] - No-valid-target validator ignores post-turn replacements not available at skip time.
// v73-stable-action-identity [2026-06-23] - Turn-log actions export stable actor/target keys for mirror-species validation.
// v74-turn-log-team-roster [2026-06-23] - Turn-log exports include full team roster metadata for QA review.
// v75-recoil-showdown-context [2026-06-23] - QA baseline exposes Showdown recoil metadata and move text.
// v78-recoil-applied-evidence [2026-06-23] - Recoil effect events separate calculated recoil from actual HP lost.
// v79-targeted-qa-proof [2026-06-24] - Targeted QA proof artifact clears named missing_targeted_proof gates.
// v80-targeted-qa-sweep [2026-06-24] - QA artifact includes forced long-tail mechanics sweep alongside retained normal sim evidence.
// v81-forced-branch-sweep [2026-06-24] - Engine supports forced move/target branches for exhaustive QA sweeps.
// v84-strategy-priority-board [2026-06-24] - Strategy tab prioritizes coach calls before evidence tables.
// v85-sim-test-scope [2026-06-24] - Simulator can scope Run All to selected matchup or the preloaded suite.
// v90-branch-progress-counters [2026-06-24] - Tactical Sweep progress uses branch counters instead of W/L zeroes.
// v91-cache-refresh-reload [2026-06-24] - Reload once after build cache cleanup so testers land on the fresh bundle.
// v92-tactical-depth-selector [2026-06-24] - Tactical Sweep exposes Quick/Deep/Full branch-depth caps.
// v93-team-evidence-dashboard [2026-06-24] - Strategy Dashboard merges per-team sim and tactical evidence.
// v94-tactical-sweep-watchdog [2026-06-24] - Prevent single-opponent tactical sweep from stalling on DB reads/writes.
// v95-terrain-gaps-documented [2026-06-25] - Overview/docs keep terrain gap notes visible.
// v96-approved-db-runtime-contract [2026-06-25] - Narrow Alfredo #241 after live approved DB generation, alias bridge, and source-truth proof.
// v100-terrain-gaps-fixed [2026-06-26] - All 4 terrain mechanics wired (PR #141); sw_local_credentials test updated.
// v101-v2.1.70-release [2026-06-26] - Close stale terrain gap entries in Overview; bump build version to v2.1.70.
// v102-bring-choice-coaching [2026-06-26] - #220: expose benchedTwo in review summary + bring_choice_review coaching tag.
// v103-tactical-turn-log-labels [2026-06-27] - Add tactical_speed_summary labels to turn-log and QA exports.
// v104-tailwind-window-labels [2026-06-27] - Classify first visible active Tailwind windows as converted or without pressure.
// v105-decision-ledger [2026-06-27] - Add first Decision Opportunity Ledger export from tactical speed labels.
// v106-coach-brain-summary [2026-06-27] - Add evidence-bound coach brain summary over decision ledger.
// v107-coach-brain-loop [2026-06-27] - Add observed pattern, root problem, risk, solution, expected result, and shared-learning direction.
// v120-ruleset-team-sections [2026-06-27] - Add regulation-aware team filters and review-only Reg M-B coverage sections.
// v121-regmb-review-cards [2026-06-27] - Render Reg M-B coverage sections as review-only Teams tab cards.
// v122-regmb-addition-rows [2026-06-27] - Add explicit review-only Reg M-B addition rows from Victory Road.
// v123-regmb-visual-review-grid [2026-06-27] - Render visual Reg M-B allowlist rows for human review.
// v124-regmb-sprite-aliases [2026-06-27] - Add explicit form sprite aliases for Reg M-B visual review.
// v125-shared-sprite-aliases [2026-06-27] - Share form sprite aliases across Teams, Simulator, and replay cards.
// v126-paldea-tauros-sprites [2026-06-27] - Correct Paldean Tauros Showdown sprite slugs.
// v127-sprite-fallback-chain [2026-06-27] - Add shared animated-to-static sprite fallback handler.
// v128-alola-raichu-sprite-fallbacks [2026-06-27] - Add Alolan Raichu animated sprite and cover bring/replay fallbacks.
// v129-hisui-zoroark-gif [2026-06-27] - Map Hisuian Zoroark to verified animated and static Showdown sprites.
// v130-gif-primary-sprite-audit [2026-06-27] - Prefer Showdown animated GIFs across standard Pokemon sprite rendering.
// v131-regmb-promotion-gate [2026-06-27] - Surface Reg M-B promotion checklist and data-trust gate.
// v132-regmb-stone-source-pass [2026-06-27] - Source-verify Reg M-B Mega stone names, review-only.
// v133-regmb-stats-types-abilities-source-pass [2026-06-27] - Source-verify Reg M-B Mega stats/types/abilities, review-only.
// v139-secondary-table-consolidation [2026-06-27] - Consolidate simple Showdown secondary effects into one audited table.
// v140-drain-rule-source-audit [2026-06-27] - Read generated Showdown drain metadata for all supported drain moves.
// v141-foul-play-stat-source-audit [2026-06-27] - Correct unusual physical stat-source ability modifiers.
// v142-move-rule-trace-qa [2026-06-27] - Expose move rule traces in QA/replay damage events.
// v143-codex-qa-context-drop [2026-06-27] - Add Codex-ready QA artifact handoff context.
// v144-codex-qa-drop-folder [2026-06-27] - Save QA artifacts to a user-approved local drop folder when supported.
// v145-tactical-sweep-schema [2026-06-28] - Add explicit Tactical Sweep schema/status/opponent metadata to QA artifacts.
// v155-sources-ui-polish [2026-06-28] - Tighten the Sources dashboard layout and refresh the app-shell cache.
// v156-kevin-team-qa [2026-06-28] - Add coached Kevin baseline team, approved team QA matrix, and Seed Sower terrain evidence.
// v158-editor-save-cancel [2026-06-28] - Refresh app shell for explicit editor save and cancel draft controls.
// v159-import-file-feedback [2026-06-28] - Refresh app shell for file import parser feedback and exporter syntax guard.
// v160-move-failure-evidence [2026-06-28] - Refresh app shell for structured move-failure evidence rows.
// v161-replay-log-dedupe [2026-06-28] - Refresh app shell for cleaner resolved replay log display.
// v162-replay-detail-rows [2026-06-28] - Refresh app shell for grouped replay damage/miss/failure details.
// v163-overview-closeout [2026-06-29] - Refresh Overview/release closeout notes and issue status.
// v166-status-resolution-proof [2026-06-29] - Refresh app shell for status resolution/pass-through proof counters.
// v168-bundle-sha-proof [2026-06-29] - Derive app shell cache identity from release_manifest.js.
// v177-team-lab-foundation [2026-06-29] - Add evidence-bound Team Lab backend foundation.
// v178-source-truth-packages [2026-06-29] - Add rule facts and compiled ruleset package foundation.
// v179-sim-evidence-foundation [2026-06-29] - Add Team Lab sim jobs and replay evidence foundation.
// v184-team-lab-newsroom-hub [2026-06-29] - Add Team Lab newsroom hub and Top 25 evidence-locked shell.
// v183-team-lab-milestone-align [2026-06-29] - Align Team Lab empty-state roadmap with M15 GitHub issues.
// v182-sim-evidence-adapter [2026-06-29] - Add Supabase adapter boundary for Team Lab sim evidence jobs and replays.
// v181-qa-artifact-evidence-intake [2026-06-29] - Convert QA artifacts into Team Lab sim evidence and collapse Overview proof archive.
try { importScripts('./release_manifest.js'); } catch (e) { /* fallback below */ }
const RELEASE_MANIFEST = (typeof self !== 'undefined' && self.CHAMPIONS_RELEASE_MANIFEST) ? self.CHAMPIONS_RELEASE_MANIFEST : {};
const CACHE_NAME = RELEASE_MANIFEST.service_worker_cache || 'champions-sim-v184-team-lab-newsroom-hub';
const SPRITE_CACHE = 'champions-sprites-v1';

const APP_ASSETS = [
  './',
  './index.html',
  './pokemon-champion-2026.html',
  './release_manifest.js',
  './generated/release_artifact.json',
  './style.css',
  './storage_adapter.js',
  './data.js',
  './logger.js',
  './generated/pokemon_showdown_legal_data.js',
  './generated/pokemon_showdown_species_weights.js',
  './generated/source_sync_status.js',
  './runtime_data.js',
  './engine.js',
  './rulesets.js',
  './regmb_source_conversion.js',
  './team_lab.js',
  './source_truth.js',
  './sim_evidence.js',
  './move_legality.js',
  './move_support.js',
  './replay_coach.js',
  './replay_learning.js',
  './ui.js',
  './legality.js',
  './strategy-injectable.js',
  './supabase_adapter.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

function isAppShellRequest(event, url) {
  if (event.request.mode === 'navigate') return true;
  try {
    const path = new URL(url).pathname;
    return path.endsWith('/poke-sim/') ||
      path.endsWith('/poke-sim/index.html') ||
      path.endsWith('/poke-sim/pokemon-champion-2026.html');
  } catch {
    return false;
  }
}

// Install — pre-cache all app assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(APP_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate — remove old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== SPRITE_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for app assets, cache-then-network for sprites
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Local credentials are mutable and intentionally untracked. Never cache them;
  // when absent, return an empty JS response so local/offline mode stays quiet.
  if (url.endsWith('/local-credentials.js')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(response => {
        if (response.ok) return response;
        return new Response('', {
          status: 200,
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'no-store'
          }
        });
      }).catch(() => new Response('', {
        status: 200,
        headers: {
          'Content-Type': 'application/javascript',
          'Cache-Control': 'no-store'
        }
      }))
    );
    return;
  }

  // Sprite CDN — cache as we go (stale-while-revalidate)
  if (url.includes('raw.githubusercontent.com') && url.includes('sprites/pokemon')) {
    event.respondWith(
      caches.open(SPRITE_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const fresh = await fetch(event.request);
          if (fresh.ok) cache.put(event.request, fresh.clone());
          return fresh;
        } catch {
          return cached || new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // App shell HTML — network-first so users do not keep running a stale
  // simulator/export bundle after a release. Falls back to cache offline.
  if (isAppShellRequest(event, url)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).then(fresh => {
        if (fresh.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, fresh.clone()));
        }
        return fresh;
      }).catch(() => {
        return caches.match(event.request).then(cached => {
          return cached || caches.match('./index.html') || new Response('', { status: 503 });
        });
      })
    );
    return;
  }

  // App assets — cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(fresh => {
        if (fresh.ok) {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, fresh.clone()));
        }
        return fresh;
      }).catch(() => {
        // Offline fallback: return index.html for navigate requests
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('', { status: 503 });
      });
    })
  );
});

// Message: force update
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
