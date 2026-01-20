import pg from 'pg';
import dns from 'dns';
import { promisify } from 'util';
import dotenv from 'dotenv';

dotenv.config();

// CRITICAL: Force IPv4-only at DNS level
dns.setDefaultResultOrder('ipv4first');

const { Pool } = pg;
const resolve4 = promisify(dns.resolve4);

let pool;
let poolInitialized = false;
let initializationError = null;

// Initialize pool with GUARANTEED IPv4-only connections
async function initializePool() {
  if (poolInitialized) return;
  if (initializationError) throw initializationError;
  
  try {
    const dbHost = process.env.DB_HOST;
    const dbPort = parseInt(process.env.DB_PORT || '5432');
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASSWORD;
    const dbName = process.env.DB_NAME;
    const dbSsl = process.env.DB_SSL === 'true';

    console.log(`🔗 Connecting to PostgreSQL: ${dbUser}@${dbHost}:${dbPort}/${dbName}`);

    let resolvedDbHost = dbHost;
    
    // CRITICAL: Resolve to IPv4 ONLY - reject IPv6 entirely
    try {
      // Use resolve4 which only returns IPv4 addresses
      const ipv4Addresses = await resolve4(dbHost);
      if (ipv4Addresses && ipv4Addresses.length > 0) {
        resolvedDbHost = ipv4Addresses[0];
        console.log(`✓ Resolved ${dbHost} to IPv4: ${resolvedDbHost}`);
      }
    } catch (dnsErr) {
      console.warn(`⚠ Could not resolve ${dbHost} to IPv4: ${dnsErr.message}`);
      console.warn(`  This likely means DNS is returning IPv6, which Render does not support.`);
      console.warn(`  Solution: Contact Supabase support or use the IPv4 address directly.`);
      
      // Check if dbHost is already an IP
      if (/^\d+\.\d+\.\d+\.\d+$/.test(dbHost)) {
        console.log(`  Using provided IPv4 address: ${dbHost}`);
        resolvedDbHost = dbHost;
      } else {
        throw new Error(`Failed to resolve ${dbHost} to IPv4 address. Render requires IPv4 connectivity.`);
      }
    }

    pool = new Pool({
      host: resolvedDbHost,
      port: dbPort,
      database: dbName,
      user: dbUser,
      password: dbPassword,
      ssl: dbSsl ? { rejectUnauthorized: false } : false,
      // CRITICAL: Force IPv4 ONLY in lookup
      lookup: (hostname, options, callback) => {
        dns.resolve4(hostname, (err, addresses) => {
          if (err) {
            console.error(`DNS resolve4 failed for ${hostname}: ${err.message}`);
            return callback(err);
          }
          if (!addresses || addresses.length === 0) {
            return callback(new Error(`No IPv4 addresses found for ${hostname}`));
          }
          // Return first IPv4 address
          callback(null, addresses[0], 4);
        });
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
      statement_timeout: 15000,
      query_timeout: 15000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      // Disable IPv6
      family: 4,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('❌ Pool error:', err.code, '-', err.message);
    });

    // Test the connection immediately
    console.log(`⏳ Testing database connection to ${resolvedDbHost}:${dbPort}...`);
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log(`✅ Database connection verified at: ${result.rows[0].now}`);

    poolInitialized = true;
    console.log('✓ Database pool initialized successfully (IPv4 only)');
  } catch (error) {
    initializationError = error;
    console.error('❌ FATAL: Database pool initialization failed:', error.message);
    console.error('Check your DATABASE environment variables:');
    console.error(`  DB_HOST: ${process.env.DB_HOST}`);
    console.error(`  DB_PORT: ${process.env.DB_PORT}`);
    console.error(`  DB_USER: ${process.env.DB_USER}`);
    console.error(`  DB_SSL: ${process.env.DB_SSL}`);
    process.exit(1);
  }
}

// Initialize pool immediately at module load
await initializePool();

// Get pool with safety check
function getPool() {
  if (!pool || !poolInitialized) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}



// Test database connection
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

// Ensure critical columns exist (idempotent) to avoid runtime errors
export const ensureSchema = async () => {
  const pool = getPool();
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
    const pool = getPool();
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

// Graceful shutdown
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
