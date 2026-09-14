ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS sessions_last_seen_active
  ON sessions(last_seen_at)
  WHERE revoked_at IS NULL;
