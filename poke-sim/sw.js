// Poke-e-Sim Champion 2026 — Service Worker
// Cache-first strategy for all app assets + sprite CDN
// CACHE_NAME scheme: champions-sim-v{major}-{release-tag}
// MUST be bumped on every release that changes engine.js, data.js, ui.js, or style.css
// Phase 2 automation tracked in #95 (tools/release.sh)

const CACHE_NAME = 'champions-sim-v5-adaptive3';
const SPRITE_CACHE = 'champions-sprites-v1';

const APP_ASSETS = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './engine.js',
  './ui.js',
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
