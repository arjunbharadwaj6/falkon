-- Update candidates schema
ALTER TABLE candidates
DROP COLUMN IF EXISTS position,
DROP COLUMN IF EXISTS age,
DROP COLUMN IF EXISTS experience_years,
DROP COLUMN IF EXISTS status;

ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS visa_status TEXT,
ADD COLUMN IF NOT EXISTS experience_years NUMERIC(4,1),
ADD COLUMN IF NOT EXISTS profile_status TEXT NOT NULL DEFAULT 'new' CHECK (profile_status IN ('new','screening','interview','offer','hired','rejected','on-hold')),
ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_candidates_profile_status ON candidates(profile_status);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

-- Drop old indexes
DROP INDEX IF EXISTS idx_candidates_status;
DROP INDEX IF EXISTS idx_candidates_position;
