import dotenv from 'dotenv';
import { query, closePool } from './src/db.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

dotenv.config();

async function main() {
  try {
    const { rows: pending } = await query(`SELECT id, email FROM accounts WHERE is_approved = false LIMIT 1`);
    let accId, accEmail;
    if (pending.length) {
      accId = pending[0].id; accEmail = pending[0].email;
    } else {
      const email = `test_${Date.now()}@example.com`;
      const username = `user_${Date.now()}`;
      const company = `TestCo ${Date.now()}`;
      const hash = await bcrypt.hash('Password123', 10);
      const ins = await query(`INSERT INTO accounts (company_name, email, username, password_hash, role, is_approved) VALUES ($1,$2,$3,$4,'admin',false) RETURNING id, email`, [company, email, username, hash]);
      accId = ins.rows[0].id; accEmail = ins.rows[0].email;
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expires = new Date(Date.now() + 60*60*1000);
    await query(`INSERT INTO account_approval_tokens (account_id, token, email, expires_at) VALUES ($1,$2,$3,$4)`, [accId, token, process.env.ADMIN_EMAIL || accEmail, expires]);
    console.log('TEST_TOKEN', token);
  } catch (e) {
    console.error(e);
  } finally {
    await closePool();
  }
}

main();