-- Champions Sim seed data v1
-- Safe to re-run: DELETE existing rows before inserting
-- Run order: schema_v1.sql -> THIS FILE -> rls_policies_v1.sql

-- ============================================================
-- CLEAN SLATE: delete in reverse FK order (all 13 team IDs)
-- ============================================================
DELETE FROM team_members WHERE team_id IN (
  'player','mega_altaria','mega_dragonite','mega_houndoom',
  'rin_sand','suica_sun','cofagrigus_tr',
  'champions_arena_1st','champions_arena_2nd','champions_arena_3rd',
  'chuppa_balance','aurora_veil_froslass','kingambit_sneasler'
);
DELETE FROM teams WHERE team_id IN (
  'player','mega_altaria','mega_dragonite','mega_houndoom',
  'rin_sand','suica_sun','cofagrigus_tr',
  'champions_arena_1st','champions_arena_2nd','champions_arena_3rd',
  'chuppa_balance','aurora_veil_froslass','kingambit_sneasler'
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
  '{"levelCap":50,"bring":6,"choose":4,"gameMode":"doubles"}'::jsonb
);

-- ============================================================
-- TEAMS (all 13)
-- ============================================================
INSERT INTO teams (team_id, name, label, mode, ruleset_id, source, source_ref, description)
VALUES
  ('player',
   'TR Counter Squad', 'YOUR TEAM', 'player',
   'champions_reg_m_doubles_bo3', 'builtin', NULL,
   'Fast offensive pressure with Intimidate + Will-O-Wisp support. Built to break Trick Room before it starts.'),

  ('mega_altaria',
   'Mega Altaria', 'HYBRID RAINBOW', 'opponent',
   'champions_reg_m_doubles_bo3', 'builtin', 'dfdfa66d317cf9d7',
   'Sun-rain hybrid with Trick Room threat via Sinistcha. Prankster Whimsicott provides flexible speed control.'),

  ('mega_dragonite',
   'Mega Dragonite', 'DRAGON RUSH', 'opponent',
   'champions_reg_m_doubles_bo3', 'builtin', 'dd101585183c9ed6',
   'Multiscale Dragonite mega with priority support. Bulky physical sweeper core.'),

  ('mega_houndoom',
   'Mega Houndoom', 'DARK SUN', 'opponent',
   'champions_reg_m_doubles_bo3', 'builtin', '4a87b07998f6c0c4',
   'Flash Fire Houndoom mega under sun. Special attacker with Nasty Plot escalation.'),

  ('rin_sand',
   'Rin Sand', 'SAND STORM', 'opponent',
   'champions_reg_m_doubles_bo3', 'builtin', 'e97ac67f1ce79c33',
   'Sand Stream Tyranitar + Excadrill core. Chip damage via sand + STAB ground/rock spread.'),

  ('suica_sun',
   'Suica Sun', 'SUN OFFENSE', 'opponent',
   'champions_reg_m_doubles_bo3', 'builtin', 'cb48d8b06c73d33b',
   'Drought setter with Chlorophyll sweeper. Fast sun offense with spread damage.'),

  ('cofagrigus_tr',
   'Cofagrigus TR', 'TRICK ROOM', 'opponent',
   'champions_reg_m_doubles_bo3', 'builtin', NULL,
   'Cofagrigus Trick Room setter with slow powerful attackers. Mummy ability disrupts contact moves.'),

  ('champions_arena_1st',
   'Hyungwoo Shin — Champions Arena', '1ST CHAMPIONS ARENA', 'champion_pack',
   'champions_reg_m_doubles_bo3', 'builtin', 'Rental: SQMPYRW6BP',
   'Mega Charizard-Y Sun with Coil Milotic secret weapon. Champions Arena winner April 2026.'),

  ('champions_arena_2nd',
   'Jorge Tabuyo — Champions Arena', '2ND CHAMPIONS ARENA', 'champion_pack',
   'champions_reg_m_doubles_bo3', 'builtin', NULL,
   'Champions Arena Finalist team. Jorge Tabuyo April 2026.'),

  ('champions_arena_3rd',
   'Juan Benitez — Champions Arena', '3RD CHAMPIONS ARENA', 'champion_pack',
   'champions_reg_m_doubles_bo3', 'builtin', NULL,
   'Champions Arena Top 3 team. Juan Benitez April 2026.'),

  ('chuppa_balance',
   'Chuppa Cross IV — Pittsburgh', 'PITTSBURGH CHAMP', 'champion_pack',
   'champions_reg_m_doubles_bo3', 'builtin', NULL,
   'Chuppa Cross IV Pittsburgh Champion balance team.'),

  ('aurora_veil_froslass',
   'Aurora Veil Froslass', 'AURORA VEIL', 'opponent',
   'champions_reg_m_doubles_bo3', 'builtin', NULL,
   'Froslass sets Aurora Veil in Hail. Bulk-up sweepers behind dual screens.'),

  ('kingambit_sneasler',
   'Kingambit + Sneasler Core', 'DARK BLADE', 'opponent',
   'champions_reg_m_doubles_bo3', 'builtin', NULL,
   'Kingambit Supreme Overlord escalation win condition. Sneasler Unburden pressure.');

