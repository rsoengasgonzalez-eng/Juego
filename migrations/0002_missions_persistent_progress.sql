PRAGMA foreign_keys = ON;

-- Compatible upgrade from the first Madrid Mystery schema.
ALTER TABLE players ADD COLUMN normalized_alias TEXT;
ALTER TABLE players ADD COLUMN assignment_slot INTEGER;
ALTER TABLE players ADD COLUMN is_fixed_group INTEGER NOT NULL DEFAULT 0;
ALTER TABLE teams ADD COLUMN kind TEXT NOT NULL DEFAULT 'automatic';
ALTER TABLE teams ADD COLUMN capacity INTEGER NOT NULL DEFAULT 8;
ALTER TABLE team_members ADD COLUMN role TEXT NOT NULL DEFAULT 'member';

CREATE UNIQUE INDEX IF NOT EXISTS idx_players_normalized_alias
  ON players(normalized_alias) WHERE normalized_alias IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_players_fixed_slot
  ON players(assignment_slot) WHERE is_fixed_group = 1 AND assignment_slot IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_kind ON teams(kind);

CREATE TABLE IF NOT EXISTS case_runs (
  cycle_number INTEGER PRIMARY KEY,
  case_index INTEGER NOT NULL,
  case_code TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('scheduled','open','expired')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS team_case_state (
  cycle_number INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  last_activity_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'investigating' CHECK (status IN ('investigating','finished','expired')),
  PRIMARY KEY (cycle_number, team_id),
  FOREIGN KEY (cycle_number) REFERENCES case_runs(cycle_number),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE TABLE IF NOT EXISTS team_clue_unlocks (
  cycle_number INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  clue_id TEXT NOT NULL,
  clue_number INTEGER NOT NULL,
  unlocked_at TEXT NOT NULL,
  unlock_source TEXT NOT NULL DEFAULT 'clock' CHECK (unlock_source IN ('clock','admin')),
  PRIMARY KEY (cycle_number, team_id, clue_id),
  FOREIGN KEY (cycle_number, team_id) REFERENCES team_case_state(cycle_number, team_id)
);

CREATE TABLE IF NOT EXISTS team_mission_progress (
  cycle_number INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  mission_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('locked','available','completed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_answer TEXT,
  completed_by_player_id TEXT,
  completed_at TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (cycle_number, team_id, mission_id),
  FOREIGN KEY (cycle_number, team_id) REFERENCES team_case_state(cycle_number, team_id),
  FOREIGN KEY (completed_by_player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS mission_attempts (
  id TEXT PRIMARY KEY,
  cycle_number INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  submitted_at TEXT NOT NULL,
  FOREIGN KEY (cycle_number, team_id, mission_id)
    REFERENCES team_mission_progress(cycle_number, team_id, mission_id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS team_accusations (
  id TEXT PRIMARY KEY,
  cycle_number INTEGER NOT NULL,
  case_index INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  submitted_by_player_id TEXT NOT NULL,
  suspect_id TEXT NOT NULL,
  motive TEXT NOT NULL,
  method TEXT NOT NULL,
  location TEXT NOT NULL,
  suspect_correct INTEGER NOT NULL DEFAULT 0,
  motive_correct INTEGER NOT NULL DEFAULT 0,
  method_correct INTEGER NOT NULL DEFAULT 0,
  location_correct INTEGER NOT NULL DEFAULT 0,
  is_correct INTEGER NOT NULL DEFAULT 0,
  accusation_score INTEGER NOT NULL DEFAULT 0,
  speed_bonus INTEGER NOT NULL DEFAULT 0,
  submitted_at TEXT NOT NULL,
  UNIQUE (cycle_number, team_id),
  FOREIGN KEY (cycle_number, team_id) REFERENCES team_case_state(cycle_number, team_id),
  FOREIGN KEY (submitted_by_player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS team_case_results (
  cycle_number INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  accusation_id TEXT NOT NULL UNIQUE,
  missions_completed INTEGER NOT NULL,
  mission_score INTEGER NOT NULL,
  accusation_score INTEGER NOT NULL,
  speed_bonus INTEGER NOT NULL,
  total_score INTEGER NOT NULL,
  solved_correctly INTEGER NOT NULL DEFAULT 0,
  finished_at TEXT NOT NULL,
  elapsed_seconds INTEGER NOT NULL,
  rank_at_finish INTEGER,
  PRIMARY KEY (cycle_number, team_id),
  FOREIGN KEY (cycle_number, team_id) REFERENCES team_case_state(cycle_number, team_id),
  FOREIGN KEY (accusation_id) REFERENCES team_accusations(id)
);

CREATE TABLE IF NOT EXISTS score_events (
  id TEXT PRIMARY KEY,
  cycle_number INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  player_id TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('mission','accusation','speed_bonus','admin_adjustment')),
  reference_id TEXT,
  points INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (cycle_number, team_id) REFERENCES team_case_state(cycle_number, team_id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE INDEX IF NOT EXISTS idx_team_case_state_status
  ON team_case_state(cycle_number, status, finished_at);
CREATE INDEX IF NOT EXISTS idx_clue_unlocks_team
  ON team_clue_unlocks(cycle_number, team_id, clue_number);
CREATE INDEX IF NOT EXISTS idx_mission_progress_team
  ON team_mission_progress(cycle_number, team_id, status, mission_order);
CREATE INDEX IF NOT EXISTS idx_mission_attempts_team
  ON mission_attempts(cycle_number, team_id, submitted_at);
CREATE INDEX IF NOT EXISTS idx_results_ranking
  ON team_case_results(cycle_number, total_score DESC, elapsed_seconds ASC);
CREATE INDEX IF NOT EXISTS idx_score_events_team
  ON score_events(cycle_number, team_id, created_at);
