import pg from 'pg';
import dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

const { Pool } = pg;

let pool;
let poolInitialized = false;
let initializationError = null;

/**
 * Parse DATABASE_URL environment variable into PostgreSQL connection config
 * @returns {Object} Pool configuration with user, password, host, port, database
 */
function parseDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    const url = new URL(databaseUrl);
    return {
      user: url.username,
      password: url.password,
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1),
    };
  } catch (error) {
    throw new Error(`Invalid DATABASE_URL format: ${error.message}`);
  }
}

/**
 * Initialize connection pool to PostgreSQL database
 * Establishes connection and verifies with a test query
 */
async function initializePool() {
  if (poolInitialized) return;
  if (initializationError) throw initializationError;
  
  try {
    const dbConfig = parseDatabaseUrl();
    const { user, password, host, port, database } = dbConfig;

    console.log(`🔗 Connecting to PostgreSQL: ${user}@${host}:${port}/${database}`);

    try {
      const candidatePool = new Pool({
        user,
        password,
        host,
        port,
        database,
        ssl: { rejectUnauthorized: false },
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 15000,
        statement_timeout: 15000,
        query_timeout: 15000,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
      });

      candidatePool.on('error', (err) => {
        console.error('❌ Pool error:', err.code, '-', err.message);
      });

      const client = await candidatePool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();

      pool = candidatePool;
      poolInitialized = true;
      console.log(`✅ Database connection verified at: ${result.rows[0].now}`);
      console.log(`✓ Database pool initialized successfully`);
    } catch (err) {
      console.error(`✗ Failed to connect: ${err.message}`);
      throw err;
    }
  } catch (error) {
    initializationError = error;
    console.error('❌ Database pool initialization failed:', error.message);
    process.exit(1);
  }
}

await initializePool();

/**
 * Get the initialized connection pool
 * @returns {Pool} PostgreSQL connection pool
 */
function getPool() {
  if (!pool || !poolInitialized) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}


/**
 * Test database connection
 * @returns {boolean} True if connection successful
 */
export const testConnection = async () => {
  try {
    const pool = getPool();
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

/**
 * Ensure database schema exists with all required columns and tables
 * Handles type migrations and creates missing extensions/tables
 */
export const ensureSchema = async () => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    // Add role and tenancy columns
    await client.query(`
      ALTER TABLE accounts
        ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','recruiter','partner')),
        ADD COLUMN IF NOT EXISTS parent_account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES accounts(id) ON DELETE SET NULL;
    `);

    // Ensure columns have correct types
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

    // Add candidate tracking columns
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

    // Create jobs table if not exists
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
    console.log('✓ Schema ensured successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Schema ensure failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Execute query with automatic retry on connection errors
 * @param {string} text - SQL query string
 * @param {array} params - Query parameters
 * @param {number} retries - Number of retry attempts (default: 2)
 * @returns {Object} Query result
 */
export const query = async (text, params, retries = 2) => {
  const pool = getPool();
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
      
      // Check if error is connection-related and retryable
      const isConnectionError = error.message.includes('Connection') || 
                               error.message.includes('timeout') ||
                               error.code === 'ECONNRESET' ||
                               error.code === 'ETIMEDOUT';
      
      if (isConnectionError && attempt < retries) {
        console.warn(`Database query failed (attempt ${attempt + 1}/${retries + 1}), retrying...`);
        // Exponential backoff before retry
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      
      console.error('Database query error:', error.message);
      throw error;
    }
  }
  
  throw lastError;
};

/**
 * Get a client from the pool for manual transaction control
 * @returns {Object} Database client
 */
export const getClient = async () => {
  try {
    const pool = getPool();
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('Error getting client from pool:', error);
    throw error;
  }
};

/**
 * Check if database connection is healthy
 * @returns {boolean} True if database is accessible
 */
export const isHealthy = async () => {
  try {
    const pool = getPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return false;
  }
};

/**
 * Gracefully close database connection pool
 */
export const closePool = async () => {
  try {
    if (pool) {
      await pool.end();
      console.log('Database pool has ended');
    }
  } catch (error) {
    console.error('Error closing database pool:', error);
    throw error;
  }
};

export default pool || {};
