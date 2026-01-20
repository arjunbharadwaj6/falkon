-- Migration: Add jobs table (inserted after auth/candidates, before job_positions)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  description_pdf_url TEXT,
  client_name TEXT,
  location TEXT,
  work_type TEXT NOT NULL CHECK (work_type IN ('hybrid','remote','onsite')),
  visa_type TEXT,
  positions INTEGER NOT NULL DEFAULT 1 CHECK (positions > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','onhold','closed')),
  owner_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_owner ON jobs(owner_account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_job_code ON jobs(job_code);
