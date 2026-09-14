ALTER TABLE members
  ADD COLUMN workout_plan_enabled boolean NOT NULL DEFAULT false;

UPDATE members m
SET workout_plan_enabled = true
WHERE EXISTS (
  SELECT 1 FROM trainer_assignments assignment
  WHERE assignment.member_id = m.id AND assignment.active
);

CREATE INDEX members_workout_plan_enabled
  ON members(workout_plan_enabled)
  WHERE workout_plan_enabled;
