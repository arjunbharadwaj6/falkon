import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

async function testConnection() {
  console.log('Testing database connection...');
  console.log('Host:', process.env.DB_HOST);
  console.log('Port:', process.env.DB_PORT || 5432);
  console.log('Database:', process.env.DB_NAME);
  console.log('User:', process.env.DB_USER);
  console.log('SSL:', process.env.DB_SSL);
  console.log('---');

  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000,
    keepAlive: true,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('✓ Connected successfully!');
    
    console.log('Running test query...');
    const result = await client.query('SELECT NOW(), version()');
    console.log('✓ Query successful!');
    console.log('Server time:', result.rows[0].now);
    console.log('PostgreSQL version:', result.rows[0].version.split('\n')[0]);
    
    // Test accounts table
    console.log('\nTesting accounts table...');
    const accountsResult = await client.query('SELECT COUNT(*) FROM accounts');
    console.log(`✓ Found ${accountsResult.rows[0].count} accounts`);
    
    // Test password_reset_tokens table
    console.log('\nTesting password_reset_tokens table...');
    const tokensResult = await client.query('SELECT COUNT(*) FROM password_reset_tokens');
    console.log(`✓ Found ${tokensResult.rows[0].count} reset tokens`);
    
    client.release();
    await pool.end();
    
    console.log('\n✅ All tests passed! Database connection is healthy.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error('Error:', error.message);
    
    if (error.message.includes('timeout')) {
      console.error('\n💡 Troubleshooting tips:');
      console.error('  1. Check if your IP is allowed in Supabase dashboard');
      console.error('  2. Verify database credentials in .env file');
      console.error('  3. Check your internet connection');
      console.error('  4. Supabase may be temporarily unavailable');
    }
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();
