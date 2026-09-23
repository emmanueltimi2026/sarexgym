ALTER TABLE subscription_freezes ADD COLUMN IF NOT EXISTS released_at timestamptz;

CREATE INDEX IF NOT EXISTS subscription_freezes_current
  ON subscription_freezes(subscription_id, ends_at)
  WHERE released_at IS NULL;
