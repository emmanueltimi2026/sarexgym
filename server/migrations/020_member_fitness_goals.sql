ALTER TABLE members ADD COLUMN fitness_goal text;
ALTER TABLE members ADD COLUMN fitness_goal_notes text;

ALTER TABLE members ADD CONSTRAINT members_fitness_goal_valid
  CHECK (fitness_goal IS NULL OR fitness_goal IN (
    'Build Muscle', 'Lose Weight', 'Improve Endurance', 'General Fitness',
    'Strength & Conditioning', 'Flexibility / Mobility',
    'Rehabilitation / Recovery', 'Other'
  ));
ALTER TABLE members ADD CONSTRAINT members_fitness_goal_notes_length
  CHECK (fitness_goal_notes IS NULL OR char_length(fitness_goal_notes) <= 500);