-- ============================================================
-- TEAM MEMBERS
-- ============================================================

-- player (TR Counter Squad)
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('player', 1, 'Incineroar','Sitrus Berry','Intimidate','Adamant',50,
   '{"hp":244,"atk":68,"def":0,"spa":0,"spd":36,"spe":12}'::jsonb,
   '["Fake Out","Flare Blitz","Parting Shot","Knock Off"]'::jsonb, NULL, 'Support / Pivot'),
  ('player', 2, 'Arcanine','Life Orb','Intimidate','Adamant',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Power Gem","Head Smash","Extreme Speed","Will-O-Wisp"]'::jsonb, NULL, 'TR Breaker / Speed Control'),
  ('player', 3, 'Garchomp','Rocky Helmet','Rough Skin','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Physical Sweeper'),
  ('player', 4, 'Whimsicott','Focus Sash','Prankster','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Tailwind","Sunny Day","Moonblast","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('player', 5, 'Rotom-Wash','Leftovers','Levitate','Bold',50,
   '{"hp":244,"atk":0,"def":52,"spa":212,"spd":0,"spe":0}'::jsonb,
   '["Thunderbolt","Hydro Pump","Will-O-Wisp","Protect"]'::jsonb, NULL, 'Spread Check'),
  ('player', 6, 'Garchomp','Choice Scarf','Sand Veil','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Fire Fang"]'::jsonb, NULL, 'Speed Control / Scarf');

-- mega_altaria
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('mega_altaria', 1, 'Typhlosion-Hisui','Choice Scarf','Frisk','Timid',50,
   '{"hp":2,"atk":0,"def":32,"spa":32,"spd":0,"spe":32}'::jsonb,
   '["Eruption","Heat Wave","Focus Blast","Shadow Ball"]'::jsonb, NULL, 'Scarfer'),
  ('mega_altaria', 2, 'Altaria-Mega','Altarianite','Cloud Nine','Modest',50,
   '{"hp":32,"atk":0,"def":0,"spa":10,"spd":17,"spe":7}'::jsonb,
   '["Protect","Roost","Flamethrower","Hyper Voice"]'::jsonb, NULL, 'Mega Sweeper'),
  ('mega_altaria', 3, 'Incineroar','Sitrus Berry','Intimidate','Careful',50,
   '{"hp":228,"atk":0,"def":20,"spa":0,"spd":252,"spe":8}'::jsonb,
   '["Fake Out","Parting Shot","Knock Off","Flare Blitz"]'::jsonb, NULL, 'Support'),
  ('mega_altaria', 4, 'Whimsicott','Focus Sash','Prankster','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Tailwind","Moonblast","Encore","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('mega_altaria', 5, 'Sinistcha','Covert Cloak','Heatproof','Sassy',50,
   '{"hp":252,"atk":0,"def":4,"spa":0,"spd":252,"spe":0}'::jsonb,
   '["Matcha Gotcha","Shadow Ball","Trick Room","Protect"]'::jsonb, NULL, 'TR Setter'),
  ('mega_altaria', 6, 'Garchomp','Choice Scarf','Rough Skin','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Scarfer');

-- mega_dragonite
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('mega_dragonite', 1, 'Dragonite-Mega','Dragonite-Mega','Multiscale','Adamant',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Extreme Speed","Dragon Dance","Outrage","Fire Punch"]'::jsonb, NULL, 'Mega Sweeper'),
  ('mega_dragonite', 2, 'Incineroar','Sitrus Berry','Intimidate','Careful',50,
   '{"hp":228,"atk":0,"def":20,"spa":0,"spd":252,"spe":8}'::jsonb,
   '["Fake Out","Parting Shot","Knock Off","Flare Blitz"]'::jsonb, NULL, 'Support'),
  ('mega_dragonite', 3, 'Whimsicott','Focus Sash','Prankster','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Tailwind","Moonblast","Encore","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('mega_dragonite', 4, 'Rotom-Heat','Sitrus Berry','Levitate','Bold',50,
   '{"hp":244,"atk":0,"def":60,"spa":196,"spd":4,"spe":4}'::jsonb,
   '["Overheat","Thunderbolt","Will-O-Wisp","Protect"]'::jsonb, NULL, 'Special Attacker'),
  ('mega_dragonite', 5, 'Garchomp','Choice Scarf','Rough Skin','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Scarfer'),
  ('mega_dragonite', 6, 'Amoonguss','Rocky Helmet','Regenerator','Sassy',50,
   '{"hp":252,"atk":0,"def":4,"spa":0,"spd":252,"spe":0}'::jsonb,
   '["Spore","Rage Powder","Pollen Puff","Protect"]'::jsonb, NULL, 'Redirection / Support');

-- mega_houndoom
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('mega_houndoom', 1, 'Houndoom-Mega','Houndoominite','Flash Fire','Modest',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Heat Wave","Dark Pulse","Nasty Plot","Protect"]'::jsonb, NULL, 'Mega Sweeper'),
  ('mega_houndoom', 2, 'Torkoal','Sitrus Berry','Drought','Quiet',50,
   '{"hp":252,"atk":0,"def":252,"spa":4,"spd":0,"spe":0}'::jsonb,
   '["Heat Wave","Earth Power","Yawn","Protect"]'::jsonb, NULL, 'Sun Setter / TR Anchor'),
  ('mega_houndoom', 3, 'Incineroar','Sitrus Berry','Intimidate','Careful',50,
   '{"hp":228,"atk":0,"def":20,"spa":0,"spd":252,"spe":8}'::jsonb,
   '["Fake Out","Parting Shot","Knock Off","Flare Blitz"]'::jsonb, NULL, 'Support'),
  ('mega_houndoom', 4, 'Whimsicott','Focus Sash','Prankster','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Tailwind","Moonblast","Sunny Day","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('mega_houndoom', 5, 'Garchomp','Choice Scarf','Rough Skin','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Scarfer'),
  ('mega_houndoom', 6, 'Amoonguss','Rocky Helmet','Regenerator','Sassy',50,
   '{"hp":252,"atk":0,"def":4,"spa":0,"spd":252,"spe":0}'::jsonb,
   '["Spore","Rage Powder","Pollen Puff","Protect"]'::jsonb, NULL, 'Redirection / Support');

-- rin_sand
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('rin_sand', 1, 'Tyranitar','Choice Scarf','Sand Stream','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Rock Slide","Crunch","Low Kick","Ice Punch"]'::jsonb, NULL, 'Sand Setter / Scarfer'),
  ('rin_sand', 2, 'Excadrill','Life Orb','Sand Rush','Adamant',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Iron Head","Rock Slide","Protect"]'::jsonb, NULL, 'Sand Sweeper'),
  ('rin_sand', 3, 'Incineroar','Sitrus Berry','Intimidate','Careful',50,
   '{"hp":228,"atk":0,"def":20,"spa":0,"spd":252,"spe":8}'::jsonb,
   '["Fake Out","Parting Shot","Knock Off","Flare Blitz"]'::jsonb, NULL, 'Support'),
  ('rin_sand', 4, 'Whimsicott','Focus Sash','Prankster','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Tailwind","Moonblast","Encore","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('rin_sand', 5, 'Garchomp','Rocky Helmet','Rough Skin','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Physical Sweeper'),
  ('rin_sand', 6, 'Rotom-Heat','Sitrus Berry','Levitate','Bold',50,
   '{"hp":244,"atk":0,"def":60,"spa":196,"spd":4,"spe":4}'::jsonb,
   '["Overheat","Thunderbolt","Will-O-Wisp","Protect"]'::jsonb, NULL, 'Special Attacker');

-- suica_sun
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('suica_sun', 1, 'Torkoal','Sitrus Berry','Drought','Quiet',50,
   '{"hp":252,"atk":0,"def":252,"spa":4,"spd":0,"spe":0}'::jsonb,
   '["Heat Wave","Earth Power","Yawn","Protect"]'::jsonb, NULL, 'Sun Setter'),
  ('suica_sun', 2, 'Venusaur-Mega','Venusaurite','Chlorophyll','Modest',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Heat Wave","Sludge Bomb","Giga Drain","Protect"]'::jsonb, NULL, 'Sun Sweeper'),
  ('suica_sun', 3, 'Incineroar','Sitrus Berry','Intimidate','Careful',50,
   '{"hp":228,"atk":0,"def":20,"spa":0,"spd":252,"spe":8}'::jsonb,
   '["Fake Out","Parting Shot","Knock Off","Flare Blitz"]'::jsonb, NULL, 'Support'),
  ('suica_sun', 4, 'Whimsicott','Focus Sash','Prankster','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Tailwind","Sunny Day","Moonblast","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('suica_sun', 5, 'Garchomp','Choice Scarf','Rough Skin','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Scarfer'),
  ('suica_sun', 6, 'Amoonguss','Rocky Helmet','Regenerator','Sassy',50,
   '{"hp":252,"atk":0,"def":4,"spa":0,"spd":252,"spe":0}'::jsonb,
   '["Spore","Rage Powder","Pollen Puff","Protect"]'::jsonb, NULL, 'Redirection / Support');

-- cofagrigus_tr
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('cofagrigus_tr', 1, 'Cofagrigus','Sitrus Berry','Mummy','Sassy',50,
   '{"hp":252,"atk":0,"def":4,"spa":0,"spd":252,"spe":0}'::jsonb,
   '["Trick Room","Shadow Ball","Will-O-Wisp","Protect"]'::jsonb, NULL, 'TR Setter'),
  ('cofagrigus_tr', 2, 'Torkoal','Sitrus Berry','Drought','Quiet',50,
   '{"hp":252,"atk":0,"def":252,"spa":4,"spd":0,"spe":0}'::jsonb,
   '["Heat Wave","Earth Power","Yawn","Protect"]'::jsonb, NULL, 'TR Anchor / Sun'),
  ('cofagrigus_tr', 3, 'Incineroar','Sitrus Berry','Intimidate','Brave',50,
   '{"hp":228,"atk":252,"def":20,"spa":0,"spd":0,"spe":8}'::jsonb,
   '["Fake Out","Flare Blitz","Parting Shot","Knock Off"]'::jsonb, NULL, 'TR Attacker / Support'),
  ('cofagrigus_tr', 4, 'Mudsdale','Assault Vest','Stamina','Brave',50,
   '{"hp":252,"atk":252,"def":4,"spa":0,"spd":0,"spe":0}'::jsonb,
   '["High Horsepower","Heavy Slam","Close Combat","Rock Slide"]'::jsonb, NULL, 'TR Sweeper'),
  ('cofagrigus_tr', 5, 'Amoonguss','Rocky Helmet','Regenerator','Sassy',50,
   '{"hp":252,"atk":0,"def":4,"spa":0,"spd":252,"spe":0}'::jsonb,
   '["Spore","Rage Powder","Pollen Puff","Protect"]'::jsonb, NULL, 'Redirection'),
  ('cofagrigus_tr', 6, 'Garchomp','Assault Vest','Rough Skin','Brave',50,
   '{"hp":252,"atk":252,"def":4,"spa":0,"spd":0,"spe":0}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Fire Fang"]'::jsonb, NULL, 'TR Sweeper');

-- champions_arena_1st
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('champions_arena_1st', 1, 'Charizard-Mega-Y','Charizardite Y','Drought','Modest',50,
   '{"hp":6,"atk":0,"def":16,"spa":30,"spd":0,"spe":14}'::jsonb,
   '["Heat Wave","Weather Ball","Solar Beam","Protect"]'::jsonb, NULL, 'Sun Setter / Spread Attacker'),
  ('champions_arena_1st', 2, 'Incineroar','Sitrus Berry','Intimidate','Careful',50,
   '{"hp":228,"atk":0,"def":20,"spa":0,"spd":252,"spe":8}'::jsonb,
   '["Fake Out","Parting Shot","Knock Off","Flare Blitz"]'::jsonb, NULL, 'Support'),
  ('champions_arena_1st', 3, 'Milotic','Sitrus Berry','Competitive','Bold',50,
   '{"hp":252,"atk":0,"def":252,"spa":4,"spd":0,"spe":0}'::jsonb,
   '["Scald","Ice Beam","Coil","Protect"]'::jsonb, NULL, 'Secret Weapon / Bulk'),
  ('champions_arena_1st', 4, 'Whimsicott','Focus Sash','Prankster','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Tailwind","Sunny Day","Moonblast","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('champions_arena_1st', 5, 'Garchomp','Choice Scarf','Rough Skin','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Scarfer'),
  ('champions_arena_1st', 6, 'Amoonguss','Rocky Helmet','Regenerator','Sassy',50,
   '{"hp":252,"atk":0,"def":4,"spa":0,"spd":252,"spe":0}'::jsonb,
   '["Spore","Rage Powder","Pollen Puff","Protect"]'::jsonb, NULL, 'Redirection');

-- champions_arena_2nd
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('champions_arena_2nd', 1, 'Incineroar','Sitrus Berry','Intimidate','Careful',50,
   '{"hp":228,"atk":0,"def":20,"spa":0,"spd":252,"spe":8}'::jsonb,
   '["Fake Out","Parting Shot","Knock Off","Flare Blitz"]'::jsonb, NULL, 'Support'),
  ('champions_arena_2nd', 2, 'Whimsicott','Focus Sash','Prankster','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Tailwind","Moonblast","Encore","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('champions_arena_2nd', 3, 'Garchomp','Choice Scarf','Rough Skin','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Scarfer'),
  ('champions_arena_2nd', 4, 'Rotom-Wash','Sitrus Berry','Levitate','Bold',50,
   '{"hp":244,"atk":0,"def":52,"spa":212,"spd":0,"spe":0}'::jsonb,
   '["Thunderbolt","Hydro Pump","Will-O-Wisp","Protect"]'::jsonb, NULL, 'Spread Check'),
  ('champions_arena_2nd', 5, 'Amoonguss','Rocky Helmet','Regenerator','Sassy',50,
   '{"hp":252,"atk":0,"def":4,"spa":0,"spd":252,"spe":0}'::jsonb,
   '["Spore","Rage Powder","Pollen Puff","Protect"]'::jsonb, NULL, 'Redirection'),
  ('champions_arena_2nd', 6, 'Arcanine','Life Orb','Intimidate','Adamant',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Extreme Speed","Flare Blitz","Wild Charge","Protect"]'::jsonb, NULL, 'Priority Attacker');

-- champions_arena_3rd
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('champions_arena_3rd', 1, 'Incineroar','Sitrus Berry','Intimidate','Careful',50,
   '{"hp":228,"atk":0,"def":20,"spa":0,"spd":252,"spe":8}'::jsonb,
   '["Fake Out","Parting Shot","Knock Off","Flare Blitz"]'::jsonb, NULL, 'Support'),
  ('champions_arena_3rd', 2, 'Whimsicott','Focus Sash','Prankster','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Tailwind","Moonblast","Encore","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('champions_arena_3rd', 3, 'Garchomp','Rocky Helmet','Rough Skin','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Physical Sweeper'),
  ('champions_arena_3rd', 4, 'Rotom-Wash','Sitrus Berry','Levitate','Bold',50,
   '{"hp":244,"atk":0,"def":52,"spa":212,"spd":0,"spe":0}'::jsonb,
   '["Thunderbolt","Hydro Pump","Will-O-Wisp","Protect"]'::jsonb, NULL, 'Spread Check'),
  ('champions_arena_3rd', 5, 'Amoonguss','Rocky Helmet','Regenerator','Sassy',50,
   '{"hp":252,"atk":0,"def":4,"spa":0,"spd":252,"spe":0}'::jsonb,
   '["Spore","Rage Powder","Pollen Puff","Protect"]'::jsonb, NULL, 'Redirection'),
  ('champions_arena_3rd', 6, 'Torkoal','Sitrus Berry','Drought','Quiet',50,
   '{"hp":252,"atk":0,"def":252,"spa":4,"spd":0,"spe":0}'::jsonb,
   '["Heat Wave","Earth Power","Yawn","Protect"]'::jsonb, NULL, 'Sun Setter');

-- chuppa_balance
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('chuppa_balance', 1, 'Incineroar','Sitrus Berry','Intimidate','Careful',50,
   '{"hp":228,"atk":0,"def":20,"spa":0,"spd":252,"spe":8}'::jsonb,
   '["Fake Out","Parting Shot","Knock Off","Flare Blitz"]'::jsonb, NULL, 'Support'),
  ('chuppa_balance', 2, 'Arcanine','Life Orb','Intimidate','Adamant',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Extreme Speed","Flare Blitz","Wild Charge","Protect"]'::jsonb, NULL, 'Priority Attacker'),
  ('chuppa_balance', 3, 'Garchomp','Rocky Helmet','Rough Skin','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Physical Sweeper'),
  ('chuppa_balance', 4, 'Whimsicott','Focus Sash','Prankster','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Tailwind","Moonblast","Encore","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('chuppa_balance', 5, 'Rotom-Wash','Leftovers','Levitate','Bold',50,
   '{"hp":244,"atk":0,"def":52,"spa":212,"spd":0,"spe":0}'::jsonb,
   '["Thunderbolt","Hydro Pump","Will-O-Wisp","Protect"]'::jsonb, NULL, 'Spread Check'),
  ('chuppa_balance', 6, 'Amoonguss','Rocky Helmet','Regenerator','Sassy',50,
   '{"hp":252,"atk":0,"def":4,"spa":0,"spd":252,"spe":0}'::jsonb,
   '["Spore","Rage Powder","Pollen Puff","Protect"]'::jsonb, NULL, 'Redirection');

-- aurora_veil_froslass
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('aurora_veil_froslass', 1, 'Froslass','Focus Sash','Cursed Body','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Aurora Veil","Blizzard","Shadow Ball","Protect"]'::jsonb, NULL, 'Veil Setter'),
  ('aurora_veil_froslass', 2, 'Incineroar','Sitrus Berry','Intimidate','Careful',50,
   '{"hp":228,"atk":0,"def":20,"spa":0,"spd":252,"spe":8}'::jsonb,
   '["Fake Out","Parting Shot","Knock Off","Flare Blitz"]'::jsonb, NULL, 'Support'),
  ('aurora_veil_froslass', 3, 'Garchomp','Life Orb','Rough Skin','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Physical Sweeper'),
  ('aurora_veil_froslass', 4, 'Whimsicott','Focus Sash','Prankster','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Tailwind","Moonblast","Encore","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('aurora_veil_froslass', 5, 'Rotom-Frost','Sitrus Berry','Levitate','Bold',50,
   '{"hp":244,"atk":0,"def":52,"spa":212,"spd":0,"spe":0}'::jsonb,
   '["Blizzard","Thunderbolt","Will-O-Wisp","Protect"]'::jsonb, NULL, 'Special Attacker'),
  ('aurora_veil_froslass', 6, 'Amoonguss','Rocky Helmet','Regenerator','Sassy',50,
   '{"hp":252,"atk":0,"def":4,"spa":0,"spd":252,"spe":0}'::jsonb,
   '["Spore","Rage Powder","Pollen Puff","Protect"]'::jsonb, NULL, 'Redirection');

-- kingambit_sneasler
INSERT INTO team_members (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag) VALUES
  ('kingambit_sneasler', 1, 'Kingambit','Assault Vest','Supreme Overlord','Adamant',50,
   '{"hp":252,"atk":252,"def":4,"spa":0,"spd":0,"spe":0}'::jsonb,
   '["Kowtow Cleave","Iron Head","Sucker Punch","Low Kick"]'::jsonb, NULL, 'Win Condition / Supreme Overlord'),
  ('kingambit_sneasler', 2, 'Sneasler','Life Orb','Unburden','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Close Combat","Poison Jab","Acrobatics","Protect"]'::jsonb, NULL, 'Unburden Sweeper'),
  ('kingambit_sneasler', 3, 'Incineroar','Sitrus Berry','Intimidate','Careful',50,
   '{"hp":228,"atk":0,"def":20,"spa":0,"spd":252,"spe":8}'::jsonb,
   '["Fake Out","Parting Shot","Knock Off","Flare Blitz"]'::jsonb, NULL, 'Support'),
  ('kingambit_sneasler', 4, 'Whimsicott','Focus Sash','Prankster','Timid',50,
   '{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,
   '["Tailwind","Moonblast","Encore","Protect"]'::jsonb, NULL, 'Speed Control'),
  ('kingambit_sneasler', 5, 'Garchomp','Choice Scarf','Rough Skin','Jolly',50,
   '{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,
   '["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb, NULL, 'Scarfer'),
  ('kingambit_sneasler', 6, 'Amoonguss','Rocky Helmet','Regenerator','Sassy',50,
   '{"hp":252,"atk":0,"def":4,"spa":0,"spd":252,"spe":0}'::jsonb,
   '["Spore","Rage Powder","Pollen Puff","Protect"]'::jsonb, NULL, 'Redirection');
