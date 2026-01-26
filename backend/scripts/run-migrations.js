import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { query, closePool } from '../src/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlDir = path.resolve(__dirname, '../sql');

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  let inDollar = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next2 = sql.slice(i, i + 2);
    // Toggle dollar-quote blocks on $$
    if (next2 === '$$') {
      inDollar = !inDollar;
      current += next2;
      i += 1; // consume both
      continue;
    }
    if (!inDollar) {
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle) inDouble = !inDouble;
    }
    if (ch === ';' && !inSingle && !inDouble && !inDollar) {
      const trimmed = current.trim();
      if (trimmed.length) statements.push(trimmed);
      current = '';
    } else {
      current += ch;
    }
  }
  const trimmed = current.trim();
  if (trimmed.length) statements.push(trimmed);
  return statements;
}

async function run() {
  try {
    // Ensure migrations tracking table exists
    await query(
      `CREATE TABLE IF NOT EXISTS __migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );

    const files = fs
      .readdirSync(sqlDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // Skip if already recorded as applied
      const appliedCheck = await query('SELECT 1 FROM __migrations WHERE filename = $1', [file]);
      if (appliedCheck.rows.length) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      const fullPath = path.join(sqlDir, file);
      const sql = fs.readFileSync(fullPath, 'utf8');
      console.log(`Applying migration: ${file}`);

      // Split into statements and apply individually for graceful error handling
      const statements = splitSqlStatements(sql);

      for (const stmt of statements) {
        try {
          await query(stmt);
        } catch (err) {
          const msg = (err && err.message) ? err.message.toLowerCase() : '';
          const isIgnorable =
            msg.includes('already exists') ||
            msg.includes('duplicate key') ||
            msg.includes('duplicate object') ||
            msg.includes('extension') && msg.includes('already installed') ||
            msg.includes('function') && msg.includes('already exists') ||
            // Index on missing column: skip instead of failing
            (msg.includes('column') && msg.includes('does not exist') && stmt.toLowerCase().startsWith('create index'));

          if (isIgnorable) {
            console.warn(`Ignoring non-critical migration error in ${file}: ${err.message}`);
            continue;
          }
          throw err; // Critical error, abort
        }
      }

      // Record as applied
      await query('INSERT INTO __migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
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
