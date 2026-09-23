ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS events_visible_schedule
  ON events(status, starts_at) WHERE deleted_at IS NULL;
