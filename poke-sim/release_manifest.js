// Canonical release identity for the Champions Sim app shell, exports, QA
// artifacts, service worker cache, and GitHub Pages bundle.
// Update this file first for every release; other version surfaces must derive
// from this object or explicitly prove they mirror it.
(function(root) {
  var manifest = {
    schema_version: 'champions-release-manifest-v1',
    build_id: 'v2.2.44-source-confidence-intake',
    release_date: '2026-06-29',
    service_worker_cache: 'champions-sim-v176-source-confidence-intake',
    bundle_name: 'pokemon-champion-2026.html',
    pages_path: 'poke-sim/pokemon-champion-2026.html',
    artifact_manifest: 'generated/release_artifact.json',
    source_sync_policy: 'generated/source_sync_status.js',
    notes: 'Canonical release identity manifest for visible version, exports, QA artifacts, service worker cache, bundle artifact SHA, and deployed bundle checks.'
  };
  root.CHAMPIONS_RELEASE_MANIFEST = manifest;
  if (typeof module !== 'undefined' && module.exports) module.exports = manifest;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
