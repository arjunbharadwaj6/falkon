import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db.js';
import { signToken, authRequired } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/email.js';

const router = express.Router();

const normalizeLoginResponse = (account) => ({
  id: account.id,
  companyName: account.companyName,
  email: account.email,
  username: account.username,
  role: account.role,
  parentAccountId: account.parentAccountId,
});

router.post('/signup', async (req, res, next) => {
  try {
    const { companyName, email, username, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    if (!companyName || !username) {
      return res.status(400).json({ error: 'company name and username are required' });
    }

    const existing = await query('SELECT id FROM accounts WHERE email = $1 OR username = $2', [email.toLowerCase(), username.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'account with this email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const insert = await query(
      `INSERT INTO accounts (company_name, email, username, password_hash, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, company_name AS "companyName", email, username, role, parent_account_id AS "parentAccountId", created_at`,
      [companyName, email.toLowerCase(), username.toLowerCase(), passwordHash]
    );

    const account = insert.rows[0];
    const token = signToken({ accountId: account.id, email: account.email, role: account.role, parentAccountId: account.parentAccountId });

    res.status(201).json({ token, account: normalizeLoginResponse(account) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { rows } = await query(
      `SELECT id, company_name AS "companyName", email, username, password_hash, role, parent_account_id AS "parentAccountId"
       FROM accounts WHERE email = $1`,
      [email.toLowerCase()]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const account = rows[0];
    const valid = await bcrypt.compare(password, account.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const token = signToken({ accountId: account.id, email: account.email, role: account.role, parentAccountId: account.parentAccountId });
    res.json({ token, account: normalizeLoginResponse(account) });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', authRequired, async (req, res, next) => {
  try {
    const { companyName, username } = req.body;
    const accountId = req.user.accountId;

    if (!username) {
      return res.status(400).json({ error: 'username is required' });
    }

    // Recruiters cannot change company name
    let nextCompanyName = companyName;
    if (req.user.role === 'recruiter') {
      const current = await query('SELECT company_name FROM accounts WHERE id = $1', [accountId]);
      if (!current.rows.length) {
        return res.status(404).json({ error: 'account not found' });
      }
      nextCompanyName = current.rows[0].company_name;
    } else if (!companyName) {
      return res.status(400).json({ error: 'company name is required' });
    }

    // Check if username is already taken by another account
    const existing = await query('SELECT id FROM accounts WHERE username = $1 AND id != $2', [username.toLowerCase(), accountId]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'username already taken' });
    }

    const update = await query(
      'UPDATE accounts SET company_name = $1, username = $2 WHERE id = $3 RETURNING id, company_name AS "companyName", email, username',
      [nextCompanyName, username.toLowerCase(), accountId]
    );

    if (!update.rows.length) {
      return res.status(404).json({ error: 'account not found' });
    }

    res.json({ account: { ...update.rows[0], role: req.user.role, parentAccountId: req.user.parentAccountId } });
  } catch (error) {
    next(error);
  }
});

router.put('/password', authRequired, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const accountId = req.user.accountId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'new password must be at least 8 characters' });
    }

    // Verify current password
    const { rows } = await query('SELECT password_hash FROM accounts WHERE id = $1', [accountId]);
    if (!rows.length) {
      return res.status(404).json({ error: 'account not found' });
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'current password is incorrect' });
    }

    // Update password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [newPasswordHash, accountId]);

    res.json({ message: 'password changed successfully' });
  } catch (error) {
    next(error);
  }
});

// Admin-only: list team members (recruiters and admins) created under this admin
router.get('/recruiters', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can list team members' });
    }

    const { rows } = await query(
      `SELECT id, company_name AS "companyName", email, username, role, parent_account_id AS "parentAccountId", created_at AS "createdAt"
       FROM accounts
       WHERE (role = 'recruiter' OR role = 'admin') AND parent_account_id = $1
       ORDER BY created_at DESC`,
      [req.user.accountId]
    );

    res.json({ recruiters: rows });
  } catch (error) {
    next(error);
  }
});

