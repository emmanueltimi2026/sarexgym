CREATE TABLE IF NOT EXISTS rate_limit_windows (
  limiter text NOT NULL,
  subject_hash text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 1 CHECK(request_count > 0),
  PRIMARY KEY(limiter,subject_hash,window_start)
);
CREATE INDEX IF NOT EXISTS rate_limit_windows_cleanup ON rate_limit_windows(window_start);

ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_image_public_id text;
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS profile_image_public_id text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS image_public_id text;
