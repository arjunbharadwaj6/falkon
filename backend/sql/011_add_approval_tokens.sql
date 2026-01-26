-- Add account approval tokens table
CREATE TABLE IF NOT EXISTS account_approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_tokens_account ON account_approval_tokens(account_id);
CREATE INDEX IF NOT EXISTS idx_approval_tokens_token ON account_approval_tokens(token);
