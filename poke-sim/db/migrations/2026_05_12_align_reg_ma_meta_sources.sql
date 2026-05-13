-- Migration: 2026_05_12_align_reg_ma_meta_sources
-- Purpose: capture the current public Champions Reg M-A usage snapshot without
-- changing simulator mechanics from volatile ladder data.
--
-- Sources checked 2026-05-12:
--   * Smogon stats index: https://www.smogon.com/stats/ and /stats/2026-04/
--   * Pokestats all ratings: https://pokestats.gg/competitive/showdown/champions-vgc-2026-regulation-ma
--   * Pokestats Bo3: https://pokestats.gg/competitive/showdown/champions-vgc-2026-regulation-ma-bo3
--   * ShowdownTier live performance: https://showdowntier.com/
--   * Smogon forum Reg M-A challenge code reference:
--     https://www.smogon.com/forums/threads/champions-4v4-doubles-uu-2026-open-1.3782159/latest

ALTER TABLE prior_snapshots
  ADD COLUMN IF NOT EXISTS usage_data JSONB NOT NULL DEFAULT '{}'::jsonb;

DELETE FROM prior_snapshots
WHERE prior_id = 'reg_ma_meta_2026_05_12_public_sources';

INSERT INTO prior_snapshots (
  prior_id,
  source,
  format,
  cutoff,
  month,
  location,
  usage_data
) VALUES (
  'reg_ma_meta_2026_05_12_public_sources',
  'public_web_pokestats_showdowntier_smogon',
  'gen9championsvgc2026regma',
  NULL,
  DATE '2026-05-01',
  'public web sources checked 2026-05-12',
  '{
    "checked_at": "2026-05-12",
    "formatid": "gen9championsvgc2026regma",
    "policy": "Usage and win-rate data are priors only. Do not change battle mechanics from these rows.",
    "source_audit": {
      "smogon_stats": {
        "url": "https://www.smogon.com/stats/2026-04/",
        "latest_folder_seen": "2026-04",
        "published_at": "2026-05-01 15:23",
        "champions_reg_ma_file_seen": false,
        "note": "Official Smogon stats index was current through 2026-04, but no Champions Reg M-A file was present in the browsed index."
      },
      "smogon_forum": {
        "url": "https://www.smogon.com/forums/threads/champions-4v4-doubles-uu-2026-open-1.3782159/latest",
        "formatid_seen": "gen9championsvgc2026regma",
        "note": "Used only as a format/challenge-code reference, not as usage-rate data."
      },
      "pokestats_all": {
        "url": "https://pokestats.gg/competitive/showdown/champions-vgc-2026-regulation-ma",
        "data_period": "2026-04",
        "refreshed_at": "2026-05-05 12:31 UTC",
        "battles_analyzed": 3122222
      },
      "pokestats_bo3": {
        "url": "https://pokestats.gg/competitive/showdown/champions-vgc-2026-regulation-ma-bo3",
        "data_period": "2026-04",
        "refreshed_at": "2026-05-05 12:31 UTC",
        "battles_analyzed": 239230
      },
      "showdowntier": {
        "url": "https://showdowntier.com/",
        "last_updated_at": "2026-05-12 01:01 UTC",
        "note": "Battle-performance source; usage/win rates differ from Pokestats because methodology differs."
      }
    },
    "pokestats_all_top": [
      {"rank": 1, "pokemon": "Incineroar", "usage_pct": 37.9, "gxe_pct": 84.0},
      {"rank": 2, "pokemon": "Sneasler", "usage_pct": 36.2, "gxe_pct": 85.0},
      {"rank": 3, "pokemon": "Sinistcha", "usage_pct": 28.8, "gxe_pct": 84.0},
      {"rank": 4, "pokemon": "Garchomp", "usage_pct": 28.6, "gxe_pct": 86.0},
      {"rank": 5, "pokemon": "Kingambit", "usage_pct": 22.9, "gxe_pct": 86.0},
      {"rank": 6, "pokemon": "Basculegion", "usage_pct": 21.9, "gxe_pct": 86.0},
      {"rank": 7, "pokemon": "Pelipper", "usage_pct": 16.1, "gxe_pct": 84.0},
      {"rank": 8, "pokemon": "Aerodactyl", "usage_pct": 15.1, "gxe_pct": 84.0},
      {"rank": 9, "pokemon": "Farigiraf", "usage_pct": 14.7, "gxe_pct": 84.0}
    ],
    "pokestats_bo3_top": [
      {"rank": 1, "pokemon": "Sneasler", "usage_pct": 43.5, "gxe_pct": 88.0},
      {"rank": 2, "pokemon": "Incineroar", "usage_pct": 42.6, "gxe_pct": 85.0},
      {"rank": 3, "pokemon": "Garchomp", "usage_pct": 34.4, "gxe_pct": 87.0},
      {"rank": 4, "pokemon": "Sinistcha", "usage_pct": 28.9, "gxe_pct": 84.0},
      {"rank": 5, "pokemon": "Kingambit", "usage_pct": 27.6, "gxe_pct": 88.0},
      {"rank": 6, "pokemon": "Basculegion", "usage_pct": 25.9, "gxe_pct": 88.0},
      {"rank": 7, "pokemon": "Aerodactyl", "usage_pct": 17.5, "gxe_pct": 87.0}
    ],
    "showdowntier_live_top": [
      {"pokemon": "Basculegion", "tier": "A", "usage_pct": 32.93, "win_pct": 52.61},
      {"pokemon": "Kingambit", "tier": "A", "usage_pct": 31.26, "win_pct": 52.12},
      {"pokemon": "Garchomp", "tier": "A", "usage_pct": 31.06, "win_pct": 51.05},
      {"pokemon": "Sneasler", "tier": "B", "usage_pct": 34.71, "win_pct": 50.06},
      {"pokemon": "Aerodactyl", "tier": "B", "usage_pct": 22.65, "win_pct": 50.86},
      {"pokemon": "Archaludon", "tier": "B", "usage_pct": 17.78, "win_pct": 51.42},
      {"pokemon": "Charizard", "tier": "B", "usage_pct": 17.18, "win_pct": 52.18},
      {"pokemon": "Floette-Eternal", "tier": "B", "usage_pct": 13.00, "win_pct": 52.23},
      {"pokemon": "Sinistcha", "tier": "C", "usage_pct": 26.09, "win_pct": 49.55},
      {"pokemon": "Incineroar", "tier": "C", "usage_pct": 25.11, "win_pct": 48.92}
    ],
    "alignment_notes": [
      "Use Pokestats Bo3 as the default tournament-prior ordering for bring/lead recommendations.",
      "Use ShowdownTier only as a recency/performance cross-check until methodology is modeled explicitly.",
      "Keep mechanics and legality sourced from game/rules references, not usage-rate pages."
    ]
  }'::jsonb
);
