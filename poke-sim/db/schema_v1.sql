-- Champions Sim DB schema v1

-- RULESETS: formats / modes / rules
CREATE TABLE rulesets (
  ruleset_id      TEXT PRIMARY KEY,
  format_group    TEXT NOT NULL,
  engine_formatid TEXT NOT NULL,
  description     TEXT NOT NULL,
  custom_rules    JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- TEAMS: high-level team metadata
CREATE TABLE teams (
  team_id      TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  label        TEXT NOT NULL,
  mode         TEXT NOT NULL,
  ruleset_id   TEXT REFERENCES rulesets(ruleset_id),
  source       TEXT NOT NULL,
  source_ref   TEXT,
  description  TEXT NOT NULL
);

-- TEAM_MEMBERS: individual Pokémon on teams
CREATE TABLE team_members (
  team_member_id BIGSERIAL PRIMARY KEY,
  team_id        TEXT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
  slot           INT  NOT NULL,
  species        TEXT NOT NULL,
  item           TEXT,
  ability        TEXT,
  nature         TEXT,
  level          INT  NOT NULL DEFAULT 50,
  evs            JSONB NOT NULL DEFAULT '{}'::jsonb,
  moves          JSONB NOT NULL DEFAULT '[]'::jsonb,
  tera_type      TEXT,
  role_tag       TEXT
);

-- PRIOR_SNAPSHOTS: Smogon / ladder / stat priors for hidden info
CREATE TABLE prior_snapshots (
  prior_id   TEXT PRIMARY KEY,
  source     TEXT NOT NULL,
  format     TEXT NOT NULL,
  cutoff     INT,
  month      DATE NOT NULL,
  location   TEXT NOT NULL
);

-- GOLDEN_BATTLES: deterministic test suite for mechanics parity
CREATE TABLE golden_battles (
  golden_id           TEXT PRIMARY KEY,
  ruleset_id          TEXT NOT NULL REFERENCES rulesets(ruleset_id),
  player_team_id      TEXT NOT NULL REFERENCES teams(team_id),
  opp_team_id         TEXT NOT NULL REFERENCES teams(team_id),
  seed                TEXT NOT NULL,
  description         TEXT NOT NULL,
  expected_winner     TEXT,
  expected_trace_hash TEXT
);

-- ANALYSES: each scenario run
CREATE TABLE analyses (
  analysis_id        UUID PRIMARY KEY,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  engine_version     TEXT NOT NULL,
  ruleset_id         TEXT NOT NULL REFERENCES rulesets(ruleset_id),
  player_team_id     TEXT NOT NULL REFERENCES teams(team_id),
  opp_team_id        TEXT NOT NULL REFERENCES teams(team_id),
  prior_id           TEXT REFERENCES prior_snapshots(prior_id),
  policy_model       TEXT NOT NULL,
  sample_size        INT  NOT NULL,
  bo                 INT  NOT NULL,
  win_rate           NUMERIC(5,4) NOT NULL,
  wins               INT  NOT NULL,
  losses             INT  NOT NULL,
  draws              INT  NOT NULL,
  avg_turns          NUMERIC(6,2) NOT NULL,
  avg_tr_turns       NUMERIC(6,2) NOT NULL,
  ci_low             NUMERIC(5,4),
  ci_high            NUMERIC(5,4),
  hidden_info_model  TEXT,
  analysis_json      JSONB NOT NULL
);

-- ANALYSIS_WIN_CONDITIONS: top win conditions per analysis
CREATE TABLE analysis_win_conditions (
  analysis_id UUID NOT NULL REFERENCES analyses(analysis_id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  count       INT  NOT NULL,
  PRIMARY KEY (analysis_id, label)
);

-- ANALYSIS_LOGS: optional stored logs for a subset of games
CREATE TABLE analysis_logs (
  analysis_id  UUID NOT NULL REFERENCES analyses(analysis_id) ON DELETE CASCADE,
  log_index    INT  NOT NULL,
  result       TEXT NOT NULL,
  turns        INT  NOT NULL,
  tr_turns     INT  NOT NULL,
  win_condition TEXT,
  log          JSONB NOT NULL,
  PRIMARY KEY (analysis_id, log_index)
);
