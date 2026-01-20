-- Add job_position_id column to candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS job_position_id UUID REFERENCES job_positions(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_candidates_job_position ON candidates(job_position_id);
