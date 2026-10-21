ALTER TABLE workout_plans ADD COLUMN program_started_on date;

UPDATE workout_plans
SET program_started_on = (created_at AT TIME ZONE 'Africa/Lagos')::date
WHERE program_started_on IS NULL;

ALTER TABLE workout_plans
  ALTER COLUMN program_started_on SET DEFAULT (now() AT TIME ZONE 'Africa/Lagos')::date,
  ALTER COLUMN program_started_on SET NOT NULL;

ALTER TABLE workout_plans ADD CONSTRAINT workout_plans_id_member_unique UNIQUE (id, member_id);

CREATE TABLE workout_day_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  workout_plan_id uuid NOT NULL,
  workout_day_id text NOT NULL,
  program_week_number integer NOT NULL CHECK (program_week_number > 0),
  program_week_start date NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, workout_plan_id, workout_day_id, program_week_start),
  FOREIGN KEY (workout_plan_id, member_id) REFERENCES workout_plans(id, member_id) ON DELETE CASCADE
);

CREATE INDEX workout_day_completions_member_history
  ON workout_day_completions(member_id, workout_plan_id, program_week_start DESC);

WITH expected_exercises AS (
  SELECT w.id AS workout_plan_id,
    w.member_id,
    w.program_started_on,
    COALESCE(day.value->>'id', 'legacy-day-' || (day.ordinality - 1)::text) AS workout_day_id,
    COALESCE(exercise.value->>'id', 'legacy-exercise-' || (exercise.ordinality - 1)::text) AS exercise_id
  FROM workout_plans w
  CROSS JOIN LATERAL jsonb_array_elements(w.routine) WITH ORDINALITY AS day(value, ordinality)
  CROSS JOIN LATERAL jsonb_array_elements(day.value->'exercises') WITH ORDINALITY AS exercise(value, ordinality)
), day_sizes AS (
  SELECT workout_plan_id, member_id, program_started_on, workout_day_id, count(DISTINCT exercise_id)::int AS exercise_count
  FROM expected_exercises
  GROUP BY workout_plan_id, member_id, program_started_on, workout_day_id
), fully_completed_days AS (
  SELECT old.workout_plan_id, old.completed_on, old.day_key, max(old.completed_at) AS completed_at,
    day_sizes.member_id, day_sizes.program_started_on
  FROM workout_exercise_completions old
  JOIN day_sizes ON day_sizes.workout_plan_id = old.workout_plan_id AND day_sizes.workout_day_id = old.day_key
  WHERE old.completed_on >= day_sizes.program_started_on
  GROUP BY old.workout_plan_id, old.completed_on, old.day_key, day_sizes.member_id, day_sizes.program_started_on, day_sizes.exercise_count
  HAVING count(DISTINCT old.exercise_key) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM expected_exercises expected
      WHERE expected.workout_plan_id = old.workout_plan_id
        AND expected.workout_day_id = old.day_key
        AND expected.exercise_id = old.exercise_key
    )
  ) = day_sizes.exercise_count
), week_assignments AS (
  SELECT *, floor((completed_on - program_started_on)::numeric / 7)::integer + 1 AS week_number
  FROM fully_completed_days
), mapped_history AS (
  SELECT DISTINCT ON (workout_plan_id, member_id, day_key, program_started_on, week_number)
    member_id, workout_plan_id, day_key, week_number,
    program_started_on + ((week_number - 1) * 7) AS week_start,
    completed_at
  FROM week_assignments
  ORDER BY workout_plan_id, member_id, day_key, program_started_on, week_number, completed_on, completed_at
)
INSERT INTO workout_day_completions(member_id, workout_plan_id, workout_day_id, program_week_number, program_week_start, completed_at)
SELECT member_id, workout_plan_id, day_key, week_number, week_start, completed_at
FROM mapped_history
ON CONFLICT (member_id, workout_plan_id, workout_day_id, program_week_start) DO NOTHING;
