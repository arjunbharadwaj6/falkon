-- Add company_name and username to accounts table
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
