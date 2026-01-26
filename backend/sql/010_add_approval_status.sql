-- Add approval status for admin account verification
-- This migration adds fields to support admin account approval workflow

BEGIN;

-- Alter accounts table if not already done
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='accounts' AND column_name='is_approved'
  ) THEN
    ALTER TABLE accounts
    ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='accounts' AND column_name='approved_at'
  ) THEN
    ALTER TABLE accounts
    ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='accounts' AND column_name='approved_by'
  ) THEN
    ALTER TABLE accounts
    ADD COLUMN approved_by UUID REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Approve any existing admin accounts (they were created before this approval system)
UPDATE accounts 
SET is_approved = true, approved_at = NOW() 
WHERE role = 'admin' AND is_approved = false;

COMMIT;
