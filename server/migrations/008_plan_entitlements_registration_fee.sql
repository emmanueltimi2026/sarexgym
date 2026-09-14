ALTER TABLE membership_plans
  ADD COLUMN IF NOT EXISTS workout_plan_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS included_trainer_sessions integer NOT NULL DEFAULT 0 CHECK (included_trainer_sessions >= 0),
  ADD COLUMN IF NOT EXISTS registration_fee_minor bigint NOT NULL DEFAULT 0 CHECK (registration_fee_minor >= 0);

UPDATE membership_plans
SET workout_plan_access = trainer_access
WHERE trainer_access AND NOT workout_plan_access;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS registration_fee_paid_at timestamptz;

ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS membership_amount_minor bigint NOT NULL DEFAULT 0 CHECK (membership_amount_minor >= 0),
  ADD COLUMN IF NOT EXISTS registration_fee_minor bigint NOT NULL DEFAULT 0 CHECK (registration_fee_minor >= 0);

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS membership_amount_minor bigint NOT NULL DEFAULT 0 CHECK (membership_amount_minor >= 0),
  ADD COLUMN IF NOT EXISTS registration_fee_minor bigint NOT NULL DEFAULT 0 CHECK (registration_fee_minor >= 0);

UPDATE payment_orders SET membership_amount_minor = amount_minor WHERE membership_amount_minor = 0;
UPDATE payments SET membership_amount_minor = amount_minor WHERE membership_amount_minor = 0;

UPDATE members m SET registration_fee_paid_at = COALESCE(
  (SELECT min(p.paid_at) FROM payments p WHERE p.member_id=m.id AND p.status='successful'),
  now()
) WHERE registration_fee_paid_at IS NULL AND EXISTS (
  SELECT 1 FROM payments p WHERE p.member_id=m.id AND p.status='successful'
);

CREATE INDEX IF NOT EXISTS active_subscription_entitlements
  ON subscriptions(member_id, status, ends_at);
