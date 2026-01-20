-- Migration 008: Add job positions table and link to jobs
CREATE TABLE IF NOT EXISTS job_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  owner_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add job_position_id column to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_position_id UUID REFERENCES job_positions(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_positions_owner ON job_positions(owner_account_id);
CREATE INDEX IF NOT EXISTS idx_jobs_position ON jobs(job_position_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_job_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_job_positions_updated_at ON job_positions;
CREATE TRIGGER trigger_update_job_positions_updated_at
BEFORE UPDATE ON job_positions
FOR EACH ROW
EXECUTE FUNCTION update_job_positions_updated_at();
