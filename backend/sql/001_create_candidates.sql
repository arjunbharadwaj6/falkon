-- Candidates table schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Maintain updated_at automatically
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  age INTEGER CHECK (age > 0 AND age < 120),
  experience_years NUMERIC(4,1) CHECK (experience_years >= 0),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','screening','interview','offer','hired','rejected','on-hold')),
  extra_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position);

DROP TRIGGER IF EXISTS set_timestamp_on_candidates ON candidates;
CREATE TRIGGER set_timestamp_on_candidates
BEFORE UPDATE ON candidates
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
