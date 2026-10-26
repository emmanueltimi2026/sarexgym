CREATE TABLE daily_operations_summary_views (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_date date NOT NULL,
  presented_at timestamptz NOT NULL DEFAULT now(),
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, display_date),
  CHECK (dismissed_at IS NULL OR dismissed_at >= presented_at)
);

CREATE INDEX attendance_operations_summary_time
  ON attendance(checked_in_at) WHERE status IN ('completed','denied');
CREATE INDEX payments_operations_summary_success_time
  ON payments(paid_at) WHERE status='successful';
CREATE INDEX payments_operations_summary_member_renewals
  ON payments(member_id, paid_at) WHERE status='successful' AND subscription_id IS NOT NULL;
CREATE INDEX members_operations_summary_created
  ON members(created_at);
CREATE INDEX subscriptions_operations_summary_expired
  ON subscriptions(ends_at) WHERE status='expired';
