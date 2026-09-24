DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM trainer_assignments
    WHERE active
    GROUP BY member_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Multiple active trainers exist for a member. Review trainer_assignments before applying migration 022.';
  END IF;
END $$;

CREATE UNIQUE INDEX one_active_trainer_per_member
  ON trainer_assignments(member_id) WHERE active;
