-- Champions Sim seed data v1 — IDEMPOTENT (safe to re-run)

-- ── RULESETS ──────────────────────────────────────────────────────────────────
INSERT INTO rulesets (ruleset_id, format_group, engine_formatid, description, custom_rules)
VALUES (
  'champions_reg_m_doubles_bo3',
  'Champion',
  'gen9championsvgc2026regma',
  'Champions 2026 Reg M A — Doubles, bring 6 pick 4, level 50, Bo3',
  '{"levelCap":50,"bring":6,"choose":4,"gameMode":"doubles"}'::jsonb
)
ON CONFLICT (ruleset_id) DO NOTHING;

-- ── TEAMS ─────────────────────────────────────────────────────────────────────
INSERT INTO teams (team_id, name, label, mode, ruleset_id, source, source_ref, description)
VALUES
  ('player','TR Counter Squad','YOUR TEAM','player','champions_reg_m_doubles_bo3','builtin',NULL,'Fast offensive pressure with Intimidate + Will-O-Wisp support. Built to break Trick Room before it starts.'),
  ('mega_altaria','Mega Altaria','HYBRID RAINBOW','opponent','champions_reg_m_doubles_bo3','builtin',NULL,'Sun-rain hybrid with Trick Room threat via Sinistcha. Prankster Whimsicott provides flexible speed control.'),
  ('mega_dragonite','Mega Dragonite','DRAGON STORM','opponent','champions_reg_m_doubles_bo3','builtin',NULL,'Multiscale Dragonite with Dragon Dance. Exploits wide coverage and bulk.'),
  ('mega_houndoom','Mega Houndoom','DARK SUN','opponent','champions_reg_m_doubles_bo3','builtin',NULL,'Special Fire/Dark attacker with Flash Fire and Sun synergy.'),
  ('rin_sand','Rin Sand','SAND OFFENSE','opponent','champions_reg_m_doubles_bo3','builtin',NULL,'Tyranitar sand setter with Excadrill. Chip damage + speed surge pressure.'),
  ('suica_sun','Suica Sun','SUN OFFENSE','opponent','champions_reg_m_doubles_bo3','builtin',NULL,'Torkoal + Venusaur Sun core. Chlorophyll speed doubles in sun.'),
  ('cofagrigus_tr','Cofagrigus TR','TRICK ROOM','opponent','champions_reg_m_doubles_bo3','builtin',NULL,'Mummy spreading Cofagrigus with Brave/Quiet slow attackers inside TR.'),
  ('champions_arena_1st','Hyungwoo Shin — Champions Arena','1ST CHAMPIONS ARENA','champion_pack','champions_reg_m_doubles_bo3','builtin','Rental: SQMPYRW6BP','Mega Charizard-Y Sun with Coil Milotic secret weapon. Champions Arena winner April 2026.'),
  ('champions_arena_2nd','Jorge Tabuyo — Champions Arena','2ND CHAMPIONS ARENA','champion_pack','champions_reg_m_doubles_bo3','builtin',NULL,'Champions Arena Finalist April 2026.'),
  ('champions_arena_3rd','Juan Benitez — Champions Arena','3RD CHAMPIONS ARENA','champion_pack','champions_reg_m_doubles_bo3','builtin',NULL,'Champions Arena Top 3 April 2026.'),
  ('chuppa_balance','Chuppa Cross IV — Pittsburgh Champion','PITTSBURGH CHAMP','champion_pack','champions_reg_m_doubles_bo3','builtin',NULL,'Balanced team from Pittsburgh Regional Champion Chuppa Cross IV.'),
  ('aurora_veil_froslass','Aurora Veil Froslass','VEIL OFFENSE','opponent','champions_reg_m_doubles_bo3','builtin',NULL,'Froslass sets Aurora Veil behind hail. Fragile but fast veil setter.'),
  ('kingambit_sneasler','Kingambit + Sneasler Core','DARK POISON CORE','opponent','champions_reg_m_doubles_bo3','builtin',NULL,'Supreme Overlord Kingambit + Unburden Sneasler. Suicide lead pressure.')
ON CONFLICT (team_id) DO NOTHING;

-- ── TEAM MEMBERS — player ─────────────────────────────────────────────────────
INSERT INTO team_members
  (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag)
VALUES
  ('player',1,'Incineroar','Sitrus Berry','Intimidate','Adamant',50,'{"hp":244,"atk":68,"def":0,"spa":0,"spd":36,"spe":12}'::jsonb,'["Fake Out","Flare Blitz","Parting Shot","Knock Off"]'::jsonb,NULL,'Support / Pivot'),
  ('player',2,'Arcanine','Life Orb','Intimidate','Adamant',50,'{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,'["Power Gem","Head Smash","Extreme Speed","Will-O-Wisp"]'::jsonb,NULL,'TR Breaker / Speed Control'),
  ('player',3,'Garchomp','Rocky Helmet','Rough Skin','Jolly',50,'{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,'["Earthquake","Dragon Claw","Rock Slide","Protect"]'::jsonb,NULL,'Physical Sweeper'),
  ('player',4,'Whimsicott','Focus Sash','Prankster','Timid',50,'{"hp":4,"atk":0,"def":0,"spa":252,"spd":0,"spe":252}'::jsonb,'["Tailwind","Sunny Day","Moonblast","Protect"]'::jsonb,NULL,'Speed Control'),
  ('player',5,'Rotom-Wash','Leftovers','Levitate','Bold',50,'{"hp":244,"atk":0,"def":52,"spa":212,"spd":0,"spe":0}'::jsonb,'["Thunderbolt","Hydro Pump","Will-O-Wisp","Protect"]'::jsonb,NULL,'Spread Check'),
  ('player',6,'Garchomp','Choice Scarf','Sand Veil','Jolly',50,'{"hp":4,"atk":252,"def":0,"spa":0,"spd":0,"spe":252}'::jsonb,'["Earthquake","Dragon Claw","Rock Slide","Fire Fang"]'::jsonb,NULL,'Speed Control / Scarf')
ON CONFLICT DO NOTHING;

-- ── TEAM MEMBERS — mega_altaria ───────────────────────────────────────────────
INSERT INTO team_members
  (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag)
VALUES
  ('mega_altaria',1,'Typhlosion-Hisui','Choice Scarf','Frisk','Timid',50,'{"hp":2,"atk":0,"def":32,"spa":32,"spd":0,"spe":32}'::jsonb,'["Eruption","Heat Wave","Focus Blast","Shadow Ball"]'::jsonb,NULL,'Scarfer'),
  ('mega_altaria',2,'Altaria-Mega','Altarianite','Cloud Nine','Modest',50,'{"hp":32,"atk":0,"def":0,"spa":10,"spd":17,"spe":7}'::jsonb,'["Protect","Roost","Flamethrower","Hyper Voice"]'::jsonb,NULL,'Mega Sweeper')
ON CONFLICT DO NOTHING;

-- ── TEAM MEMBERS — champions_arena_1st ────────────────────────────────────────
INSERT INTO team_members
  (team_id, slot, species, item, ability, nature, level, evs, moves, tera_type, role_tag)
VALUES
  ('champions_arena_1st',1,'Charizard-Mega-Y','Charizardite Y','Drought','Modest',50,'{"hp":6,"atk":0,"def":16,"spa":30,"spd":0,"spe":14}'::jsonb,'["Heat Wave","Weather Ball","Solar Beam","Protect"]'::jsonb,NULL,'Sun Setter / Spread Attacker')
ON CONFLICT DO NOTHING;
