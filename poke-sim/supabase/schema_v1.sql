-- ============================================================
-- CHAMPIONS SIM 2026 — Supabase Schema v1
-- Run this entire script in: Supabase > SQL Editor > New Query > Run
-- Project: ymlahqnshgiarpbgxehp
-- ============================================================

-- Enable UUID extension (already on by default in Supabase)
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE 1: teams
-- Stores each team slot (mirrors the TEAMS object keys in data.js)
-- ============================================================
create table if not exists public.teams (
  id           uuid primary key default uuid_generate_v4(),
  team_key     text not null unique,   -- e.g. 'player', 'mega_altaria'
  display_name text not null,          -- e.g. 'TR Counter Squad'
  format       text not null default 'doubles' check (format in ('singles','doubles')),
  is_custom    boolean not null default false,  -- true = user-imported team
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.teams is 'Top-level team registry. team_key matches TEAMS object keys in data.js.';

-- ============================================================
-- TABLE 2: team_members
-- Each row = one Pokémon on a team (up to 6 per team)
-- ============================================================
create table if not exists public.team_members (
  id           uuid primary key default uuid_generate_v4(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  slot_index   smallint not null check (slot_index between 0 and 5),
  species      text not null,
  nickname     text,
  item         text,
  ability      text,
  tera_type    text,
  nature       text,
  level        smallint not null default 50,
  move1        text,
  move2        text,
  move3        text,
  move4        text,
  ev_hp        smallint default 0,
  ev_atk       smallint default 0,
  ev_def       smallint default 0,
  ev_spa       smallint default 0,
  ev_spd       smallint default 0,
  ev_spe       smallint default 0,
  iv_hp        smallint default 31,
  iv_atk       smallint default 31,
  iv_def       smallint default 31,
  iv_spa       smallint default 31,
  iv_spd       smallint default 31,
  iv_spe       smallint default 31,
  created_at   timestamptz not null default now(),
  unique (team_id, slot_index)
);

comment on table public.team_members is 'Individual Pokémon slots per team. slot_index 0-5.';

-- ============================================================
-- TABLE 3: sim_results
-- Persists every runBoSeries() result for historical win rates
-- ============================================================
create table if not exists public.sim_results (
  id              uuid primary key default uuid_generate_v4(),
  player_key      text not null,
  opponent_key    text not null,
  format          text not null default 'doubles',
  bo_format       smallint not null check (bo_format in (1,3,5,10)),
  player_wins     smallint not null default 0,
  opponent_wins   smallint not null default 0,
  total_games     smallint not null default 0,
  win_rate        numeric(5,4),
  result_label    text,
  session_id      text,
  simulated_at    timestamptz not null default now()
);

comment on table public.sim_results is 'Historical battle sim results. Powers win-rate trends in Pilot Guide.';

-- ============================================================
-- TABLE 4: pilot_notes
-- Stores per-matchup pilot guide text (auto-generated or edited)
-- ============================================================
create table if not exists public.pilot_notes (
  id              uuid primary key default uuid_generate_v4(),
  player_key      text not null,
  opponent_key    text not null,
  verdict         text,
  leads           text,
  win_conditions  text,
  risks           text,
  tips            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (player_key, opponent_key)
);

comment on table public.pilot_notes is 'Matchup coaching notes. One row per player×opponent pair.';

-- ============================================================
-- RLS POLICIES — full anon key access (no login required)
-- ============================================================
alter table public.teams         enable row level security;
alter table public.team_members  enable row level security;
alter table public.sim_results   enable row level security;
alter table public.pilot_notes   enable row level security;

create policy "public_read_teams"         on public.teams         for select using (true);
create policy "public_insert_teams"       on public.teams         for insert with check (true);
create policy "public_update_teams"       on public.teams         for update using (true);
create policy "public_delete_teams"       on public.teams         for delete using (true);

create policy "public_read_members"       on public.team_members  for select using (true);
create policy "public_insert_members"     on public.team_members  for insert with check (true);
create policy "public_update_members"     on public.team_members  for update using (true);
create policy "public_delete_members"     on public.team_members  for delete using (true);

create policy "public_read_results"       on public.sim_results   for select using (true);
create policy "public_insert_results"     on public.sim_results   for insert with check (true);

create policy "public_read_notes"         on public.pilot_notes   for select using (true);
create policy "public_insert_notes"       on public.pilot_notes   for insert with check (true);
create policy "public_update_notes"       on public.pilot_notes   for update using (true);

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_team_members_team_id    on public.team_members(team_id);
create index if not exists idx_sim_results_player      on public.sim_results(player_key, opponent_key);
create index if not exists idx_sim_results_simulated   on public.sim_results(simulated_at desc);
create index if not exists idx_pilot_notes_matchup     on public.pilot_notes(player_key, opponent_key);

-- ============================================================
-- SEED: 13 canonical teams
-- ============================================================
insert into public.teams (team_key, display_name, format, is_custom) values
  ('player',               'TR Counter Squad',             'doubles', false),
  ('mega_altaria',         'Mega Altaria',                 'doubles', false),
  ('mega_dragonite',       'Mega Dragonite',               'doubles', false),
  ('mega_houndoom',        'Mega Houndoom',                'doubles', false),
  ('rin_sand',             'Rin Sand',                     'doubles', false),
  ('suica_sun',            'Suica Sun',                    'doubles', false),
  ('cofagrigus_tr',        'Cofagrigus TR',                'doubles', false),
  ('champions_arena_1st',  'Hyungwoo Shin — Arena 1st',    'doubles', false),
  ('champions_arena_2nd',  'Jorge Tabuyo — Arena 2nd',     'doubles', false),
  ('champions_arena_3rd',  'Juan Benítez — Arena 3rd',     'doubles', false),
  ('chuppa_balance',       'Chuppa Cross IV — Pittsburgh', 'doubles', false),
  ('aurora_veil_froslass', 'Aurora Veil Froslass',         'doubles', false),
  ('kingambit_sneasler',   'Kingambit + Sneasler Core',    'doubles', false)
on conflict (team_key) do nothing;

-- ============================================================
-- DONE.
--   public.teams         — 13 seed rows
--   public.team_members  — empty, populated by app import
--   public.sim_results   — empty, populated by sim runs
--   public.pilot_notes   — empty, populated by Pilot Guide
-- ============================================================
