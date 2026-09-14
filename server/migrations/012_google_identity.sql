CREATE TABLE IF NOT EXISTS oauth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_subject),
  UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS oauth_signup_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  picture_url text,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS oauth_signup_tokens_active ON oauth_signup_tokens(expires_at) WHERE consumed_at IS NULL;