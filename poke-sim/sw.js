// Poke-e-Sim Champion 2026 — Service Worker
// Cache-first strategy for all app assets + sprite CDN
// CACHE_NAME scheme: champions-sim-v{major}-{release-tag}
// MUST be bumped on every release that changes engine.js, data.js, ui.js, or style.css
// Phase 2 automation tracked in #95 (tools/release.sh)
//
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

const CACHE_NAME = 'champions-sim-v22-sim-db-status';
const SPRITE_CACHE = 'champions-sprites-v1';

const APP_ASSETS = [
  './',
  './index.html',
  './style.css',
  './storage_adapter.js',
  './data.js',
  './engine.js',
  './ui.js',
  './supabase_adapter.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

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
