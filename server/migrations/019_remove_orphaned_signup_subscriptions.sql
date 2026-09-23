-- Signup created an unpaid pending period; fulfillment created a second paid period.
-- Only remove unlinked pending rows for members who already have a successful payment.
DELETE FROM subscriptions s
WHERE s.status='pending'
  AND NOT EXISTS (
    SELECT 1 FROM payments linked WHERE linked.subscription_id=s.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM subscription_freezes f WHERE f.subscription_id=s.id
  )
  AND EXISTS (
    SELECT 1 FROM payments paid
    WHERE paid.member_id=s.member_id AND paid.status='successful'
  );
