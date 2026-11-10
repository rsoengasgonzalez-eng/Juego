PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  alias TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  owner_player_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS team_members (
  team_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  PRIMARY KEY (team_id, player_id),
  UNIQUE (player_id),
  FOREIGN KEY (team_id) REFERENCES teams(id),
  FOREIGN KEY (player_id) REFERENCES players(id)
);

CREATE TABLE IF NOT EXISTS accusations (
  id TEXT PRIMARY KEY,
  cycle_number INTEGER NOT NULL,
  case_index INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  team_id TEXT,
  suspect_id TEXT NOT NULL,
  motive TEXT NOT NULL,
  method TEXT NOT NULL,
  location TEXT NOT NULL,
  score INTEGER NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  submitted_at TEXT NOT NULL,
  UNIQUE (cycle_number, player_id),
  FOREIGN KEY (player_id) REFERENCES players(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX IF NOT EXISTS idx_accusations_cycle_score
  ON accusations(cycle_number, score DESC, submitted_at ASC);
CREATE INDEX IF NOT EXISTS idx_team_members_player
  ON team_members(player_id);
