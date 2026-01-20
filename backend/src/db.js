import pg from 'pg';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create a reusable database connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Force IPv4 lookups to avoid IPv6 connectivity issues on some hosts
  lookup: (hostname, options, callback) => {
    dns.lookup(hostname, { family: 4, hints: dns.ADDRCONFIG }, callback);
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased to 10 seconds
  statement_timeout: 10000,
  query_timeout: 10000,
  keepAlive: true, // Enable TCP keep-alive
  keepAliveInitialDelayMillis: 10000, // Wait 10s before sending first keep-alive packet
});

// Handle pool errors gracefully
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client:', err.message);
  // Don't exit process on connection errors, just log them
});

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✓ Database connected successfully at:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
};

// Ensure critical columns exist (idempotent) to avoid runtime errors
export const ensureSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // Roles and tenancy fields (UUID-aligned)
    await client.query(`
      ALTER TABLE accounts
        ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','recruiter')),
        ADD COLUMN IF NOT EXISTS parent_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES accounts(id) ON DELETE SET NULL;
    `);

    // Ensure correct types if columns already exist but with wrong type
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'accounts' AND column_name = 'parent_account_id' AND data_type <> 'uuid'
        ) THEN
          ALTER TABLE accounts ALTER COLUMN parent_account_id TYPE uuid USING parent_account_id::uuid;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'accounts' AND column_name = 'created_by' AND data_type <> 'uuid'
        ) THEN
          ALTER TABLE accounts ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
        END IF;
      END$$;
    `);

    await client.query(`UPDATE accounts SET role = 'admin' WHERE role IS NULL;`);

    await client.query(`
      ALTER TABLE candidates
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES accounts(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'candidates' AND column_name = 'created_by' AND data_type <> 'uuid'
        ) THEN
          ALTER TABLE candidates ALTER COLUMN created_by TYPE uuid USING created_by::uuid;
        END IF;
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'candidates' AND column_name = 'job_id' AND data_type <> 'uuid'
        ) THEN
          ALTER TABLE candidates ALTER COLUMN job_id TYPE uuid USING job_id::uuid;
        END IF;
      END$$;
    `);

    await client.query(`UPDATE candidates SET created_by = account_id WHERE created_by IS NULL;`);

    await client.query(`
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
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_jobs_owner ON jobs(owner_account_id);`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_job_code ON jobs(job_code);`);

    await client.query('COMMIT');
    console.log('✓ Schema ensured (roles, parent linkage, created_by, jobs)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Schema ensure failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Query helper function with error handling and retry logic
export const query = async (text, params, retries = 2) => {
  const start = Date.now();
  let lastError;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if it's a connection error that might be retryable
      const isConnectionError = error.message.includes('Connection') || 
                               error.message.includes('timeout') ||
                               error.code === 'ECONNRESET' ||
                               error.code === 'ETIMEDOUT';
      
      if (isConnectionError && attempt < retries) {
        console.warn(`Database query failed (attempt ${attempt + 1}/${retries + 1}), retrying...`);
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      
      // If it's not retryable or we've exhausted retries, throw the error
      console.error('Database query error:', error.message);
      throw error;
    }
  }
  
  throw lastError;
};

// Get a client from the pool for transactions
export const getClient = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('Error getting client from pool:', error);
    throw error;
  }
};

// Check if the database connection is healthy
export const isHealthy = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return false;
  }
};

// Graceful shutdown
export const closePool = async () => {
  try {
    await pool.end();
    console.log('Database pool has ended');
  } catch (error) {
    console.error('Error closing database pool:', error);
    throw error;
  }
};

export default pool;
