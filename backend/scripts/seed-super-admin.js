import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { query, closePool } from '../src/db.js';

dotenv.config();

async function ensureSuperAdmin() {
  const email = process.env.ADMIN_EMAIL || 'falkon@falkon.tech';
  const password = process.env.ADMIN_PASSWORD || 'ATSSystem2026';
  const username = (email.split('@')[0] || 'falkon').toLowerCase();
  const companyName = process.env.ADMIN_COMPANY || 'Falkon';

  try {
    const existing = await query(
      `SELECT id, is_approved FROM accounts WHERE email = $1`,
      [email.toLowerCase()]
    );

    const passwordHash = await bcrypt.hash(password, 10);

    if (existing.rows.length) {
      const id = existing.rows[0].id;
      await query(
        `UPDATE accounts
         SET password_hash = $1, role = 'admin', company_name = $2, username = $3,
             is_approved = true, approved_at = COALESCE(approved_at, NOW()), parent_account_id = NULL
         WHERE id = $4`,
        [passwordHash, companyName, username, id]
      );
      console.log(`✓ Super admin ensured: ${email}`);
    } else {
      const insert = await query(
        `INSERT INTO accounts (company_name, email, username, password_hash, role, is_approved, approved_at, parent_account_id)
         VALUES ($1, $2, $3, $4, 'admin', true, NOW(), NULL)
         RETURNING id`,
        [companyName, email.toLowerCase(), username, passwordHash]
      );
      console.log(`✓ Super admin created: ${email} (id: ${insert.rows[0].id})`);
    }
  } catch (err) {
    console.error('✗ Failed to ensure super admin:', err.message);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

ensureSuperAdmin();
