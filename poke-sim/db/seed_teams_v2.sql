-- Champions Sim seed data v2 (auto-generated)
-- Source: poke-sim/data.js (TEAMS literal, 22 teams)
-- Generator: poke-sim/tools/generate_seed_from_data.py
-- DO NOT EDIT BY HAND. Re-run the generator and commit the diff.
-- Run order: schema_v1.sql -> 2026_04_28_add_teams_metadata_column.sql -> THIS FILE -> rls_policies_v1.sql

-- ============================================================
-- CLEAN SLATE: delete in reverse FK order (all 22 team IDs)
-- ============================================================
DELETE FROM team_members WHERE team_id IN (
  'player',
  'mega_altaria',
  'mega_dragonite',
  'mega_houndoom',
  'rin_sand',
  'suica_sun',
  'cofagrigus_tr',
  'champions_arena_1st',
  'champions_arena_2nd',
  'champions_arena_3rd',
  'chuppa_balance',
  'aurora_veil_froslass',
  'kingambit_sneasler',
  'custom_1776995210260',
  'perish_trap_gengar',
  'rain_offense',
  'trick_room_golurk',
  'sun_offense_charizard',
  'z2r_feitosa_mega_floette',
  'benny_v_mega_froslass',
  'lukasjoel1_sand_gengar',
  'hiroto_imai_snow'
);
DELETE FROM teams WHERE team_id IN (
  'player',
  'mega_altaria',
  'mega_dragonite',
  'mega_houndoom',
  'rin_sand',
  'suica_sun',
  'cofagrigus_tr',
  'champions_arena_1st',
  'champions_arena_2nd',
  'champions_arena_3rd',
  'chuppa_balance',
  'aurora_veil_froslass',
  'kingambit_sneasler',
  'custom_1776995210260',
  'perish_trap_gengar',
  'rain_offense',
  'trick_room_golurk',
  'sun_offense_charizard',
  'z2r_feitosa_mega_floette',
  'benny_v_mega_froslass',
  'lukasjoel1_sand_gengar',
  'hiroto_imai_snow'
);
DELETE FROM rulesets WHERE ruleset_id = 'champions_reg_m_doubles_bo3';

-- ============================================================
-- RULESET
-- ============================================================
INSERT INTO rulesets (ruleset_id, format_group, engine_formatid, description, custom_rules)
VALUES (
  'champions_reg_m_doubles_bo3',
  'Champion',
  'gen9championsvgc2026regma',
  'Champions 2026 Reg M A — Doubles, bring 6 pick 4, level 50, Bo3',
  '{"bring":6,"choose":4,"gameMode":"doubles","levelCap":50}'::jsonb
);

