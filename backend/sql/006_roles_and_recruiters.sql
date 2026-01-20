-- Add role hierarchy for accounts and track creator
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'recruiter')),
  ADD COLUMN IF NOT EXISTS parent_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Normalize existing accounts to admin role
UPDATE accounts SET role = 'admin' WHERE role IS NULL;
UPDATE accounts SET parent_account_id = NULL WHERE role = 'admin';

-- Add created_by tracking for accounts created by admins (optional backfill left null)

-- Track who created each candidate
ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES accounts(id) ON DELETE SET NULL;

-- Backfill existing candidates to assume creator is the owning account
UPDATE candidates SET created_by = account_id WHERE created_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_candidates_created_by ON candidates(created_by);
