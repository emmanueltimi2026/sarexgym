CREATE TABLE workout_exercise_completions (
  workout_plan_id uuid NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  completed_on date NOT NULL,
  day_key text NOT NULL,
  exercise_key text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workout_plan_id, completed_on, day_key, exercise_key)
);