-- ============================================================
-- TEAMS (all 22)
-- ============================================================
INSERT INTO teams (team_id, name, label, mode, ruleset_id, source, source_ref, description)
VALUES
  ('player', 'TR Counter Squad', 'YOUR TEAM', 'player', 'champions_reg_m_doubles_bo3', 'builtin', 'player_tr_counter_v1', 'Fast offensive pressure with Intimidate + Will-O-Wisp support. Built to break Trick Room before it starts.'),
  ('mega_altaria', 'Mega Altaria', 'HYBRID RAINBOW', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'mega_altaria_champions_regma_v1', 'Sun-rain hybrid with Trick Room threat via Sinistcha. Prankster Whimsicott provides flexible speed control.'),
  ('mega_dragonite', 'Mega Dragonite', 'HYBRID RAINBOW', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'mega_dragonite_champions_regma_v1', 'Rain team with Mega Dragonite as the primary sweeper. Basculegion Adaptability + Archaludon Electro Shot under rain.'),
  ('mega_houndoom', 'Mega Houndoom', 'HYBRID RAINBOW', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'mega_houndoom_champions_regma_v1', 'Sun + Trick Room hybrid. Mega Houndoom Solar Power nukes under sun. Flexible TR setters in Sinistcha, Farigiraf, Whimsicott.'),
  ('rin_sand', 'Rin Sand', 'RIN', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'rin_sand_champions_regma_v1', 'Sand offense with Tyranitar + Excadrill core. Sneasler Unburden for burst speed. Dragapult for speed and spread.'),
  ('suica_sun', 'Suica Sun', 'SUICA', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'suica_sun_champions_regma_v1', 'Charizard Y sun offense. Sneasler + Basculegion revenge killers. Incineroar provides Intimidate support.'),
  ('cofagrigus_tr', 'Cofagrigus TR', 'TRICK ROOM', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'cofagrigus_tr_champions_regma_v1', 'Classic Trick Room team. Cofagrigus + Sinistcha lead sets TR. Slow, powerful sweepers underneath.'),
  ('champions_arena_1st', 'Hyungwoo Shin — Champions Arena', '1ST CHAMPIONS ARENA', 'champion_pack', 'champions_reg_m_doubles_bo3', 'builtin', 'champions_arena_1st_v1', 'Mega Charizard-Y Sun with Coil Milotic secret weapon. Champions Arena winner April 2026. Rental: SQMPYRW6BP'),
  ('champions_arena_2nd', 'Jorge Tabuyo — Champions Arena Finalist', '2ND CHAMPIONS ARENA', 'champion_pack', 'champions_reg_m_doubles_bo3', 'builtin', 'champions_arena_2nd_v1', 'Double Mega Charizard-X + Tyranitar with Sinistcha TR fallback. Rental: P08QQ5NU9C'),
  ('champions_arena_3rd', 'Juan Benítez — Champions Arena Top 3', '3RD CHAMPIONS ARENA', 'champion_pack', 'champions_reg_m_doubles_bo3', 'builtin', 'champions_arena_3rd_v1', 'Mega Charizard-Y + Max Speed Kingambit tech. Prankster Whimsicott + Scarf Garchomp. Rental: KN6SNLGUPA'),
  ('chuppa_balance', 'Chuppa Cross IV — Pittsburgh Champion', 'REGIONAL WINNER', 'champion_pack', 'champions_reg_m_doubles_bo3', 'builtin', 'chuppa_balance_sv_v1', 'Adaptability Basculegion + Last Respects win-con. Pittsburgh Regional champion. Focus Sash + Maushold Follow Me.'),
  ('aurora_veil_froslass', 'Mega Froslass — Aurora Veil', 'VEIL TEAM', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'aurora_veil_froslass_champions_regma_v1', 'Mega Froslass Snow Warning sets instant Aurora Veil. Dragonite + Kingambit behind veil. High win-condition team.'),
  ('kingambit_sneasler', 'Kingambit + Sneasler Core', 'META CORE', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'kingambit_sneasler_sv_v1', 'The #1 ranked meta core in Reg M-A. 1,329 teams tracked. Defiant Kingambit punishes Intimidate; Unburden Sneasler cleans up.'),
  ('custom_1776995210260', 'Froslass''s Team', 'CUSTOM', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', NULL, 'Imported via Showdown paste'),
  ('perish_trap_gengar', 'Perish Trap — Mega Gengar', 'PERISH TRAP', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'perish_trap_gengar_champions_regma_v1', 'Mega Gengar Shadow Tag + Perish Song trap core. Sinistcha Rage Powder redirection stalls opponents through perish countdown. Francesco Rasini Champions Arena Top 12.'),
  ('rain_offense', 'Rain Offense — Mega Meganium', 'RAIN', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'rain_offense_meganium_champions_regma_v1', 'Pelipper Drizzle + Basculegion Adaptability Wave Crash + Archaludon Electro Shot rain core. Mega Meganium (Mega Sol) secondary. leoscerni LIGA DA COMUNIDADE #2 Rank #3.'),
  ('trick_room_golurk', 'Trick Room — Mega Golurk', 'TRICK ROOM', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'trick_room_golurk_champions_regma_v1', 'Farigiraf Armor Tail + Trick Room setter, Mega Golurk Iron Fist Headlong Rush sweeper, Torkoal Eruption cleanup. pokefey Torneo Salida Rank #2.'),
  ('sun_offense_charizard', 'Sun Offense — Mega Charizard Y', 'SUN', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'sun_offense_charizard_champions_regma_v1', 'Mega Charizard Y Drought + Torkoal Eruption + Hatterene/Farigiraf Trick Room hybrid. Jiang Jin-Hao Champions Arena Top 5.'),
  ('z2r_feitosa_mega_floette', 'Z2R Feitosa — Mega Floette Balance', 'CHAMPIONS CUP', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'z2r_feitosa_champions_regma_v1', 'Mega Floette Fairy Aura Light of Ruin + Talonflame Gale Wings Tailwind + Basculegion/Kingambit dual wincon. Z2R Feitosa LIGA DA COMUNIDADE #2 Rank #2 15-0-0.'),
  ('benny_v_mega_froslass', 'Benny V — Mega Froslass Wide League', 'WIDE LEAGUE', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'benny_v_champions_regma_v1', 'Mega Froslass Snow Cloak Blizzard + Basculegion Choice Scarf Last Respects + Kingambit closer. Benny V Wide League SNR #84 Rank #2 13-1-0.'),
  ('lukasjoel1_sand_gengar', 'lukasjoel1 — Sand + Mega Gengar ZGG', 'ZGG CUP', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'lukasjoel1_champions_regma_v1', 'Tyranitar Sand Stream + Garchomp Sand Veil + Mega Gengar Shadow Tag trap core. lukasjoel1 ZGG #1 $200 Rank #2 13-2-0.'),
  ('hiroto_imai_snow', 'Hiroto Imai — Snow + Mega Lopunny', 'CHAMPIONS CUP', 'opponent', 'champions_reg_m_doubles_bo3', 'builtin', 'hiroto_imai_snow_champions_regma_v1', 'Vanilluxe Snow Warning + Choice Scarf Blizzard spam, Mega Lopunny Fake Out disruption, Aegislash Stance Change. Hiroto Imai Champions Arena Rank #75.');

-- ============================================================
-- TEAM MEMBERS
-- ============================================================

-- player
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('player', 1, 'Incineroar', 'Sitrus Berry', 'Intimidate', 'Adamant', 50, '{"atk":68,"def":0,"hp":244,"spa":0,"spd":36,"spe":12}'::jsonb, '["Fake Out","Flare Blitz","Parting Shot","Knock Off"]'::jsonb, NULL, 'Support / Pivot'),
  ('player', 2, 'Arcanine', 'Life Orb', 'Intimidate', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Power Gem","Head Smash","Extreme Speed","Will-O-Wisp"]'::jsonb, NULL, 'TR Breaker / Speed Control'),
  ('player', 3, 'Garchomp', 'Rocky Helmet', 'Rough Skin', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Physical Sweeper'),
  ('player', 4, 'Whimsicott', 'Focus Sash', 'Prankster', 'Timid', 50, '{"atk":0,"def":0,"hp":4,"spa":252,"spd":0,"spe":252}'::jsonb, '["Tailwind","Sunny Day","Moonblast","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('player', 5, 'Rotom-Wash', 'Leftovers', 'Levitate', 'Bold', 50, '{"atk":0,"def":52,"hp":244,"spa":212,"spd":0,"spe":0}'::jsonb, '["Thunderbolt","Hydro Pump","Will-O-Wisp","Protect"]'::jsonb, NULL, 'Spread Check'),
  ('player', 6, 'Dragapult', 'Choice Scarf', 'Clear Body', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Dragon Darts","U-turn","Tera Blast","Sucker Punch"]'::jsonb, NULL, 'Speed Control / Scarf Revenge');

-- mega_altaria
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('mega_altaria', 1, 'Typhlosion-Hisui', 'Choice Scarf', 'Frisk', 'Timid', 50, '{"atk":0,"def":32,"hp":2,"spa":32,"spd":0,"spe":32}'::jsonb, '["Eruption","Heat Wave","Focus Blast","Shadow Ball"]'::jsonb, NULL, 'Scarfer'),
  ('mega_altaria', 2, 'Altaria-Mega', 'Altarianite', 'Cloud Nine', 'Modest', 50, '{"atk":0,"def":0,"hp":32,"spa":10,"spd":17,"spe":7}'::jsonb, '["Protect","Roost","Flamethrower","Hyper Voice"]'::jsonb, NULL, 'Mega Sweeper'),
  ('mega_altaria', 3, 'Whimsicott', 'Focus Sash', 'Prankster', 'Serious', 50, '{"atk":0,"def":1,"hp":1,"spa":32,"spd":0,"spe":32}'::jsonb, '["Protect","Sunny Day","Tailwind","Moonblast"]'::jsonb, NULL, 'Speed Control'),
  ('mega_altaria', 4, 'Rotom-Wash', 'Leftovers', 'Levitate', 'Modest', 50, '{"atk":0,"def":10,"hp":32,"spa":23,"spd":0,"spe":1}'::jsonb, '["Protect","Will-O-Wisp","Thunderbolt","Hydro Pump"]'::jsonb, NULL, 'Spread Attacker'),
  ('mega_altaria', 5, 'Sableye', 'Black Glasses', 'Prankster', 'Calm', 50, '{"atk":0,"def":8,"hp":32,"spa":0,"spd":26,"spe":0}'::jsonb, '["Reflect","Light Screen","Recover","Foul Play"]'::jsonb, NULL, 'Screen Setter'),
  ('mega_altaria', 6, 'Sinistcha', 'Sitrus Berry', 'Hospitality', 'Bold', 50, '{"atk":0,"def":30,"hp":32,"spa":1,"spd":1,"spe":2}'::jsonb, '["Trick Room","Life Dew","Rage Powder","Matcha Gotcha"]'::jsonb, NULL, 'TR Setter');

-- mega_dragonite
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('mega_dragonite', 1, 'Dragonite-Mega', 'Dragoninite', 'Multiscale', 'Modest', 50, '{"atk":0,"def":0,"hp":26,"spa":32,"spd":0,"spe":8}'::jsonb, '["Protect","Ice Beam","Thunder","Hurricane"]'::jsonb, NULL, 'Mega Sweeper'),
  ('mega_dragonite', 2, 'Basculegion', 'Choice Scarf', 'Adaptability', 'Jolly', 50, '{"atk":32,"def":2,"hp":0,"spa":0,"spd":0,"spe":32}'::jsonb, '["Wave Crash","Aqua Jet","Flip Turn","Last Respects"]'::jsonb, NULL, 'Scarfer'),
  ('mega_dragonite', 3, 'Liepard', 'Focus Sash', 'Prankster', 'Serious', 50, '{"atk":0,"def":1,"hp":32,"spa":0,"spd":1,"spe":32}'::jsonb, '["Fake Out","Rain Dance","Thunder Wave","Foul Play"]'::jsonb, NULL, 'Support'),
  ('mega_dragonite', 4, 'Archaludon', 'Quick Claw', 'Sturdy', 'Timid', 50, '{"atk":0,"def":0,"hp":1,"spa":32,"spd":1,"spe":32}'::jsonb, '["Protect","Flash Cannon","Dragon Pulse","Electro Shot"]'::jsonb, NULL, 'Rain Abuser'),
  ('mega_dragonite', 5, 'Pelipper', 'Leftovers', 'Drizzle', 'Modest', 50, '{"atk":0,"def":0,"hp":32,"spa":5,"spd":29,"spe":0}'::jsonb, '["Protect","Tailwind","U-turn","Weather Ball"]'::jsonb, NULL, 'Rain Setter'),
  ('mega_dragonite', 6, 'Orthworm', 'Sitrus Berry', 'Earth Eater', 'Careful', 50, '{"atk":1,"def":1,"hp":31,"spa":0,"spd":32,"spe":1}'::jsonb, '["Protect","Helping Hand","Shed Tail","Iron Head"]'::jsonb, NULL, 'Support');

-- mega_houndoom
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('mega_houndoom', 1, 'Houndoom-Mega', 'Houndoominite', 'Solar Power', 'Timid', 50, '{"atk":0,"def":0,"hp":1,"spa":32,"spd":1,"spe":32}'::jsonb, '["Protect","Scorching Sands","Dark Pulse","Heat Wave"]'::jsonb, NULL, 'Mega Sweeper'),
  ('mega_houndoom', 2, 'Torkoal', 'Charcoal', 'Drought', 'Quiet', 50, '{"atk":0,"def":1,"hp":32,"spa":32,"spd":1,"spe":0}'::jsonb, '["Protect","Helping Hand","Heat Wave","Eruption"]'::jsonb, NULL, 'Sun Setter'),
  ('mega_houndoom', 3, 'Whimsicott', 'Focus Sash', 'Prankster', 'Modest', 50, '{"atk":0,"def":0,"hp":32,"spa":32,"spd":1,"spe":1}'::jsonb, '["Trick Room","Tailwind","Sunny Day","Moonblast"]'::jsonb, NULL, 'TR/Speed Control'),
  ('mega_houndoom', 4, 'Farigiraf', 'Mental Herb', 'Armor Tail', 'Relaxed', 50, '{"atk":0,"def":20,"hp":26,"spa":1,"spd":19,"spe":0}'::jsonb, '["Trick Room","Helping Hand","Psychic Noise","Hyper Voice"]'::jsonb, NULL, 'TR Setter'),
  ('mega_houndoom', 5, 'Sinistcha', 'Sitrus Berry', 'Hospitality', 'Bold', 50, '{"atk":0,"def":31,"hp":32,"spa":1,"spd":1,"spe":1}'::jsonb, '["Trick Room","Rage Powder","Life Dew","Matcha Gotcha"]'::jsonb, NULL, 'TR Setter'),
  ('mega_houndoom', 6, 'Drampa-Mega', 'Drampanite', 'Cloud Nine', 'Quiet', 50, '{"atk":0,"def":2,"hp":32,"spa":32,"spd":0,"spe":0}'::jsonb, '["Draco Meteor","Hyper Voice","Heat Wave","Thunderbolt"]'::jsonb, NULL, 'Mega Sweeper');

-- rin_sand
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('rin_sand', 1, 'Sneasler', 'White Herb', 'Unburden', 'Jolly', 50, '{"atk":24,"def":3,"hp":6,"spa":0,"spd":1,"spe":32}'::jsonb, '["Close Combat","Dire Claw","Protect","Fake Out"]'::jsonb, NULL, 'Unburden Attacker'),
  ('rin_sand', 2, 'Tyranitar', 'Chople Berry', 'Sand Stream', 'Adamant', 50, '{"atk":16,"def":12,"hp":32,"spa":0,"spd":2,"spe":4}'::jsonb, '["Rock Slide","Knock Off","Protect","Ice Punch"]'::jsonb, NULL, 'Sand Setter'),
  ('rin_sand', 3, 'Rotom-Wash', 'Sitrus Berry', 'Levitate', 'Modest', 50, '{"atk":0,"def":1,"hp":31,"spa":5,"spd":17,"spe":12}'::jsonb, '["Thunderbolt","Hydro Pump","Protect","Volt Switch"]'::jsonb, NULL, 'Pivot'),
  ('rin_sand', 4, 'Excadrill', 'Focus Sash', 'Sand Rush', 'Jolly', 50, '{"atk":32,"def":1,"hp":0,"spa":0,"spd":1,"spe":32}'::jsonb, '["High Horsepower","Iron Head","Protect","Earthquake"]'::jsonb, NULL, 'Sand Rush Sweeper'),
  ('rin_sand', 5, 'Dragapult', 'Colbur Berry', 'Clear Body', 'Jolly', 50, '{"atk":32,"def":0,"hp":2,"spa":0,"spd":0,"spe":32}'::jsonb, '["Dragon Darts","Phantom Force","Protect","Will-O-Wisp"]'::jsonb, NULL, 'Fast Attacker'),
  ('rin_sand', 6, 'Meganium', 'Meganiumite', 'Overgrow', 'Modest', 50, '{"atk":0,"def":0,"hp":26,"spa":32,"spd":0,"spe":8}'::jsonb, '["Solar Beam","Dazzling Gleam","Protect","Weather Ball"]'::jsonb, NULL, 'Mega Support');

-- suica_sun
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('suica_sun', 1, 'Charizard', 'Charizardite Y', 'Blaze', 'Modest', 50, '{"atk":0,"def":16,"hp":6,"spa":31,"spd":0,"spe":13}'::jsonb, '["Heat Wave","Air Slash","Weather Ball","Protect"]'::jsonb, NULL, 'Mega Sweeper'),
  ('suica_sun', 2, 'Sneasler', 'White Herb', 'Unburden', 'Adamant', 50, '{"atk":32,"def":2,"hp":0,"spa":0,"spd":0,"spe":32}'::jsonb, '["Close Combat","Dire Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Physical Sweeper'),
  ('suica_sun', 3, 'Basculegion', 'Choice Scarf', 'Adaptability', 'Jolly', 50, '{"atk":32,"def":2,"hp":0,"spa":0,"spd":0,"spe":32}'::jsonb, '["Wave Crash","Last Respects","Aqua Jet","Flip Turn"]'::jsonb, NULL, 'Scarfer'),
  ('suica_sun', 4, 'Garchomp', 'Haban Berry', 'Rough Skin', 'Adamant', 50, '{"atk":20,"def":0,"hp":24,"spa":0,"spd":1,"spe":21}'::jsonb, '["Dragon Claw","Earthquake","Rock Slide","Protect"]'::jsonb, NULL, 'Physical Sweeper'),
  ('suica_sun', 5, 'Incineroar', 'Sitrus Berry', 'Intimidate', 'Adamant', 50, '{"atk":5,"def":7,"hp":32,"spa":0,"spd":16,"spe":6}'::jsonb, '["Throat Chop","Flare Blitz","Parting Shot","Fake Out"]'::jsonb, NULL, 'Support'),
  ('suica_sun', 6, 'Venusaur', 'Focus Sash', 'Chlorophyll', 'Modest', 50, '{"atk":0,"def":1,"hp":0,"spa":32,"spd":1,"spe":32}'::jsonb, '["Energy Ball","Sludge Bomb","Sleep Powder","Earth Power"]'::jsonb, NULL, 'Sun Abuser');

-- cofagrigus_tr
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('cofagrigus_tr', 1, 'Cofagrigus', 'Mental Herb', 'Mummy', 'Quiet', 50, '{"atk":0,"def":2,"hp":32,"spa":32,"spd":0,"spe":0}'::jsonb, '["Trick Room","Will-O-Wisp","Shadow Ball","Ally Switch"]'::jsonb, NULL, 'TR Setter'),
  ('cofagrigus_tr', 2, 'Sinistcha', 'Sitrus Berry', 'Hospitality', 'Quiet', 50, '{"atk":0,"def":2,"hp":32,"spa":32,"spd":0,"spe":0}'::jsonb, '["Trick Room","Matcha Gotcha","Rage Powder","Life Dew"]'::jsonb, NULL, 'TR Setter'),
  ('cofagrigus_tr', 3, 'Hatterene', 'Life Orb', 'Magic Bounce', 'Quiet', 50, '{"atk":0,"def":0,"hp":32,"spa":32,"spd":2,"spe":0}'::jsonb, '["Psychic","Dazzling Gleam","Shadow Ball","Protect"]'::jsonb, NULL, 'TR Sweeper'),
  ('cofagrigus_tr', 4, 'Cresselia', 'Leftovers', 'Levitate', 'Sassy', 50, '{"atk":0,"def":18,"hp":32,"spa":0,"spd":16,"spe":0}'::jsonb, '["Trick Room","Lunar Dance","Psychic","Helping Hand"]'::jsonb, NULL, 'TR + Revive'),
  ('cofagrigus_tr', 5, 'Dusclops', 'Eviolite', 'Pressure', 'Relaxed', 50, '{"atk":0,"def":18,"hp":32,"spa":0,"spd":16,"spe":0}'::jsonb, '["Trick Room","Will-O-Wisp","Shadow Sneak","Helping Hand"]'::jsonb, NULL, 'TR Support'),
  ('cofagrigus_tr', 6, 'Hatterene', 'Choice Specs', 'Magic Bounce', 'Quiet', 50, '{"atk":0,"def":2,"hp":32,"spa":32,"spd":0,"spe":0}'::jsonb, '["Dazzling Gleam","Psychic","Expanding Force","Mystical Fire"]'::jsonb, NULL, 'TR Sweeper');

-- champions_arena_1st
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('champions_arena_1st', 1, 'Charizard-Mega-Y', 'Charizardite Y', 'Drought', 'Modest', 50, '{"atk":0,"def":16,"hp":6,"spa":30,"spd":0,"spe":14}'::jsonb, '["Heat Wave","Weather Ball","Solar Beam","Protect"]'::jsonb, NULL, 'Sun Setter / Spread Attacker'),
  ('champions_arena_1st', 2, 'Milotic', 'Leftovers', 'Competitive', 'Bold', 50, '{"atk":0,"def":21,"hp":31,"spa":1,"spd":12,"spe":1}'::jsonb, '["Muddy Water","Coil","Hypnosis","Recover"]'::jsonb, NULL, 'Utility / Secret Weapon'),
  ('champions_arena_1st', 3, 'Incineroar', 'Chople Berry', 'Intimidate', 'Serious', 50, '{"atk":0,"def":11,"hp":32,"spa":0,"spd":16,"spe":7}'::jsonb, '["Throat Chop","Parting Shot","Fake Out","Flare Blitz"]'::jsonb, NULL, 'Support / Pivot'),
  ('champions_arena_1st', 4, 'Sneasler', 'White Herb', 'Unburden', 'Adamant', 50, '{"atk":32,"def":0,"hp":2,"spa":0,"spd":0,"spe":32}'::jsonb, '["Fake Out","Close Combat","Dire Claw","Protect"]'::jsonb, NULL, 'Unburden Sweeper'),
  ('champions_arena_1st', 5, 'Garchomp', 'Sitrus Berry', 'Rough Skin', 'Adamant', 50, '{"atk":19,"def":0,"hp":24,"spa":0,"spd":1,"spe":22}'::jsonb, '["Dragon Claw","Rock Slide","Earthquake","Protect"]'::jsonb, NULL, 'Physical Sweeper'),
  ('champions_arena_1st', 6, 'Venusaur', 'Focus Sash', 'Chlorophyll', 'Modest', 50, '{"atk":0,"def":0,"hp":2,"spa":32,"spd":0,"spe":32}'::jsonb, '["Energy Ball","Sludge Bomb","Sleep Powder","Protect"]'::jsonb, NULL, 'Chlorophyll Sweeper');

-- champions_arena_2nd
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('champions_arena_2nd', 1, 'Charizard-Mega-X', 'Charizardite X', 'Tough Claws', 'Adamant', 50, '{"atk":21,"def":1,"hp":14,"spa":0,"spd":1,"spe":29}'::jsonb, '["Flare Blitz","Dragon Claw","Dragon Dance","Protect"]'::jsonb, NULL, 'Setup Sweeper'),
  ('champions_arena_2nd', 2, 'Milotic', 'Leftovers', 'Competitive', 'Calm', 50, '{"atk":0,"def":22,"hp":29,"spa":1,"spd":0,"spe":14}'::jsonb, '["Icy Wind","Scald","Protect","Recover"]'::jsonb, NULL, 'Speed Control / Pivot'),
  ('champions_arena_2nd', 3, 'Sinistcha', 'Sitrus Berry', 'Hospitality', 'Bold', 50, '{"atk":0,"def":5,"hp":31,"spa":1,"spd":29,"spe":0}'::jsonb, '["Matcha Gotcha","Rage Powder","Life Dew","Trick Room"]'::jsonb, NULL, 'TR Setter / Redirect'),
  ('champions_arena_2nd', 4, 'Tyranitar-Mega', 'Tyranitarite', 'Sand Stream', 'Adamant', 50, '{"atk":26,"def":1,"hp":17,"spa":0,"spd":1,"spe":21}'::jsonb, '["Rock Slide","Crunch","High Horsepower","Protect"]'::jsonb, NULL, 'Sand Setter / Physical Attacker'),
  ('champions_arena_2nd', 5, 'Incineroar', 'Sitrus Berry', 'Intimidate', 'Adamant', 50, '{"atk":5,"def":10,"hp":30,"spa":0,"spd":10,"spe":11}'::jsonb, '["Flare Blitz","Throat Chop","Fake Out","Parting Shot"]'::jsonb, NULL, 'Support / Pivot'),
  ('champions_arena_2nd', 6, 'Sneasler', 'White Herb', 'Unburden', 'Adamant', 50, '{"atk":32,"def":0,"hp":0,"spa":0,"spd":2,"spe":32}'::jsonb, '["Dire Claw","Fake Out","Close Combat","Coaching"]'::jsonb, NULL, 'Unburden Sweeper');

-- champions_arena_3rd
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('champions_arena_3rd', 1, 'Charizard-Mega-Y', 'Charizardite Y', 'Drought', 'Timid', 50, '{"atk":0,"def":5,"hp":10,"spa":18,"spd":1,"spe":32}'::jsonb, '["Protect","Heat Wave","Overheat","Solar Beam"]'::jsonb, NULL, 'Sun Setter / Spread Attacker'),
  ('champions_arena_3rd', 2, 'Farigiraf', 'Sitrus Berry', 'Armor Tail', 'Modest', 50, '{"atk":0,"def":12,"hp":31,"spa":10,"spd":13,"spe":0}'::jsonb, '["Psychic","Imprison","Trick Room","Hyper Voice"]'::jsonb, NULL, 'TR Setter / Priority Blocker'),
  ('champions_arena_3rd', 3, 'Garchomp', 'Choice Scarf', 'Rough Skin', 'Adamant', 50, '{"atk":32,"def":0,"hp":2,"spa":0,"spd":0,"spe":32}'::jsonb, '["Earthquake","Dragon Claw","Rock Slide","Stomping Tantrum"]'::jsonb, NULL, 'Speed Control / Sweeper'),
  ('champions_arena_3rd', 4, 'Whimsicott', 'Focus Sash', 'Prankster', 'Timid', 50, '{"atk":0,"def":10,"hp":32,"spa":2,"spd":0,"spe":22}'::jsonb, '["Protect","Moonblast","Tailwind","Encore"]'::jsonb, NULL, 'Prankster Support'),
  ('champions_arena_3rd', 5, 'Sneasler', 'White Herb', 'Unburden', 'Adamant', 50, '{"atk":20,"def":5,"hp":8,"spa":0,"spd":1,"spe":32}'::jsonb, '["Dire Claw","Fake Out","Close Combat","Protect"]'::jsonb, NULL, 'Unburden Sweeper'),
  ('champions_arena_3rd', 6, 'Kingambit', 'Black Glasses', 'Defiant', 'Adamant', 50, '{"atk":25,"def":2,"hp":6,"spa":0,"spd":1,"spe":32}'::jsonb, '["Kowtow Cleave","Sucker Punch","Low Kick","Protect"]'::jsonb, NULL, 'Late-Game Sweeper');

-- chuppa_balance
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('chuppa_balance', 1, 'Basculegion', 'Focus Sash', 'Adaptability', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Liquidation","Last Respects","Aqua Jet","Protect"]'::jsonb, NULL, 'Adaptability Sweeper'),
  ('chuppa_balance', 2, 'Maushold', 'Rocky Helmet', 'Friend Guard', 'Jolly', 50, '{"atk":0,"def":4,"hp":252,"spa":0,"spd":0,"spe":252}'::jsonb, '["Super Fang","Feint","Follow Me","Protect"]'::jsonb, NULL, 'Redirection Support'),
  ('chuppa_balance', 3, 'Dragonite', 'Loaded Dice', 'Multiscale', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Scale Shot","Tailwind","Haze","Protect"]'::jsonb, NULL, 'Tailwind + Multi-hit'),
  ('chuppa_balance', 4, 'Incineroar', 'Safety Goggles', 'Intimidate', 'Careful', 50, '{"atk":4,"def":0,"hp":252,"spa":0,"spd":252,"spe":0}'::jsonb, '["Flare Blitz","Knock Off","Parting Shot","Fake Out"]'::jsonb, NULL, 'Support / Pivot'),
  ('chuppa_balance', 5, 'Ursaluna-Bloodmoon', 'Assault Vest', 'Mind''s Eye', 'Modest', 50, '{"atk":0,"def":4,"hp":252,"spa":252,"spd":0,"spe":0}'::jsonb, '["Blood Moon","Hyper Voice","Earth Power","Vacuum Wave"]'::jsonb, NULL, 'TR Sweeper / Tank'),
  ('chuppa_balance', 6, 'Gholdengo', 'Choice Specs', 'Good as Gold', 'Modest', 50, '{"atk":0,"def":0,"hp":4,"spa":252,"spd":0,"spe":252}'::jsonb, '["Make It Rain","Shadow Ball","Power Gem","Trick"]'::jsonb, NULL, 'Status-Immune Attacker');

-- aurora_veil_froslass
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('aurora_veil_froslass', 1, 'Froslass-Mega', 'Froslassite', 'Snow Warning', 'Timid', 50, '{"atk":0,"def":0,"hp":2,"spa":32,"spd":0,"spe":32}'::jsonb, '["Aurora Veil","Blizzard","Shadow Ball","Protect"]'::jsonb, NULL, 'Veil Setter / Attacker'),
  ('aurora_veil_froslass', 2, 'Dragonite', 'Lum Berry', 'Multiscale', 'Adamant', 50, '{"atk":32,"def":0,"hp":2,"spa":0,"spd":0,"spe":32}'::jsonb, '["Extreme Speed","Dragon Dance","Fire Punch","Protect"]'::jsonb, NULL, 'Multiscale Setup Sweeper'),
  ('aurora_veil_froslass', 3, 'Kingambit', 'Chople Berry', 'Supreme Overlord', 'Adamant', 50, '{"atk":32,"def":0,"hp":2,"spa":0,"spd":0,"spe":32}'::jsonb, '["Kowtow Cleave","Sucker Punch","Low Kick","Protect"]'::jsonb, NULL, 'Supreme Overlord Sweeper'),
  ('aurora_veil_froslass', 4, 'Milotic', 'Life Orb', 'Competitive', 'Modest', 50, '{"atk":0,"def":0,"hp":2,"spa":32,"spd":0,"spe":32}'::jsonb, '["Scald","Ice Beam","Life Dew","Protect"]'::jsonb, NULL, 'Competitive Attacker'),
  ('aurora_veil_froslass', 5, 'Incineroar', 'Sitrus Berry', 'Intimidate', 'Careful', 50, '{"atk":2,"def":0,"hp":32,"spa":0,"spd":32,"spe":0}'::jsonb, '["Fake Out","Parting Shot","Flare Blitz","Knock Off"]'::jsonb, NULL, 'Support / Pivot'),
  ('aurora_veil_froslass', 6, 'Garchomp', 'Rocky Helmet', 'Rough Skin', 'Jolly', 50, '{"atk":32,"def":0,"hp":2,"spa":0,"spd":0,"spe":32}'::jsonb, '["Earthquake","Rock Slide","Dragon Claw","Protect"]'::jsonb, NULL, 'Physical Pressure');

-- kingambit_sneasler
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('kingambit_sneasler', 1, 'Kingambit', 'Black Glasses', 'Defiant', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Kowtow Cleave","Sucker Punch","Low Kick","Protect"]'::jsonb, NULL, 'Primary Win Condition'),
  ('kingambit_sneasler', 2, 'Sneasler', 'White Herb', 'Unburden', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Fake Out","Close Combat","Dire Claw","Protect"]'::jsonb, NULL, 'Unburden Sweeper'),
  ('kingambit_sneasler', 3, 'Incineroar', 'Sitrus Berry', 'Intimidate', 'Careful', 50, '{"atk":4,"def":0,"hp":252,"spa":0,"spd":252,"spe":0}'::jsonb, '["Fake Out","Parting Shot","Flare Blitz","Darkest Lariat"]'::jsonb, NULL, 'Intimidate Chain'),
  ('kingambit_sneasler', 4, 'Garchomp', 'Choice Scarf', 'Rough Skin', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Earthquake","Dragon Claw","Rock Slide","Stomping Tantrum"]'::jsonb, NULL, 'Speed Control'),
  ('kingambit_sneasler', 5, 'Amoonguss', 'Rocky Helmet', 'Regenerator', 'Bold', 50, '{"atk":0,"def":252,"hp":252,"spa":0,"spd":4,"spe":0}'::jsonb, '["Spore","Rage Powder","Sludge Bomb","Protect"]'::jsonb, NULL, 'Redirect / Sleep'),
  ('kingambit_sneasler', 6, 'Rotom-Wash', 'Leftovers', 'Levitate', 'Bold', 50, '{"atk":0,"def":52,"hp":244,"spa":212,"spd":0,"spe":0}'::jsonb, '["Thunderbolt","Hydro Pump","Will-O-Wisp","Protect"]'::jsonb, NULL, 'Utility / Status');

-- custom_1776995210260
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('custom_1776995210260', 1, 'Froslass', 'Froslassite', 'Snow Cloak', 'Timid', 50, '{"atk":0,"def":0,"hp":2,"spa":32,"spd":0,"spe":32}'::jsonb, '["Blizzard","Shadow Ball","Aurora Veil","Protect"]'::jsonb, NULL, ''),
  ('custom_1776995210260', 2, 'Glaceon', 'Shell Bell', 'Ice Body', 'Modest', 50, '{"atk":0,"def":32,"hp":0,"spa":32,"spd":2,"spe":0}'::jsonb, '["Blizzard","Freeze-Dry","Protect","Calm Mind"]'::jsonb, NULL, ''),
  ('custom_1776995210260', 3, 'Ninetales-Alola', 'Focus Sash', 'Snow Warning', 'Modest', 50, '{"atk":0,"def":0,"hp":2,"spa":32,"spd":0,"spe":32}'::jsonb, '["Aurora Veil","Blizzard","Moonblast","Encore"]'::jsonb, NULL, ''),
  ('custom_1776995210260', 4, 'Milotic', 'Leftovers', 'Competitive', 'Calm', 50, '{"atk":0,"def":0,"hp":0,"spa":32,"spd":32,"spe":2}'::jsonb, '["Blizzard","Scald","Weather Ball","Life Dew"]'::jsonb, NULL, ''),
  ('custom_1776995210260', 5, 'Sneasler', 'Sitrus Berry', 'Unburden', 'Jolly', 50, '{"atk":32,"def":0,"hp":2,"spa":0,"spd":0,"spe":32}'::jsonb, '["Fake Out","Dire Claw","Close Combat","Rock Tomb"]'::jsonb, NULL, ''),
  ('custom_1776995210260', 6, 'Farigiraf', 'Choice Scarf', 'Cud Chew', 'Modest', 50, '{"atk":0,"def":0,"hp":32,"spa":32,"spd":2,"spe":0}'::jsonb, '["Hyper Voice","Psychic","Trick Room","Protect"]'::jsonb, NULL, '');

-- perish_trap_gengar
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('perish_trap_gengar', 1, 'Gengar-Mega', 'Gengarite', 'Shadow Tag', 'Timid', 50, '{"atk":0,"def":0,"hp":4,"spa":252,"spd":0,"spe":252}'::jsonb, '["Shadow Ball","Sludge Bomb","Perish Song","Protect"]'::jsonb, NULL, 'Mega Trapper'),
  ('perish_trap_gengar', 2, 'Kingambit', 'Black Glasses', 'Defiant', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Kowtow Cleave","Sucker Punch","Low Kick","Protect"]'::jsonb, NULL, 'Late-Game Sweeper'),
  ('perish_trap_gengar', 3, 'Sinistcha', 'Sitrus Berry', 'Hospitality', 'Relaxed', 50, '{"atk":0,"def":252,"hp":252,"spa":4,"spd":0,"spe":0}'::jsonb, '["Matcha Gotcha","Trick Room","Rage Powder","Protect"]'::jsonb, NULL, 'Redirection Support'),
  ('perish_trap_gengar', 4, 'Incineroar', 'Chople Berry', 'Intimidate', 'Careful', 50, '{"atk":4,"def":0,"hp":252,"spa":0,"spd":252,"spe":0}'::jsonb, '["Flare Blitz","Protect","Parting Shot","Fake Out"]'::jsonb, NULL, 'Pivot / Fake Out'),
  ('perish_trap_gengar', 5, 'Kommo-o', 'Leftovers', 'Overcoat', 'Modest', 50, '{"atk":0,"def":0,"hp":4,"spa":252,"spd":0,"spe":252}'::jsonb, '["Clanging Scales","Aura Sphere","Clangorous Soul","Protect"]'::jsonb, NULL, 'Late Cleaner'),
  ('perish_trap_gengar', 6, 'Aerodactyl', 'Focus Sash', 'Unnerve', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Tailwind","Dual Wingbeat","Rock Slide","Protect"]'::jsonb, NULL, 'Speed Control');

-- rain_offense
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('rain_offense', 1, 'Meganium-Mega', 'Meganiumite', 'Mega Sol', 'Modest', 50, '{"atk":0,"def":0,"hp":4,"spa":252,"spd":0,"spe":252}'::jsonb, '["Solar Beam","Weather Ball","Dazzling Gleam","Protect"]'::jsonb, NULL, 'Mega Attacker'),
  ('rain_offense', 2, 'Sableye', 'Lum Berry', 'Prankster', 'Calm', 50, '{"atk":0,"def":4,"hp":252,"spa":0,"spd":252,"spe":0}'::jsonb, '["Foul Play","Rain Dance","Light Screen","Encore"]'::jsonb, NULL, 'Prankster Support'),
  ('rain_offense', 3, 'Archaludon', 'Sitrus Berry', 'Stamina', 'Modest', 50, '{"atk":0,"def":0,"hp":4,"spa":252,"spd":0,"spe":252}'::jsonb, '["Electro Shot","Draco Meteor","Flash Cannon","Protect"]'::jsonb, NULL, 'Rain SpA'),
  ('rain_offense', 4, 'Basculegion', 'Choice Scarf', 'Adaptability', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Wave Crash","Flip Turn","Aqua Jet","Last Respects"]'::jsonb, NULL, 'Scarf Sweeper'),
  ('rain_offense', 5, 'Pelipper', 'Focus Sash', 'Drizzle', 'Modest', 50, '{"atk":0,"def":4,"hp":252,"spa":252,"spd":0,"spe":0}'::jsonb, '["Weather Ball","Hurricane","Tailwind","Protect"]'::jsonb, NULL, 'Weather Setter'),
  ('rain_offense', 6, 'Sneasler', 'White Herb', 'Unburden', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Close Combat","Dire Claw","Fake Out","Protect"]'::jsonb, NULL, 'Unburden Sweeper');

-- trick_room_golurk
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('trick_room_golurk', 1, 'Incineroar', 'Shuca Berry', 'Intimidate', 'Careful', 50, '{"atk":4,"def":0,"hp":252,"spa":0,"spd":252,"spe":0}'::jsonb, '["Flare Blitz","Throat Chop","Parting Shot","Fake Out"]'::jsonb, NULL, 'Pivot'),
  ('trick_room_golurk', 2, 'Farigiraf', 'Sitrus Berry', 'Armor Tail', 'Relaxed', 50, '{"atk":0,"def":4,"hp":252,"spa":252,"spd":0,"spe":0}'::jsonb, '["Hyper Voice","Psychic","Helping Hand","Trick Room"]'::jsonb, NULL, 'TR Setter'),
  ('trick_room_golurk', 3, 'Golurk-Mega', 'Golurkite', 'Iron Fist', 'Brave', 50, '{"atk":0,"def":4,"hp":252,"spa":252,"spd":0,"spe":0}'::jsonb, '["Protect","Headlong Rush","Poltergeist","Ice Punch"]'::jsonb, NULL, 'Mega TR Sweeper'),
  ('trick_room_golurk', 4, 'Sneasler', 'White Herb', 'Unburden', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Close Combat","Dire Claw","Fake Out","Coaching"]'::jsonb, NULL, 'Unburden'),
  ('trick_room_golurk', 5, 'Torkoal', 'Charcoal', 'Drought', 'Quiet', 50, '{"atk":0,"def":4,"hp":252,"spa":252,"spd":0,"spe":0}'::jsonb, '["Protect","Heat Wave","Eruption","Weather Ball"]'::jsonb, NULL, 'TR Attacker'),
  ('trick_room_golurk', 6, 'Venusaur', 'Focus Sash', 'Chlorophyll', 'Modest', 50, '{"atk":0,"def":0,"hp":4,"spa":252,"spd":0,"spe":252}'::jsonb, '["Protect","Leaf Storm","Sludge Bomb","Sleep Powder"]'::jsonb, NULL, 'Sun Abuser / Sash');

-- sun_offense_charizard
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('sun_offense_charizard', 1, 'Incineroar', 'White Herb', 'Intimidate', 'Adamant', 50, '{"atk":4,"def":0,"hp":252,"spa":0,"spd":252,"spe":0}'::jsonb, '["Flare Blitz","Darkest Lariat","Close Combat","Fake Out"]'::jsonb, NULL, 'Pivot'),
  ('sun_offense_charizard', 2, 'Hatterene', 'Fairy Feather', 'Magic Bounce', 'Relaxed', 50, '{"atk":0,"def":4,"hp":252,"spa":252,"spd":0,"spe":0}'::jsonb, '["Psychic","Trick Room","Dazzling Gleam","Protect"]'::jsonb, NULL, 'TR Setter'),
  ('sun_offense_charizard', 3, 'Farigiraf', 'Sitrus Berry', 'Armor Tail', 'Relaxed', 50, '{"atk":0,"def":4,"hp":252,"spa":252,"spd":0,"spe":0}'::jsonb, '["Hyper Voice","Trick Room","Psychic","Protect"]'::jsonb, NULL, 'TR Setter 2'),
  ('sun_offense_charizard', 4, 'Torkoal', 'Charcoal', 'Drought', 'Modest', 50, '{"atk":0,"def":4,"hp":252,"spa":252,"spd":0,"spe":0}'::jsonb, '["Eruption","Weather Ball","Earth Power","Protect"]'::jsonb, NULL, 'Sun Setter'),
  ('sun_offense_charizard', 5, 'Kingambit', 'Black Glasses', 'Defiant', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Kowtow Cleave","Sucker Punch","Iron Head","Swords Dance"]'::jsonb, NULL, 'Sweeper'),
  ('sun_offense_charizard', 6, 'Charizard-Mega-Y', 'Charizardite Y', 'Solar Power', 'Modest', 50, '{"atk":0,"def":0,"hp":4,"spa":252,"spd":0,"spe":252}'::jsonb, '["Heat Wave","Overheat","Solar Beam","Protect"]'::jsonb, NULL, 'Mega Attacker');

-- z2r_feitosa_mega_floette
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('z2r_feitosa_mega_floette', 1, 'Talonflame', 'Sharp Beak', 'Gale Wings', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Protect","Dual Wingbeat","Flare Blitz","Tailwind"]'::jsonb, NULL, 'Priority Tailwind'),
  ('z2r_feitosa_mega_floette', 2, 'Garchomp', 'Roseli Berry', 'Rough Skin', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Protect","Rock Slide","Earthquake","Dragon Claw"]'::jsonb, NULL, 'Physical Attacker'),
  ('z2r_feitosa_mega_floette', 3, 'Basculegion', 'Sitrus Berry', 'Adaptability', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Protect","Liquidation","Last Respects","Aqua Jet"]'::jsonb, NULL, 'Revenge Killer'),
  ('z2r_feitosa_mega_floette', 4, 'Kingambit', 'Black Glasses', 'Defiant', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Protect","Sucker Punch","Iron Head","Kowtow Cleave"]'::jsonb, NULL, 'Late-Game Cleaner'),
  ('z2r_feitosa_mega_floette', 5, 'Sneasler', 'White Herb', 'Unburden', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Protect","Close Combat","Gunk Shot","Fake Out"]'::jsonb, NULL, 'Fast Attacker'),
  ('z2r_feitosa_mega_floette', 6, 'Floette (Eternal Flower)-Mega', 'Floettite', 'Fairy Aura', 'Timid', 50, '{"atk":0,"def":0,"hp":4,"spa":252,"spd":0,"spe":252}'::jsonb, '["Protect","Light of Ruin","Dazzling Gleam","Moonblast"]'::jsonb, NULL, 'Mega Special Wall-Breaker');

-- benny_v_mega_froslass
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('benny_v_mega_froslass', 1, 'Basculegion', 'Choice Scarf', 'Adaptability', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Wave Crash","Last Respects","Icy Wind","Flip Turn"]'::jsonb, NULL, 'Scarf Sweeper'),
  ('benny_v_mega_froslass', 2, 'Kingambit', 'Black Glasses', 'Defiant', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Kowtow Cleave","Sucker Punch","Swords Dance","Protect"]'::jsonb, NULL, 'Late-Game Cleaner'),
  ('benny_v_mega_froslass', 3, 'Rotom-Heat', 'Leftovers', 'Levitate', 'Bold', 50, '{"atk":0,"def":252,"hp":252,"spa":0,"spd":4,"spe":0}'::jsonb, '["Thunderbolt","Overheat","Will-O-Wisp","Protect"]'::jsonb, NULL, 'Burn Support'),
  ('benny_v_mega_froslass', 4, 'Froslass-Mega', 'Froslassite', 'Snow Cloak', 'Timid', 50, '{"atk":0,"def":0,"hp":4,"spa":252,"spd":0,"spe":252}'::jsonb, '["Blizzard","Shadow Ball","Taunt","Protect"]'::jsonb, NULL, 'Mega Snow Attacker'),
  ('benny_v_mega_froslass', 5, 'Sneasler', 'Focus Sash', 'Poison Touch', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Close Combat","Dire Claw","Fake Out","Protect"]'::jsonb, NULL, 'Fake Out + Sash'),
  ('benny_v_mega_froslass', 6, 'Clefable', 'Sitrus Berry', 'Unaware', 'Calm', 50, '{"atk":0,"def":4,"hp":252,"spa":0,"spd":252,"spe":0}'::jsonb, '["Moonblast","Follow Me","Helping Hand","Protect"]'::jsonb, NULL, 'Redirection');

-- lukasjoel1_sand_gengar
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('lukasjoel1_sand_gengar', 1, 'Garchomp', 'Bright Powder', 'Sand Veil', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Sand Attacker'),
  ('lukasjoel1_sand_gengar', 2, 'Tyranitar', 'Shuca Berry', 'Sand Stream', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Rock Slide","Low Kick","Ice Punch","Protect"]'::jsonb, NULL, 'Sand Setter'),
  ('lukasjoel1_sand_gengar', 3, 'Gengar-Mega', 'Gengarite', 'Shadow Tag', 'Timid', 50, '{"atk":0,"def":0,"hp":4,"spa":252,"spd":0,"spe":252}'::jsonb, '["Shadow Ball","Sludge Wave","Focus Blast","Protect"]'::jsonb, NULL, 'Mega Trapper'),
  ('lukasjoel1_sand_gengar', 4, 'Whimsicott', 'Mental Herb', 'Prankster', 'Timid', 50, '{"atk":0,"def":4,"hp":252,"spa":0,"spd":252,"spe":0}'::jsonb, '["Moonblast","Protect","Tailwind","Fake Tears"]'::jsonb, NULL, 'Prankster Support'),
  ('lukasjoel1_sand_gengar', 5, 'Rotom-Wash', 'Leftovers', 'Levitate', 'Bold', 50, '{"atk":0,"def":252,"hp":252,"spa":0,"spd":4,"spe":0}'::jsonb, '["Hydro Pump","Volt Switch","Will-O-Wisp","Protect"]'::jsonb, NULL, 'Burn Pivot'),
  ('lukasjoel1_sand_gengar', 6, 'Sneasler', 'White Herb', 'Unburden', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Close Combat","Dire Claw","Fake Out","Protect"]'::jsonb, NULL, 'Unburden Sweeper');

-- hiroto_imai_snow
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('hiroto_imai_snow', 1, 'Lopunny-Mega', 'Lopunnite', 'Limber', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Close Combat","Fake Out","Encore","Protect"]'::jsonb, NULL, 'Mega Fake Out'),
  ('hiroto_imai_snow', 2, 'Aegislash', 'Spell Tag', 'Stance Change', 'Brave', 50, '{"atk":0,"def":4,"hp":252,"spa":252,"spd":0,"spe":0}'::jsonb, '["Poltergeist","Close Combat","Shadow Sneak","King''s Shield"]'::jsonb, NULL, 'Stance Attacker'),
  ('hiroto_imai_snow', 3, 'Vanilluxe', 'Choice Scarf', 'Snow Warning', 'Modest', 50, '{"atk":0,"def":0,"hp":4,"spa":252,"spd":0,"spe":252}'::jsonb, '["Blizzard","Icy Wind","Freeze-Dry","Ice Shard"]'::jsonb, NULL, 'Snow Setter / Scarf'),
  ('hiroto_imai_snow', 4, 'Garchomp', 'White Herb', 'Rough Skin', 'Jolly', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Dragon Claw","Earthquake","Rock Slide","Protect"]'::jsonb, NULL, 'Physical Attacker'),
  ('hiroto_imai_snow', 5, 'Kingambit', 'Chople Berry', 'Defiant', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Kowtow Cleave","Sucker Punch","Low Kick","Protect"]'::jsonb, NULL, 'Late-Game Cleaner'),
  ('hiroto_imai_snow', 6, 'Basculegion', 'Sitrus Berry', 'Adaptability', 'Adamant', 50, '{"atk":252,"def":0,"hp":4,"spa":0,"spd":0,"spe":252}'::jsonb, '["Wave Crash","Last Respects","Aqua Jet","Protect"]'::jsonb, NULL, 'Revenge Killer');
