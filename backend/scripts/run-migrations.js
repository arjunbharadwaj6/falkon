import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { query, closePool } from '../src/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlDir = path.resolve(__dirname, '../sql');

async function run() {
  try {
    const files = fs
      .readdirSync(sqlDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const fullPath = path.join(sqlDir, file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      console.log(`Applying migration: ${file}`);
      await query(sql);
    }
    console.log('Migrations applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

run();
