CREATE TABLE public_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  title text NOT NULL,
  image_url text NOT NULL,
  image_public_id text,
  alt_text text NOT NULL,
  short_description text NOT NULL,
  full_description text NOT NULL,
  features jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(features) = 'array'),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT date_trunc('milliseconds', now()),
  CHECK (length(trim(category)) > 0),
  CHECK (length(trim(title)) > 0),
  CHECK (length(trim(image_url)) > 0),
  CHECK (length(trim(alt_text)) > 0),
  CHECK (length(trim(short_description)) > 0),
  CHECK (length(trim(full_description)) > 0)
);

CREATE INDEX public_services_active_order ON public_services(sort_order, created_at) WHERE active;

INSERT INTO permissions(code, description)
VALUES ('services.manage', 'Create, edit, publish, and order public services')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.code = 'admin' AND p.code = 'services.manage'
ON CONFLICT DO NOTHING;

INSERT INTO public_services(category,title,image_url,alt_text,short_description,full_description,features,sort_order,active)
VALUES
('Strength & conditioning','Open gym floor','/assets/photos/photo-1581009146145-b5ef050c2e1e.jpg','Athlete training on the SAREX strength floor','Train independently with room and equipment for strength, cardio, and conditioning.','A practical training floor with free weights, resistance equipment, and space for strength, conditioning, and independent workouts.','["Free weights and resistance training","Cardio and conditioning equipment","Floor support from the training team"]',0,true),
('Movement & cardio','Aerobics and guided sessions','/assets/photos/photo-1518611012118-696072aa579a.jpg','Instructor guiding a group fitness session','Join guided sessions that build stamina, coordination, mobility, and consistency.','Instructor-led sessions designed to improve stamina, coordination, mobility, and consistency in a motivating environment.','["Aerobics classes","Core and abdominal sessions","Adaptable intensity levels"]',1,true),
('Goal-based support','Personal training','/assets/photos/photo-1574680096145-d05b474e2155.jpg','Personal trainer supporting a gym member','Get coaching and workout structure shaped around your goals and progress.','Focused coaching and progressive workout planning for members who want more structure, accountability, and measurable progress.','["Personalized workout direction","Weight-loss and muscle-tone support","Progress-focused programming"]',2,true),
('Wellness & recovery','Full-body spa','/assets/photos/full-body-spa.jfif','Full-body spa service at SAREX Fitness Clinic','Make time for relaxation and restorative care alongside your training routine.','A calming wellness experience that helps reduce tension, improve relaxation, and support recovery between training sessions.','["Full-body spa care","Relaxation and recovery","Appointment-based service"]',3,true),
('Therapeutic recovery','Body massage','/assets/photos/massage.jfif','Body massage service at SAREX Fitness Clinic','Ease muscular tension and support relaxation and post-training recovery.','Professional massage sessions for muscular tension relief, circulation, relaxation, and post-training recovery.','["Targeted tension relief","Post-workout recovery","Bookable sessions"]',4,true),
('Supported movement','Pregnancy and after-birth fitness','/assets/photos/pregnancy.jpg','Adapted movement support for pregnancy and after-birth fitness','Find carefully adapted movement support for pregnancy and returning to activity.','Carefully adapted prenatal and postnatal movement focused on mobility, confidence, strength, and a comfortable return to activity.','["Prenatal movement support","Postnatal conditioning","Consultation-led sessions"]',5,true);
