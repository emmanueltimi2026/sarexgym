ALTER TABLE membership_plans ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]';

CREATE TABLE gym_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  gym_name text NOT NULL DEFAULT 'Sarex Fitness Clinic',
  brand_name text NOT NULL DEFAULT 'SAREX',
  tagline text,
  address text NOT NULL DEFAULT '1, Dada Adams Close, Hallmark Estate, Gasline, Magboro - Ogun State',
  phone text NOT NULL DEFAULT '08035856688 / 08085583204',
  email text NOT NULL DEFAULT 'info@sarexgym.com',
  currency char(3) NOT NULL DEFAULT 'NGN',
  allow_qr_check_in boolean NOT NULL DEFAULT true,
  allow_manual_check_in boolean NOT NULL DEFAULT true,
  enable_check_out boolean NOT NULL DEFAULT true,
  duplicate_check_in_prevention_minutes integer NOT NULL DEFAULT 30 CHECK (duplicate_check_in_prevention_minutes BETWEEN 0 AND 1440),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users
);
INSERT INTO gym_settings(id) VALUES(true) ON CONFLICT DO NOTHING;

CREATE TABLE workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES trainers ON DELETE RESTRICT,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  difficulty text NOT NULL CHECK (difficulty IN ('Beginner','Intermediate','Advanced')),
  days_per_week integer NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  routine jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workout_plans_member ON workout_plans(member_id, updated_at DESC);

CREATE TABLE member_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES trainers ON DELETE RESTRICT,
  weight_kg numeric(5,2) NOT NULL CHECK (weight_kg BETWEEN 20 AND 500),
  body_fat_percentage numeric(5,2) CHECK (body_fat_percentage BETWEEN 1 AND 80),
  trainer_notes text NOT NULL DEFAULT '',
  measured_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX member_progress_member ON member_progress(member_id, measured_at DESC);

INSERT INTO permissions(code,description) VALUES
('plans.manage','Create and update membership plans'),
('trainers.manage','Create and update trainers'),
('staff.manage','Create and update staff'),
('attendance.view','View attendance'),
('attendance.checkout','Record check-outs')
ON CONFLICT (code) DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.code='admin' AND p.code IN ('plans.manage','trainers.manage','staff.manage','attendance.view','attendance.checkout')
ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN ('attendance.view','attendance.checkout')
WHERE r.code='staff' ON CONFLICT DO NOTHING;
