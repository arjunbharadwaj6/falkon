import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { query, closePool } from '../src/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.resolve(__dirname, '../sql/001_create_candidates.sql');

async function run() {
  try {
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`Applying migration from ${sqlPath}`);
    await query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

run();
