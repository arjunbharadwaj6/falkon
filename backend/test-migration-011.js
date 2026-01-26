import dotenv from 'dotenv';
import { query, closePool } from './src/db.js';
import fs from 'fs';

dotenv.config();

async function run() {
  try {
    const sql = fs.readFileSync('./sql/011_add_approval_tokens.sql', 'utf8');
    console.log('Running migration 011...');
    await query(sql);
    console.log('✓ Migration 011 applied successfully');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

run();
