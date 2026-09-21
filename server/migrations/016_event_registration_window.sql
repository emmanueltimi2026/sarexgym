ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_starts_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS registration_ends_at timestamptz;

UPDATE events
SET registration_starts_at = COALESCE(registration_starts_at, created_at, starts_at),
    registration_ends_at = COALESCE(registration_ends_at, ends_at);

ALTER TABLE events ALTER COLUMN registration_starts_at SET NOT NULL;
ALTER TABLE events ALTER COLUMN registration_ends_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'events_registration_window_valid'
  ) THEN
    ALTER TABLE events
      ADD CONSTRAINT events_registration_window_valid
      CHECK (registration_ends_at > registration_starts_at AND registration_ends_at <= ends_at);
  END IF;
END $$;
