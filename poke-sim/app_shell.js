// ============================================================
// POKE-E-SIM CHAMPION 2026 — APP SHELL SECURITY + RELEASE BOOT
// ============================================================
// Owns release identity helpers, runtime error surfacing, build-cache refresh,
// and public delegated handlers that must stay small and auditable.
(function(root) {
  'use strict';

  var ChampionsSim = root.ChampionsSim = root.ChampionsSim || {};
  ChampionsSim.appShell = ChampionsSim.appShell || {};

  function csShellEscapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function csShellWarn(message, err) {
    try {
      var logger = ChampionsSim.logger && ChampionsSim.logger.for ? ChampionsSim.logger.for('app-shell') : null;
      if (logger && typeof logger.warn === 'function') {
        logger.warn(message, err);
        return;
      }
    } catch (_e) {}
    try {
      if (root.console && typeof root.console.warn === 'function') root.console.warn(message, err);
    } catch (_e2) {}
  }

  function showRuntimeError(message) {
    try {
      var banner = root.document && root.document.getElementById('runtime-error-banner');
      var text = root.document && root.document.getElementById('runtime-error-text');
      if (!banner || !text) return;
      text.textContent = String(message || 'Unexpected runtime error');
      banner.style.display = '';
    } catch (e) {
      // no-op
    }
  }

  if (typeof root.addEventListener === 'function') {
    root.addEventListener('error', function(ev) {
      var msg = ev && ev.error && ev.error.stack ? ev.error.stack : (ev && ev.message) || 'Uncaught error';
      showRuntimeError(msg);
    });
    root.addEventListener('unhandledrejection', function(ev) {
      var reason = ev && ev.reason && ev.reason.stack ? ev.reason.stack : (ev && ev.reason) || 'Unhandled promise rejection';
      showRuntimeError(reason);
    });
  }

  function csGetBuildId() {
    try {
      var manifest = root.CHAMPIONS_RELEASE_MANIFEST || null;
      if (manifest && manifest.build_id) return String(manifest.build_id);
      var el = root.document && root.document.getElementById('build-version');
      var txt = el && typeof el.textContent === 'string' ? el.textContent.trim() : '';
      return txt || 'v2.2.49-qa-artifact-evidence-intake';
    } catch (e) {
      return 'v2.2.49-qa-artifact-evidence-intake';
    }
  }

  function csGetReleaseManifest() {
    if (root.CHAMPIONS_RELEASE_MANIFEST) return root.CHAMPIONS_RELEASE_MANIFEST;
    return {
      schema_version: 'champions-release-manifest-v1',
      build_id: csGetBuildId(),
      service_worker_cache: null,
      bundle_name: 'pokemon-champion-2026.html'
    };
  }

  function csApplyReleaseManifestToHeader() {
    try {
      var manifest = csGetReleaseManifest();
      var el = root.document && root.document.getElementById('build-version');
      if (el && manifest && manifest.build_id) el.textContent = manifest.build_id;
      if (el && manifest && manifest.service_worker_cache) {
        el.setAttribute('title', 'Release manifest: ' + manifest.build_id + ' | SW cache: ' + manifest.service_worker_cache);
      }
    } catch (e) {
      // Keep fallback header if manifest application fails.
    }
  }

  function csReloadAfterBuildCacheReset(buildId) {
    if (!root.location) return false;
    try {
      var guardKey = 'champions:build-reload:' + String(buildId || 'unknown');
      if (root.sessionStorage && root.sessionStorage.getItem(guardKey)) return false;
      if (root.sessionStorage) root.sessionStorage.setItem(guardKey, '1');
      var url = new URL(root.location.href);
      url.searchParams.set('v', String(buildId || Date.now()));
      url.searchParams.set('fresh', '1');
      root.location.replace(url.toString());
      return true;
    } catch (e) {
      csShellWarn('build refresh reload skipped', e);
      return false;
    }
  }

  function csGetSourceUrl() {
    try {
      var href = (root.location && root.location.href) || null;
      if (!href) return null;
      var url = new URL(href);
      var buildId = csGetBuildId();
      if (buildId) url.searchParams.set('v', String(buildId));
      url.searchParams.set('fresh', '1');
      return url.toString();
    } catch (_e) {
      return null;
    }
  }

  var CS_SPRITE_SLUG_ALIASES = {
    'Charizard-Mega-X': 'charizard-megax',
    'Charizard-Mega-Y': 'charizard-megay',
    'Mewtwo-Mega-X': 'mewtwo-megax',
    'Mewtwo-Mega-Y': 'mewtwo-megay',
    'Mr. Rime': 'mrrime',
    'Kommo-o': 'kommoo',
    'Ninetales-Alola': 'ninetales-alola',
    'Arcanine-Hisui': 'arcanine-hisui',
    'Tauros-Paldea-Combat': 'tauros-paldeacombat',
    'Tauros-Paldea-Blaze': 'tauros-paldeablaze',
    'Tauros-Paldea-Aqua': 'tauros-paldeaaqua',
    'Raichu-Alola': 'raichu-alola',
    'Zoroark-Hisui': 'zoroark-hisui',
    'Lycanroc-Midday': 'lycanroc',
    'Lycanroc-Midnight': 'lycanroc-midnight',
    'Lycanroc-Dusk': 'lycanroc-dusk',
    'Meowstic-M': 'meowstic',
    'Meowstic-F': 'meowstic-f',
    'Gourgeist-Small': 'gourgeist-small',
    'Gourgeist-Average': 'gourgeist',
    'Gourgeist-Large': 'gourgeist-large',
    'Gourgeist-Super': 'gourgeist-super',
    'Basculegion-M': 'basculegion',
    'Basculegion-F': 'basculegion-f',
    'Sinistcha': 'sinistcha'
  };
  var CS_SPRITE_STRIP_SUFFIXES = ['-Mega-X', '-Mega-Y', '-Mega', '-Alola', '-Galar', '-Hisui', '-Paldea', '-Gmax'];

  function csSpriteSlug(name) {
    var raw = String(name || '').trim();
    return CS_SPRITE_SLUG_ALIASES[raw] || raw.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function csSpriteBaseName(name) {
    var raw = String(name || '').trim();
    for (var i = 0; i < CS_SPRITE_STRIP_SUFFIXES.length; i++) {
      var suffix = CS_SPRITE_STRIP_SUFFIXES[i];
      if (raw.endsWith && raw.endsWith(suffix)) return raw.slice(0, -suffix.length);
    }
    return raw.replace(/\s*\([^)]*\)\s*/g, '').trim();
  }

  function csSpriteAniUrlFromSlug(slug) {
    return 'https://play.pokemonshowdown.com/sprites/ani/' + slug + '.gif';
  }

  function csSpriteStaticUrlFromSlug(slug) {
    return 'https://play.pokemonshowdown.com/sprites/gen5/' + slug + '.png';
  }

  function csSpriteStaticFallbackUrl(name) {
    return csSpriteStaticUrlFromSlug(csSpriteSlug(name));
  }

  function csSpriteFallbackUrls(name) {
    var urls = [];
    var exactSlug = csSpriteSlug(name);
    var baseName = csSpriteBaseName(name);
    var baseSlug = baseName && baseName !== String(name || '').trim() ? csSpriteSlug(baseName) : '';
    function add(url) {
      if (url && urls.indexOf(url) === -1) urls.push(url);
    }
    add(csSpriteStaticUrlFromSlug(exactSlug));
    if (baseSlug) add(csSpriteAniUrlFromSlug(baseSlug));
    if (baseSlug) add(csSpriteStaticUrlFromSlug(baseSlug));
    return urls;
  }

  function csSpriteFallbackAttrs(name) {
    var urls = csSpriteFallbackUrls(name);
    return ' data-fallback-src="' + csShellEscapeHtml(urls[0] || '') + '" data-fallback-srcs="' + csShellEscapeHtml(JSON.stringify(urls)) + '" data-fallback-stage="0"';
  }

  function csHandleSpriteError(img) {
    if (!img) return;
    var stage = Number(img.getAttribute('data-fallback-stage') || '0');
    var fallbacks = [];
    try { fallbacks = JSON.parse(img.getAttribute('data-fallback-srcs') || '[]') || []; } catch (_e) {}
    var legacyFallback = img.getAttribute('data-fallback-src') || '';
    if (legacyFallback && fallbacks.indexOf(legacyFallback) === -1) fallbacks.unshift(legacyFallback);
    while (stage < fallbacks.length) {
      var nextUrl = fallbacks[stage];
      stage += 1;
      if (nextUrl && img.src !== nextUrl) {
        img.setAttribute('data-fallback-stage', String(stage));
        img.src = nextUrl;
        return;
      }
    }
    img.setAttribute('data-fallback-stage', String(stage));
    img.style.opacity = '.3';
  }

  function csInitPublicSecurityDelegates() {
    if (!root.document || typeof root.document.addEventListener !== 'function') return;
    if (!root.document.__championsPublicSecurityDelegates) {
      root.document.__championsPublicSecurityDelegates = true;
      root.document.addEventListener('error', function(ev) {
        var target = ev && ev.target;
        if (!target || String(target.tagName || '').toUpperCase() !== 'IMG') return;
        if (!target.getAttribute || !target.getAttribute('data-fallback-src')) return;
        csHandleSpriteError(target);
      }, true);
      root.document.addEventListener('click', function(ev) {
        var target = ev && ev.target;
        var btn = target && target.closest ? target.closest('.speed-tier-toggle') : null;
        if (!btn) return;
        var panel = btn.nextElementSibling;
        if (panel && panel.classList) panel.classList.toggle('open');
      });
    }
  }

  ChampionsSim.appShell.showRuntimeError = showRuntimeError;
  ChampionsSim.appShell.csGetBuildId = csGetBuildId;
  ChampionsSim.appShell.csGetReleaseManifest = csGetReleaseManifest;
  ChampionsSim.appShell.csApplyReleaseManifestToHeader = csApplyReleaseManifestToHeader;
  ChampionsSim.appShell.csReloadAfterBuildCacheReset = csReloadAfterBuildCacheReset;
  ChampionsSim.appShell.csGetSourceUrl = csGetSourceUrl;
  ChampionsSim.appShell.csSpriteStaticFallbackUrl = csSpriteStaticFallbackUrl;
  ChampionsSim.appShell.csSpriteFallbackAttrs = csSpriteFallbackAttrs;
  ChampionsSim.appShell.csHandleSpriteError = csHandleSpriteError;
  ChampionsSim.appShell.csInitPublicSecurityDelegates = csInitPublicSecurityDelegates;

  function csExposeGlobal(name, value) {
    root[name] = value;
    try {
      if (typeof globalThis !== 'undefined') globalThis[name] = value;
    } catch (_e) {}
  }

  csExposeGlobal('showRuntimeError', showRuntimeError);
  csExposeGlobal('csGetBuildId', csGetBuildId);
  csExposeGlobal('csGetReleaseManifest', csGetReleaseManifest);
  csExposeGlobal('csApplyReleaseManifestToHeader', csApplyReleaseManifestToHeader);
  csExposeGlobal('csReloadAfterBuildCacheReset', csReloadAfterBuildCacheReset);
  csExposeGlobal('csGetSourceUrl', csGetSourceUrl);
  csExposeGlobal('csSpriteStaticFallbackUrl', csSpriteStaticFallbackUrl);
  csExposeGlobal('csSpriteFallbackAttrs', csSpriteFallbackAttrs);
  csExposeGlobal('csHandleSpriteError', csHandleSpriteError);
  csExposeGlobal('csInitPublicSecurityDelegates', csInitPublicSecurityDelegates);
})(typeof window !== 'undefined' ? window : globalThis);

