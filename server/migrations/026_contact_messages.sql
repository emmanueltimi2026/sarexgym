CREATE TABLE contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','resolved')),
  received_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users
);

CREATE INDEX contact_messages_inbox_order ON contact_messages(status, received_at DESC);

INSERT INTO permissions(code,description)
VALUES ('contact_messages.view','View and manage public contact enquiries')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permissions p
WHERE r.code IN ('admin','staff') AND p.code='contact_messages.view'
ON CONFLICT DO NOTHING;
