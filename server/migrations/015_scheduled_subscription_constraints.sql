CREATE INDEX IF NOT EXISTS subscriptions_due_scheduled
  ON subscriptions(member_id, starts_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS subscriptions_current_active
  ON subscriptions(member_id, ends_at)
  WHERE status = 'active';

ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_member_no_paid_overlap
  EXCLUDE USING gist (
    member_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  )
  WHERE (status IN ('active', 'scheduled', 'frozen'));
