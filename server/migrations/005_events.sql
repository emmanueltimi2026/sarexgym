CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, description text NOT NULL DEFAULT '',
  location text NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  capacity integer NOT NULL CHECK(capacity > 0), price_minor bigint NOT NULL DEFAULT 0 CHECK(price_minor >= 0),
  currency char(3) NOT NULL DEFAULT 'NGN', audience text NOT NULL DEFAULT 'members' CHECK(audience IN ('members','public')),
  status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','scheduled','published','cancelled','completed')),
  image_url text, created_by uuid REFERENCES users, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(ends_at > starts_at)
);
CREATE INDEX events_public_schedule ON events(status,starts_at);
CREATE TABLE event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members, status text NOT NULL CHECK(status IN ('pending_payment','confirmed','cancelled')),
  amount_minor bigint NOT NULL DEFAULT 0, provider_reference text UNIQUE, registered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id,member_id)
);
INSERT INTO permissions(code,description) VALUES ('events.manage','Create and manage events'),('events.register','Register for events') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='admin' AND p.code='events.manage' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='staff' AND p.code='events.manage' ON CONFLICT DO NOTHING;
INSERT INTO role_permissions(role_id,permission_id) SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='member' AND p.code='events.register' ON CONFLICT DO NOTHING;
