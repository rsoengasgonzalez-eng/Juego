PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  join_code TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  alias TEXT NOT NULL,
  token_hash TEXT UNIQUE,
  team_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_players_token ON players(token_hash);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);

CREATE TABLE IF NOT EXISTS hints (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  cycle_key TEXT NOT NULL,
  case_id TEXT NOT NULL,
  clue_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(team_id, cycle_key, clue_id),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hints_cycle ON hints(cycle_key, team_id);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  cycle_key TEXT NOT NULL,
  case_id TEXT NOT NULL,
  suspect_id TEXT NOT NULL,
  method_id TEXT NOT NULL,
  motive_id TEXT NOT NULL,
  evidence_ids TEXT NOT NULL DEFAULT '[]',
  reasoning TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(team_id, cycle_key),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_submissions_leaderboard ON submissions(cycle_key, score DESC, submitted_at ASC);
