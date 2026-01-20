import dotenv from 'dotenv';
import { query, closePool } from '../src/db.js';

dotenv.config();

async function resetDb() {
  try {
    console.log('🗑️  Dropping all tables and extensions...');
    
    // Drop all tables in correct order
    await query('DROP TABLE IF EXISTS password_reset_tokens CASCADE;');
    await query('DROP TABLE IF EXISTS jobs CASCADE;');
    await query('DROP TABLE IF EXISTS candidates CASCADE;');
    await query('DROP TABLE IF EXISTS accounts CASCADE;');
    await query('DROP FUNCTION IF EXISTS trigger_set_timestamp() CASCADE;');
    
    console.log('✅ Database reset complete');
  } catch (err) {
    console.error('Reset failed:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

resetDb();