// Admin-only: create team members (recruiters or admins) under this admin
router.post('/recruiters', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create team members' });
    }

    const { email, username, password, role = 'recruiter' } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'email, username, and password are required' });
    }

    if (!['recruiter', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role must be recruiter or admin' });
    }

    const existing = await query('SELECT id FROM accounts WHERE email = $1 OR username = $2', [email.toLowerCase(), username.toLowerCase()]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'account with this email or username already exists' });
    }

    const adminAccount = await query('SELECT company_name FROM accounts WHERE id = $1', [req.user.accountId]);
    const companyName = adminAccount.rows[0]?.company_name || 'Team Member';

    const passwordHash = await bcrypt.hash(password, 10);
    const insert = await query(
      `INSERT INTO accounts (company_name, email, username, password_hash, role, parent_account_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, company_name AS "companyName", email, username, role, parent_account_id AS "parentAccountId", created_at` ,
      [companyName, email.toLowerCase(), username.toLowerCase(), passwordHash, role, req.user.accountId, req.user.accountId]
    );

    const account = insert.rows[0];
    res.status(201).json({ account: normalizeLoginResponse(account) });
  } catch (error) {
    next(error);
  }
});

// Admin-only: reset recruiter password
router.put('/recruiters/:id/password', authRequired, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can reset recruiter passwords' });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
    }

    // Ensure target is a recruiter under this admin
    const target = await query(
      'SELECT id FROM accounts WHERE id = $1 AND role = $2 AND parent_account_id = $3',
      [id, 'recruiter', req.user.accountId]
    );

    if (!target.rows.length) {
      return res.status(404).json({ error: 'recruiter not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [passwordHash, id]);

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
});

// Forgot password - generate and send reset token
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    // Check if account exists
    let rows;
    try {
      const result = await query(
        'SELECT id, email FROM accounts WHERE email = $1',
        [email.toLowerCase()]
      );
      rows = result.rows;
    } catch (dbError) {
      console.error('Database error in forgot-password:', dbError.message);
      // Return generic error for connection issues
      if (dbError.message.includes('timeout') || dbError.message.includes('Connection')) {
        return res.status(503).json({ error: 'Service temporarily unavailable. Please try again in a moment.' });
      }
      throw dbError;
    }

    if (!rows.length) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
    }

    const account = rows[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

    // Store token in database
    try {
      await query(
        `INSERT INTO password_reset_tokens (account_id, token, email, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [account.id, hashedToken, account.email, expiresAt]
      );
    } catch (dbError) {
      console.error('Database error storing reset token:', dbError.message);
      if (dbError.message.includes('timeout') || dbError.message.includes('Connection')) {
        return res.status(503).json({ error: 'Service temporarily unavailable. Please try again in a moment.' });
      }
      throw dbError;
    }

    // Send reset email
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(account.email)}`;

    try {
      await sendPasswordResetEmail(account.email, resetLink);
      console.log(`Password reset token generated for ${account.email}`);
    } catch (emailError) {
      console.error('Email sending error:', emailError.message);
      // Still return success to not reveal if email exists
      // In production, you might want to log this for monitoring
      // The token is already stored in DB, user won't be able to use it if email wasn't sent
      // But for now we'll just log and continue
    }

    res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
});

// Verify and reset password with token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'email, token, and newPassword are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
    }

    // Hash the provided token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Get the reset token record
    const { rows: tokenRows } = await query(
      `SELECT account_id, email, expires_at, used FROM password_reset_tokens
       WHERE token = $1 AND email = $2`,
      [hashedToken, email.toLowerCase()]
    );

    if (!tokenRows.length) {
      return res.status(401).json({ error: 'Invalid or expired reset token' });
    }

    const tokenRecord = tokenRows[0];

    // Check if token is already used
    if (tokenRecord.used) {
      return res.status(401).json({ error: 'This reset token has already been used' });
    }

    // Check if token is expired
    if (new Date() > new Date(tokenRecord.expires_at)) {
      return res.status(401).json({ error: 'Reset token has expired' });
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update account password
    await query(
      'UPDATE accounts SET password_hash = $1 WHERE id = $2',
      [passwordHash, tokenRecord.account_id]
    );

    // Mark token as used
    await query(
      'UPDATE password_reset_tokens SET used = true WHERE token = $1',
      [hashedToken]
    );

    res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
  } catch (error) {
    next(error);
  }
});

export default router;
