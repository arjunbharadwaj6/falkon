-- Rename resume_url to linkedin_url and add resume_url for actual resume link
ALTER TABLE candidates
  RENAME COLUMN resume_url TO linkedin_url;

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS resume_url TEXT;
