// Curated source registry for Battle Labs trust surfaces.
// This is not a live legality table. It documents what each source is allowed
// to influence so mechanics truth, legality, meta, and news do not mix.
(function(root) {
  root.CHAMPIONS_SOURCE_REGISTRY = {
    schema_version: 'champions-source-registry-v1',
    last_reviewed: '2026-07-01',
    policy: 'Official and in-game sources define Champion truth. Unknown Champion-specific truth remains needs_verification. Showdown is a baseline/reference oracle, not Champion truth. Competitive sources inform meta and coaching hypotheses only.',
    tiers: [
      {
        id: 'official_champions',
        label: 'Official Champions / Pokemon sources',
        trust: 'highest_for_champion_boundaries',
        use_for: ['release news', 'regulation windows', 'mode support', 'Champion-specific systems', 'public rule boundaries'],
        not_for: ['unpublished edge-case mechanics', 'unsourced complete move legality'],
        sources: [
          { name: 'Pokemon Champions official site', url: 'https://champions.pokemon.com/', status: 'active_manual_review' },
          { name: 'Pokemon.com Champions news', url: 'https://www.pokemon.com/us/search?keyword=Pokemon+Champions', status: 'manual_review_no_stable_rss' },
          { name: 'Play! Pokemon rules and event pages', url: 'https://www.pokemon.com/us/play-pokemon/', status: 'manual_review' },
          { name: 'Pokemon HOME official support/docs', url: 'https://support.pokemon.com/', status: 'manual_review' }
        ]
      },
      {
        id: 'in_game_verified',
        label: 'In-game and replay verified',
        trust: 'highest_for_observed_champion_behavior',
        use_for: ['mechanic confirmation', 'battle-log timing', 'field-state proof', 'QA artifacts', 'legality screenshots when official web is incomplete'],
        not_for: ['global meta claims without sample size', 'rules outside observed scope'],
        sources: [
          { name: 'Champion client regulation screens', url: 'in-game capture', status: 'capture_required' },
          { name: 'Battle Labs QA artifacts', url: 'local qa artifact exports', status: 'active' },
          { name: 'Uploaded battle/replay logs', url: 'user-provided evidence', status: 'active_with_version_tags' }
        ]
      },
      {
        id: 'showdown_reference',
        label: 'Pokemon Showdown reference',
        trust: 'baseline_reference_not_champion_truth',
        use_for: ['species data baseline', 'move metadata baseline', 'target categories', 'learnsets for reference checks', 'mechanic parity tests'],
        not_for: ['Champion legality unless approved by Champion source rows', 'Champion-only mechanics claims'],
        sources: [
          { name: 'Pokemon Showdown data/source', url: 'https://github.com/smogon/pokemon-showdown', status: 'generated_snapshot' },
          { name: 'Generated Battle Labs Showdown snapshot', url: 'generated/pokemon_showdown_legal_data.js', status: 'bundled_runtime_asset' }
        ]
      },
      {
        id: 'competitive_secondary',
        label: 'Competitive and community secondary',
        trust: 'meta_signal_only',
        use_for: ['tournament context', 'common teams', 'archetypes', 'usage hypotheses', 'homepage news when filtered'],
        not_for: ['mechanics truth', 'official legality truth', 'unsourced Champion rules'],
        sources: [
          { name: 'Victory Road', url: 'https://victoryroadvgc.com/feed/', status: 'rss_enabled_filtered' },
          { name: 'Tournament result/team pages', url: 'manual review', status: 'manual_review' },
          { name: 'Guide/wiki mirrors', url: 'secondary cross-check only', status: 'needs_official_or_replay_confirmation' }
        ]
      }
    ]
  };
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
