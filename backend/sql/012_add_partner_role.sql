-- Migration: Add partner role
-- This adds 'partner' as a valid role alongside 'admin' and 'recruiter'
-- Partners have the same privileges as recruiters but with a distinct role name

-- Drop the existing role constraint
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_role_check;

-- Add new constraint with partner role included
ALTER TABLE accounts ADD CONSTRAINT accounts_role_check 
  CHECK (role IN ('admin', 'recruiter', 'partner'));
