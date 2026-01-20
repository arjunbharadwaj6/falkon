-- Auth and tenancy schema
CREATE EXTENSION IF NOT EXISTS "citext";

CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create a default admin account for existing data
INSERT INTO accounts (email, password_hash) 
VALUES ('admin@default.com', '$2a$10$dummyhash')
ON CONFLICT (email) DO NOTHING;

-- Add account_id to candidates for tenancy isolation
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS account_id UUID;

-- Backfill with default admin account for existing candidates
UPDATE candidates 
SET account_id = (SELECT id FROM accounts WHERE email = 'admin@default.com')
WHERE account_id IS NULL;

-- Make account_id non-nullable and add FK
ALTER TABLE candidates
ALTER COLUMN account_id SET NOT NULL;

ALTER TABLE candidates
  ADD CONSTRAINT fk_candidates_account
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_candidates_account ON candidates(account_id);

