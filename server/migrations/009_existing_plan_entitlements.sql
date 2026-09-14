-- Preserve the intent of existing plans when introducing structured entitlements.
UPDATE membership_plans
SET trainer_access = true,
    workout_plan_access = true
WHERE features ? 'Trainer support'
   OR features ? 'All access';
