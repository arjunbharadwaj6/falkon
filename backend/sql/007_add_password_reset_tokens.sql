-- Migration 007: Add password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_account_id (account_id),
  INDEX idx_expires_at (expires_at)
);

-- Add index to accounts table for email lookups during forgot password
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
